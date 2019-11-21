import AWS = require("aws-sdk");
import AWSLambda = require("aws-lambda");
const S3 = new AWS.S3();

const bucketName = process.env.BUCKET;

export interface Dictionary<T> {
    [key: string]: T;
}

export class ResponseBase {
    constructor(statusCode: number, body?: string, headers?: Map<string, string>) {
        this.statusCode = statusCode;
        this.body = body;
        this.headers = headers;
    }
    statusCode: number;
    headers?: Map<string, string>;
    body?: string
}

export async function handler(event: AWSLambda.APIGatewayEvent, context: AWSLambda.APIGatewayEventRequestContext): Promise<ResponseBase> {
    try {            
        switch (event.httpMethod) {
            case "GET": {
                if (event.path === "/") {
                    
                    const data = await S3.listObjectsV2({ Bucket: bucketName ? bucketName : ""}).promise();

                    var body = {
                        data: data.Contents ? data.Contents.map((obj) => obj.Key) : {}
                    };

                    let headers = new Map();
                    headers.set("ContentType", "application/json");

                    return new ResponseBase(200, JSON.stringify(body), headers);
                }
            }
            default: {
                return new ResponseBase(400);
            }
        }
    }
    catch (err) {
        return new ResponseBase(500);
    }
}