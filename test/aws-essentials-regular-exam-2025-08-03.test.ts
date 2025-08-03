import {App} from "aws-cdk-lib";
import {AwsEssentialsRegularExam20250803Stack} from "../lib/aws-essentials-regular-exam-2025-08-03-stack";
import {Template} from "aws-cdk-lib/assertions";

test('Stack Synth Matches Snapshot', () => {

    const app = new App();
    const stack = new AwsEssentialsRegularExam20250803Stack(app, 'MyTestStack');
    const template = Template.fromStack(stack);

    expect(template).toMatchSnapshot();
});
