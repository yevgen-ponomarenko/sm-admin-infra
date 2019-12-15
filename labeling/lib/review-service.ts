import apigateway = require("@aws-cdk/aws-apigateway");
import lambda = require("@aws-cdk/aws-lambda");
import s3 = require("@aws-cdk/aws-s3");
import { Construct, Aws } from "@aws-cdk/core";
import { CfnAuthorizer, AuthorizationType, ContentHandling } from "@aws-cdk/aws-apigateway";
import { UserPool, AuthFlow } from "@aws-cdk/aws-cognito";
import { UserPoolBuilder } from '../utils/user-pool-builder';

export class ReviewService extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Review lambda handler
    const bucket: s3.Bucket = new s3.Bucket(this, "Review", {});    
    const handler: lambda.Function = new lambda.Function(this, "Handler", {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.fromAsset("lambdas/review", {
        exclude: ["*.ts", "package*.json", "debug"],
      }),
      handler: "app.handler",
      environment: {
        BUCKET: bucket.bucketName
      }
    });
    bucket.grantReadWrite(handler);

    // Cognito user pool and client
    const userPool: UserPool|undefined = new UserPoolBuilder()
      .WithName("Reviewers", "Reviewers")
      .WithClient(
          "ReviewClient",
          "Reviewers", 
          [AuthFlow.USER_PASSWORD],
          ["http://localhost:4200/signin-callback.html","http://localhost:4200/silent-renew.html"]        
        )
      .WithDomain("ReviewClientDomain", "staging-yevgen-ponomarenko")
      .WithUser("yevgen-ponomarenko", "yevgen.ponomarenko@gmail.com")
      .Build(this);

    // API Gateway integration
    const api: apigateway.RestApi = new apigateway.RestApi(this, "ReviewApi", {
      restApiName: "Review Service",
      description: "This service serves annotations review process."
    });    
    const getRootIntegration: apigateway.LambdaIntegration = new apigateway.LambdaIntegration(handler, {
      requestTemplates: { "application/json": "{ \"statusCode\": \"200\" }" }
    });

    const authOptions: apigateway.MethodOptions = this.describeMethodOptionsWithAuthentication(userPool, api);    

    api.root.addMethod("GET", getRootIntegration, authOptions);   
    this.addApiResource(api.root, "review-results", "GET", getRootIntegration, authOptions);
  }

  // TODO: explore other method options
  private describeMethodOptionsWithAuthentication(userPool: UserPool | undefined, api: apigateway.RestApi): apigateway.MethodOptions {
    const skipAuthContext = this.node.tryGetContext('skipAuth');
    const skipAuthentication = !!skipAuthContext && JSON.parse(skipAuthContext);
    if (skipAuthentication || !userPool) {
      return {};
    }

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
    const authOptions: apigateway.MethodOptions = {
      authorizationType: auth.type as apigateway.AuthorizationType,
      authorizer: { authorizerId: auth.ref }
    };
    return authOptions;
  }

  private addApiResource(
    parentResource: apigateway.IResource,
    pathPart: string,
    subResourceMethod: string,
    lambdaIntegration: apigateway.LambdaIntegration,
    opts: apigateway.MethodOptions): apigateway.IResource {
      const subResource:apigateway.Resource = parentResource.addResource(pathPart);
      subResource.addMethod(subResourceMethod, lambdaIntegration, opts);      
      return subResource;
  }
}