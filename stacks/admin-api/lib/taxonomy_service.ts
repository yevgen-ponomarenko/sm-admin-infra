import apigateway = require("@aws-cdk/aws-apigateway");
import lambda = require("@aws-cdk/aws-lambda");
import s3 = require("@aws-cdk/aws-s3");
import { Construct, Aws } from "@aws-cdk/core";
import { CfnAuthorizer, AuthorizationType } from "@aws-cdk/aws-apigateway";
import { UserPool, CfnUserPoolUser, CfnUserPoolDomain, UserPoolClient, AuthFlow, CfnUserPoolClient } from "@aws-cdk/aws-cognito";

export class TaxonomyService extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const bucket: s3.Bucket = new s3.Bucket(this, "Taxonomy", {});

    const handler: lambda.Function = new lambda.Function(this, "Handler", {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.fromAsset("lambdas"),
      handler: "taxonomy.handler",
      environment: {
        BUCKET: bucket.bucketName
      }
    });

    bucket.grantReadWrite(handler);

    const userPool: UserPool = new UserPool(this, "Moderators", {});    
    this.addUser(userPool.userPoolId, "yevgen-ponomarenko", "yevgen.ponomarenko@gmail.com");

    const userPoolClient: UserPoolClient = new UserPoolClient(this, "ModeratorsClient",
      {
        userPoolClientName: "LocalDev",
        userPool: userPool,
        enabledAuthFlows: [AuthFlow.USER_PASSWORD],
        generateSecret: false
      });

    const userPoolDomain: CfnUserPoolDomain = new CfnUserPoolDomain(this, "ModeratorsClientDomain", {
      userPoolId: userPool.userPoolId,
      domain: "staging-yevgen-ponomarenko"
    });

    const cfnUserPoolClient: CfnUserPoolClient = userPoolClient.node.defaultChild as CfnUserPoolClient;
    cfnUserPoolClient.supportedIdentityProviders = ["COGNITO"];
    cfnUserPoolClient.callbackUrLs = [
      "http://localhost:4200/signin-callback.html",
      "http://localhost:4200/silent-renew.html"
    ];
    cfnUserPoolClient.allowedOAuthFlowsUserPoolClient = true;
    cfnUserPoolClient.allowedOAuthFlows = ["code"];
    cfnUserPoolClient.allowedOAuthScopes = ["phone", "email", "openid", "aws.cognito.signin.user.admin", "profile"];

    const api: apigateway.RestApi = new apigateway.RestApi(this, "Api", {
      restApiName: "Taxonomy Service",
      description: "This service serves taxonomy."
    });

    const region: string = Aws.REGION;
    const account: string = Aws.ACCOUNT_ID;
    const cognitoArn: string = `arn:aws:cognito-idp:${region}:${account}:userpool/${userPool.userPoolId}`;

    const auth: CfnAuthorizer = new CfnAuthorizer(this, "APIGatewayAuthorizer", {
      name: "customer-authorizer",
      identitySource: "method.request.header.Authorization",
      providerArns: [cognitoArn],
      restApiId: api.restApiId,
      type: AuthorizationType.COGNITO
    });

    const getTaxonomyIntegration: apigateway.LambdaIntegration = new apigateway.LambdaIntegration(handler, {
      requestTemplates: { "application/json": "{ \"statusCode\": \"200\" }" }
    });

    const taxonomyResource:apigateway.Resource = api.root.addResource("taxonomy");

    // method GET
    taxonomyResource.addMethod("GET", getTaxonomyIntegration, {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: { authorizerId: auth.ref }
    });
  }

  private addUser(userPoolId: string, userName: string, email: string): CfnUserPoolUser {
    return new CfnUserPoolUser(this, `userName`, {
      userPoolId: userPoolId,
      username: userName,
      userAttributes: [{ name: "email", value: email }]
    });
  }
}