import apigateway = require("@aws-cdk/aws-apigateway");
import lambda = require("@aws-cdk/aws-lambda");
import s3 = require("@aws-cdk/aws-s3");
import { Construct, Aws } from "@aws-cdk/core";
import { CfnAuthorizer, AuthorizationType } from "@aws-cdk/aws-apigateway";
import { UserPool, CfnUserPoolUser, CfnUserPoolDomain, UserPoolClient, AuthFlow, CfnUserPoolClient } from "@aws-cdk/aws-cognito";

export class ReviewService extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const bucket: s3.Bucket = new s3.Bucket(this, "Review", {});

    const handler: lambda.Function = new lambda.Function(this, "Handler", {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.fromAsset("lambdas"),
      handler: "review.handler",
      environment: {
        BUCKET: bucket.bucketName
      }
    });

    bucket.grantReadWrite(handler);

    const userPool: UserPool = new UserPool(this, "Reviewers", {
      userPoolName: "Reviewers"
    });

    this.addUser(userPool.userPoolId, "yevgen-ponomarenko", "yevgen.ponomarenko@gmail.com");   

    const userPoolDomain: CfnUserPoolDomain = new CfnUserPoolDomain(this, "ReviewClientDomain", {
      userPoolId: userPool.userPoolId,
      domain: "staging-yevgen-ponomarenko"
    });

    const userPoolClient: UserPoolClient = new UserPoolClient(this, "ReviewClient",
      {
        userPool: userPool,
        userPoolClientName: "Reviewers",
        enabledAuthFlows: [AuthFlow.USER_PASSWORD],
        generateSecret: false
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

    const api: apigateway.RestApi = new apigateway.RestApi(this, "ReviewApi", {
      restApiName: "Review Service",
      description: "This service serves annotations review process."
    });

    const region: string = Aws.REGION;
    const account: string = Aws.ACCOUNT_ID;
    const cognitoArn: string = `arn:aws:cognito-idp:${region}:${account}:userpool/${userPool.userPoolId}`;

    const auth: CfnAuthorizer = new CfnAuthorizer(this, "ReviewAPIGatewayAuthorizer", {
      name: "customer-authorizer",
      identitySource: "method.request.header.Authorization",
      providerArns: [cognitoArn],
      restApiId: api.restApiId,
      type: AuthorizationType.COGNITO
    });

    const getReviewIntegration: apigateway.LambdaIntegration = new apigateway.LambdaIntegration(handler, {
      requestTemplates: { "application/json": "{ \"statusCode\": \"200\" }" }
    });

    const authOptions: apigateway.MethodOptions = {
      authorizationType: auth.type as apigateway.AuthorizationType,
      authorizer: { authorizerId: auth.ref }
    };

    this.addResource(api.root, "review-results", "GET", getReviewIntegration, authOptions);
  }

  private addUser(userPoolId: string, userName: string, email: string): CfnUserPoolUser {
    return new CfnUserPoolUser(this, `userName`, {
      userPoolId: userPoolId,
      username: userName,
      userAttributes: [{ name: "email", value: email }]
    });
  }

  private addResource(
    parentResource: apigateway.IResource,
    subResourceName: string,
    subResourceMethod: string,
    lambdaIntegration: apigateway.LambdaIntegration,
    opts: apigateway.MethodOptions): apigateway.IResource {
      const subResource:apigateway.Resource = parentResource.addResource(subResourceName);
      subResource.addMethod(subResourceMethod, lambdaIntegration, opts);
      return subResource;
  }
}