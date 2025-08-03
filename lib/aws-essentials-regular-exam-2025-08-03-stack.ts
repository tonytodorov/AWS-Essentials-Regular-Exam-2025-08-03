import * as cdk from 'aws-cdk-lib';
import {Stack} from 'aws-cdk-lib';
import {LambdaIntegration, RestApi} from 'aws-cdk-lib/aws-apigateway';
import {AttributeType, BillingMode, StreamViewType, Table} from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import {Subscription, SubscriptionProtocol, Topic} from 'aws-cdk-lib/aws-sns';
import {Construct} from 'constructs';
import path from "node:path";
import {Runtime } from "aws-cdk-lib/aws-lambda";

export class AwsEssentialsRegularExam20250803Stack extends Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new Table(this, 'ExamTable', {
      partitionKey: {
        name: 'PK',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      timeToLiveAttribute: 'ttl'
    });

    const topic = new Topic(this, 'SisiTopic');

    const subscription = new Subscription(this, 'SisiSubscription', {
      protocol: SubscriptionProtocol.EMAIL,
      endpoint: 'ttodorov11@abv.bg',
      topic: topic
    });

    const deleteObjectLambdaFunction = new NodejsFunction(this, 'DeleteObjectLambdaFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '/../src/deleteObjectHandler.ts'),
      handler: 'handler',
      environment: {
        TOPIC_ARN: topic.topicArn
      }
    });

    const addObjectLambdaFunction = new NodejsFunction(this, 'AddObjectLambdaFunction', {
      handler: 'handler',
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '/../src/addObjectHandler.ts'),
      environment: {
        TABLE_NAME: table.tableName,
        TOPIC_ARN: topic.topicArn
      }
    });

    table.grantWriteData(addObjectLambdaFunction);
    topic.grantPublish(addObjectLambdaFunction);
    topic.grantPublish(deleteObjectLambdaFunction);

    const api = new RestApi(this, "SisiApi");
    const resource = api.root.addResource('submit');
    resource.addMethod('POST', new LambdaIntegration(addObjectLambdaFunction, {
      proxy: true
    }));
  }
}
