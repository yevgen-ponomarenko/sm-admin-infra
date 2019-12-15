import AWS = require("aws-sdk");
import AWSLambda = require("aws-lambda");
import * as fs from "fs";
import * as path from 'path';
import * as liquid from 'liquidjs';
const S3: AWS.S3 = new AWS.S3();

const bucketName: string|undefined = process.env.BUCKET;

class ResponseBase {    
    constructor(statusCode: number, body?: string, headers?: any, isBase64Encoded: boolean = false) {
        this.statusCode = statusCode;
        this.body = body;
        this.headers = headers;
        this.isBase64Encoded = isBase64Encoded;
    }
    public statusCode: number;
    public headers?: any;
    public body?: string;
    public isBase64Encoded: boolean;
}

export async function handler(
        event: AWSLambda.APIGatewayEvent,
        context: AWSLambda.APIGatewayEventRequestContext | undefined = undefined): Promise<ResponseBase> {
    console.info("EVENT\n" + JSON.stringify(event, null, 2))
    try {
        switch (event.httpMethod) {
            case "GET": {
              if (event.path === "/") {
                const data: AWS.S3.ListObjectsV2Output = await S3.listObjectsV2({ Bucket: bucketName ? bucketName : "" }).promise();
                const body: any = {
                    data: data.Contents ? data.Contents.map((obj) => obj.Key) : []
                };
                return new ResponseBase(200, JSON.stringify(body), { "Content-Type": "application/json" });                
              }
              if (event.path === "/review-results") {               

                const textBuff:Buffer = fs.readFileSync(path.join(__dirname, "article.html"));                

                const taxonomy = fs.readFileSync(path.join(__dirname, "taxonomy.json"), {
                    encoding: 'utf-8'
                });               
                
                const engine = new liquid.Liquid({
                    root: path.resolve(__dirname),
                    extname: '.liquid' 

                });
                const html = engine.renderFileSync('template', {
                    task: {
                        input: { text: textBuff.toString("base64") ,taxonomy }
                    }
                });        
                return new ResponseBase(200, html, { "Content-Type": "text/html" });  
             
              }
              
              return new ResponseBase(404, "Not Found");
            }        
            default: {
                return new ResponseBase(400);
            }
        }
    } catch (err) {
        return new ResponseBase(500);
    }
}

