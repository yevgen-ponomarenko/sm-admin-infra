import cdk = require("@aws-cdk/core");
import taxonomy_service = require("../lib/taxonomy_service");

export class AdminApiStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // tslint:disable-next-line: no-unused-expression
    new taxonomy_service.TaxonomyService(this, "Taxonomy");
  }
}
