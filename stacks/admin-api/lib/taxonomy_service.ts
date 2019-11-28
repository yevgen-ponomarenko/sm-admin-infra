import apigateway = require("@aws-cdk/aws-apigateway");
import lambda = require("@aws-cdk/aws-lambda");
import s3 = require("@aws-cdk/aws-s3");
import cognito = require("@aws-cdk/aws-cognito");
import { Construct, Aws, RemovalPolicy} from '@aws-cdk/core';
import { CfnAuthorizer, AuthorizationType } from "@aws-cdk/aws-apigateway";
import { UserPool, UserPoolClient, AuthFlow, CfnUserPoolClient } from "@aws-cdk/aws-cognito";

export class TaxonomyService extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const bucket = new s3.Bucket(this, "Taxonomy", {});

    const handler = new lambda.Function(this, "Handler", {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.fromAsset("lambdas"),
      handler: "taxonomy.handler",
      environment: {
        BUCKET: bucket.bucketName
      }
    });

    bucket.grantReadWrite(handler); // was: handler.role);    

    const userPool = new UserPool(this, "Moderators", {});
    const userPoolClient = new UserPoolClient(this, 'ModeratorsClient',
      {
        userPoolClientName: 'spa',
        userPool: userPool,
        enabledAuthFlows: [AuthFlow.USER_PASSWORD],
        generateSecret: true
      });
    const cfnUserPoolClient = userPoolClient.node.defaultChild as CfnUserPoolClient;
    cfnUserPoolClient.supportedIdentityProviders = ['COGNITO'];
    cfnUserPoolClient.callbackUrLs = ['https://localhost:4200/signin-callback.html', 'https://localhost:4200/silent-renew.html'];
    cfnUserPoolClient.allowedOAuthFlowsUserPoolClient = true;
    cfnUserPoolClient.allowedOAuthFlows = ['code'];
    cfnUserPoolClient.allowedOAuthScopes = ['openid'];
    
    const api = new apigateway.RestApi(this, "Api", {
      restApiName: "Taxonomy Service",
      description: "This service serves taxonomy."
    });       

    const region = Aws.REGION;
    const account = Aws.ACCOUNT_ID;
    const cognitoArn = `arn:aws:cognito-idp:${region}:${account}:userpool/${userPool.userPoolId}`;

    const auth = new CfnAuthorizer(this, 'APIGatewayAuthorizer', {
      name: 'customer-authorizer',
      identitySource: 'method.request.header.Authorization',
      providerArns: [cognitoArn],
      restApiId: api.restApiId,
      type: AuthorizationType.COGNITO
    });

    const getTaxonomyIntegration = new apigateway.LambdaIntegration(handler, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' }
    });

    const taxonomyResource = api.root.addResource('taxonomy');
    taxonomyResource.addMethod("GET", getTaxonomyIntegration, {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: { authorizerId: auth.ref }
    }); // GET /    
  }
}