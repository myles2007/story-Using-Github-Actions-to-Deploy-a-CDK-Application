#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { TrustStack } from "../lib/TrustStack";
import { LambdaStack } from "../lib/LambdaStack";

const app = new cdk.App();

new TrustStack(app, "TrustStack", {});
new LambdaStack(app, "LambdaStack", {});
