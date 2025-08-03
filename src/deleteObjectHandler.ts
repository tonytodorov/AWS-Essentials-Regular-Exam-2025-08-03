import { SNS } from "@aws-sdk/client-sns";
import { DynamoDBClient, DeleteItemCommand } from "@aws-sdk/client-dynamodb";

const sns = new SNS();
const ddb = new DynamoDBClient();

export const handler = async (event: any) => {
    console.log(JSON.stringify(event));

    const { PK, SK, createdAt, body } = event;
    const topicArn = process.env.TOPIC_ARN!;
    const tableName = process.env.TABLE_NAME!;

    await ddb.send(new DeleteItemCommand({
        TableName: tableName,
        Key: {
            PK: {
                S: PK
            },
            SK: {
                S: SK
            }
        }
    }));

    const duration = Math.floor((Date.now() - createdAt) / 1000);

    await sns.publish({
        TopicArn: topicArn,
        Subject: "Deleted Invalid JSON after 24h",
        Message: `Item stayed in the table for ${duration} seconds.\n\nDetails:\n${JSON.stringify(body)}`
    });
};
