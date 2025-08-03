import {PublishCommand, SNSClient} from "@aws-sdk/client-sns";
import {APIGatewayProxyEvent, APIGatewayProxyHandler} from "aws-lambda";
import {DynamoDBClient, PutItemCommand} from "@aws-sdk/client-dynamodb";

const ddb = new DynamoDBClient();
const sns = new SNSClient();

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
    console.log(JSON.stringify(event));

    const tableName = process.env.TABLE_NAME!;
    const topicArn = process.env.TOPIC_ARN!;

    let body;

    try {
        body = JSON.parse(event.body || '{}');
    } catch {
        return {
            statusCode: 400,
            body: 'Invalid JSON'
        };
    }

    const isValid = body?.valid === true;
    const hasValue = 'value' in body;

    if (typeof body.valid !== 'boolean' || !hasValue) {
        console.error('Malformed JSON received');

        return {
            statusCode: 400,
            body: 'Invalid JSON schema'
        };
    }

    if (isValid) {
        await sns.send(new PublishCommand({
            Subject: 'Valid JSON received',
            Message: JSON.stringify(body),
            TopicArn: topicArn
        }));

        return {
            statusCode: 200,
            body: 'Valid JSON processed and emailed'
        };
    }

    const timestamp = Date.now();
    const ttl = Math.floor(timestamp / 1000 + 24 * 60 * 60);

    await ddb.send(new PutItemCommand({
        TableName: tableName,
        Item: {
            PK: {
                S: `invalid#${timestamp}`
            },
            SK: {
                S: `event#${timestamp}`
            },
            body: {
                S: JSON.stringify(body)
            },
            createdAt: {
                N: String(timestamp)
            },
            ttl: {
                N: String(ttl)
            }
        }
    }));

    console.log(`Invalid JSON stored. TTL set to: ${ttl}`);

    return {
        statusCode: 202,
        body: 'Invalid JSON stored in DynamoDB and will be deleted after 24 hours'
    };
};