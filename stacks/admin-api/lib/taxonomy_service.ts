import apigateway = require("@aws-cdk/aws-apigateway");
import lambda = require("@aws-cdk/aws-lambda");
import s3 = require("@aws-cdk/aws-s3");
import cognito = require("@aws-cdk/aws-cognito");
import { Construct, Aws } from "@aws-cdk/core";
import { CfnAuthorizer, AuthorizationType } from "@aws-cdk/aws-apigateway";
import { UserPool, UserPoolClient, AuthFlow, CfnUserPoolClient } from "@aws-cdk/aws-cognito";

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
    const userPoolClient: UserPoolClient = new UserPoolClient(this, "ModeratorsClient",
      {
        userPoolClientName: "spa",
        userPool: userPool,
        enabledAuthFlows: [AuthFlow.USER_PASSWORD],
        generateSecret: true
      });
    const cfnUserPoolClient: CfnUserPoolClient = userPoolClient.node.defaultChild as CfnUserPoolClient;
    cfnUserPoolClient.supportedIdentityProviders = ["COGNITO"];
    cfnUserPoolClient.callbackUrLs = [
      "https://localhost:4200/signin-callback.html",
      "https://localhost:4200/silent-renew.html"
    ];
    cfnUserPoolClient.allowedOAuthFlowsUserPoolClient = true;
    cfnUserPoolClient.allowedOAuthFlows = ["code"];
    cfnUserPoolClient.allowedOAuthScopes = ["openid"];

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
}