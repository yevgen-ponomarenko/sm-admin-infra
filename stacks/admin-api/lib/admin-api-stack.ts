import cdk = require("@aws-cdk/core");
import review_service = require("../lib/review_service");

export class AdminApiStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // tslint:disable-next-line: no-unused-expression
    new review_service.ReviewService(this, "Labeling");
  }
}
