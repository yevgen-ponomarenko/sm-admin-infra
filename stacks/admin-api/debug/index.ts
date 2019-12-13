import review = require("../lambdas/review");
import * as fs from "fs";
import * as path from 'path';
import { APIGatewayProxyEvent } from "aws-lambda";

const event: string = fs.readFileSync(path.join(__dirname, "review_event.json"), { encoding: 'utf-8' });
review.handler( JSON.parse(event) as APIGatewayProxyEvent).then(res => {
    console.info("RESPONSE\n" + JSON.stringify(res, null, 2))
    fs.writeFileSync("./rendered.html", res.body,  { encoding: 'utf-8' })
});

