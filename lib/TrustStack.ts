import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";

export class TrustStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // -- Parameters you will need to provide at deploy time. --
    // This stack is parameterized so that you can use it without modification.
    // You can use the AWS CDK CLI to deploy this stack with the following command:
    // cdk deploy --parameters GitHubOrg=<your-org> --parameters GitHubRepo=<your-repo>
    const githubOrg = new cdk.CfnParameter(this, "GitHubOrg", {
      type: "String",
      description: "The GitHub organization that owns the repository.",
    });
    const githubRepo = new cdk.CfnParameter(this, "GitHubRepo", {
      type: "String",
      description: "The GitHub repository that will run the action.",
    });

    // -- Defines an OpenID Connect (OIDC) provider for GitHub Actions. --
    // This provider will be used by the GitHub Actions workflow to assume a role
    // which can be used to deploy the CDK application.
    const githubProvider = new iam.CfnOIDCProvider(this, "GitHubOIDCProvider", {
      thumbprintList: ["6938fd4d98bab03faadb97b34396831e3780aea1"], // See below
      url: "https://token.actions.githubusercontent.com", // You will only be able to create one OIDC provider with this URL.
      clientIdList: ["sts.amazonaws.com"], // This value tells AWS the token is intended for STS.
    });
    // See: https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services#adding-the-identity-provider-to-aws
    // Thumbprint from: https://github.blog/changelog/2022-01-13-github-actions-update-on-oidc-based-deployments-to-aws/
    //    ^--- This value can be calculated, but it won't change regularly.
    //         You can also retrieve by providing starting the provider creation process in the AWS Console
    //         and using the "Get thumbprint" button after selecting OpenID Connect as the type and inputting
    //         the provider URL.

    // -- Defines a role that can be assumed by GitHub Actions. --
    // This role will be used by the GitHub Actions workflow to deploy the stack.
    // It is assumable only by GitHub Actions running against the `main` branch
    const githubActionsRole = new iam.Role(this, "GitHubActionsRole", {
      assumedBy: new iam.FederatedPrincipal(
        githubProvider.attrArn,
        {
          StringLike: {
            // This specifies that the subscriber (sub) claim must be the main
            // branch of your repository. You can use wildcards here, but
            // you should be careful about what you allow.
            "token.actions.githubusercontent.com:sub": [
              `repo:${githubOrg.valueAsString}/${githubRepo.valueAsString}:ref:refs/heads/main`,
            ],
          },
          // This specifies that the audience (aud) claim must be sts.amazonaws.com
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          },
        },
        "sts:AssumeRoleWithWebIdentity" // <-- Permits assuming roles with an OIDC identity
      ),
    });

    // -- A policy to permit assumption of the default AWS CDK roles created by its bootstrap process. --
    // Allows assuming roles tagged with an aws-cdk:bootstrap-role tag of certain
    // values (file-publishing, lookup, deploy) which permit the CDK application to
    // look up existing values, publish assets, and create CloudFormation changesets.
    const assumeCdkDeploymentRoles = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["sts:AssumeRole"],
      resources: ["arn:aws:iam::*:role/cdk-*"],
      conditions: {
        StringEquals: {
          "aws:ResourceTag/aws-cdk:bootstrap-role": [
            "file-publishing",
            "lookup",
            "deploy",
          ],
        },
      },
    });

    // Add the policy statement to the GitHub Actions role so it can actually assume
    // the CDK deployment roles it will require.
    githubActionsRole.addToPolicy(assumeCdkDeploymentRoles);

    new cdk.CfnOutput(this, "GitHubActionsRoleArn", {
      value: githubActionsRole.roleArn,
      description:
        "The ARN for role that should be assumed by the GitHub Action which deploys your application.",
    });
  }
}
