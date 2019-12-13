import AWS = require("aws-sdk");
import AWSLambda = require("aws-lambda");
const S3: AWS.S3 = new AWS.S3();

const bucketName: string|undefined = process.env.BUCKET;

export interface IKeyPair<T> {
    [key: string]: T;
}

export class ResponseBase {
    constructor(statusCode: number, body?: string, headers?: IKeyPair<string>[]) {
        this.statusCode = statusCode;
        this.body = body;
        this.headers = headers;
    }
    statusCode: number;
    headers?: IKeyPair<string>[];
    body?: string;
}

export async function handler(
        event: AWSLambda.APIGatewayEvent,
        context: AWSLambda.APIGatewayEventRequestContext): Promise<ResponseBase> {
    try {
        switch (event.httpMethod) {
            case "GET": {
                if (event.path === "/") {
                    const data:AWS.S3.ListObjectsV2Output = await S3.listObjectsV2({ Bucket: bucketName ? bucketName : ""}).promise();

                    var body:any = {
                        data: data.Contents ? data.Contents.map((obj) => obj.Key) : {}
                    };

                    return new ResponseBase(200, JSON.stringify(body),  [{ ContentType: "application/json" }]);
                }
            }
            default: {
                return new ResponseBase(400);
            }
        }
    } catch (err) {
        return new ResponseBase(500);
    }
}