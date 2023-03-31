import * as cdk from "aws-cdk-lib"
import { Construct } from "constructs"
import * as lambda from "aws-cdk-lib/aws-lambda"

export class LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const myFunction = new lambda.Function(this, "Lambda", {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromInline(`def handler(event, context): return "Hello again, world!"`),
      handler: "index.handler"
    })

    // WARNING: This function can be invoked without authentication.
    //          It can't do anything much, but you should still tear
    //          it down when you're done.
    const myFunctionUrl = myFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE
    })

    new cdk.CfnOutput(this, "FunctionUrl", {
      value: myFunctionUrl.url,
      description: "Use this URL to invoke your Lambda function without authentication."
    });

  }
}