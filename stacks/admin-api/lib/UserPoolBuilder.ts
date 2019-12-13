import { Construct, Aws } from "@aws-cdk/core";
import { UserPool, CfnUserPoolUser, CfnUserPoolDomain, UserPoolClient, AuthFlow, CfnUserPoolClient } from "@aws-cdk/aws-cognito";

export interface IUserPoolUser {
    userName: string;
    email: string;
}
export class UserPoolBuilder {
  _userPoolResourceId: string;
  _userPoolName: string | undefined;
  _userPoolClientName: string | undefined;
  _userPoolClientResourceId: string | undefined;
  _userPoolDomainResourceId: string | undefined;
  _userPoolDomainName: string;
  _userPoolClientEnabledAuthFlows: AuthFlow[];
  _userPoolClientCallbackUrLs: string[];
  _users: IUserPoolUser[] = [];

  public WithName(resourceId: string, name: string): UserPoolBuilder {
    this._userPoolResourceId = resourceId;
    this._userPoolName = name;
    return this;
  }

  public WithUser(name: string, email: string): UserPoolBuilder {
    this._users.push({userName:name, email: email});
    return this;
  }

  public WithClient(
      resourceId: string,
      name: string,
      enabledAuthFlows: AuthFlow[],
      callbackUrLs: string[]): UserPoolBuilder {
    this._userPoolClientResourceId = resourceId;
    this._userPoolClientName = name;
    this._userPoolClientEnabledAuthFlows = enabledAuthFlows;
    this._userPoolClientCallbackUrLs = callbackUrLs;
    return this;
  }

  public WithDomain(resourceId: string, domain: string): UserPoolBuilder {
    this._userPoolDomainResourceId = resourceId;
    this._userPoolDomainName = domain;
    return this;
  }

  public Build(scope: Construct): UserPool | undefined {
      if (!!!this._userPoolResourceId) {
          return undefined;
      }
    const userPool: UserPool = new UserPool (
        scope,
        this._userPoolResourceId,
        { userPoolName: this._userPoolName }
    );

    if (!!this._userPoolClientResourceId) {
      const userPoolClient: UserPoolClient = new UserPoolClient(
          scope,
          this._userPoolClientResourceId,
          {
            userPool: userPool,
            userPoolClientName: this._userPoolClientName,
            enabledAuthFlows: this._userPoolClientEnabledAuthFlows,
            generateSecret: false
           });
      const cfnUserPoolClient: CfnUserPoolClient = userPoolClient.node.defaultChild as CfnUserPoolClient;
      cfnUserPoolClient.supportedIdentityProviders = ["COGNITO"];
      cfnUserPoolClient.callbackUrLs = this._userPoolClientCallbackUrLs;
    }

    if (!!this._userPoolDomainResourceId) {
        const userPoolDomain: CfnUserPoolDomain = new CfnUserPoolDomain(
            scope,
            this._userPoolDomainResourceId,
            {
                userPoolId: userPool.userPoolId,
                domain: this._userPoolDomainName
            });
    }

    if (this._users.length) {
        for (let index: number = 0; index < this._users.length; index++) {
            var user: IUserPoolUser = this._users[index];
            this.addUser(scope, userPool.userPoolId, user.userName, user.email);
        }
    }

    return userPool;
  }

  private addUser(scope: Construct, userPoolId: string, userName: string, email: string): CfnUserPoolUser {
    return new CfnUserPoolUser(scope, `userName`, {
      userPoolId: userPoolId,
      username: userName,
      userAttributes: [{ name: "email", value: email }]
    });
  }
}
