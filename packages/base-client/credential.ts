export interface BaseCredentialOptions {
  anonymous?: boolean;
}

export interface BaseCredential extends BaseCredentialOptions {
  anonymous: boolean;
}

interface KeypairCredential extends BaseCredential {
  apiKey: string;
  apiSecret: string;
  anonymous: false;
}

interface TokenCredential extends BaseCredential {
  token: string;
}
interface AuthenticatedTokenCredential extends TokenCredential {
  token: string;
  anonymous: false;
}

interface AnonymousTokenCredential extends TokenCredential {
  token: string;
  anonymous: true;
}

interface KeypairCredentialOptions
  extends BaseCredentialOptions,
    Omit<KeypairCredential, keyof BaseCredential> {}

interface AuthenticatedTokenCredentialOptions
  extends BaseCredentialOptions,
    Omit<AuthenticatedTokenCredential, keyof BaseCredential> {}

interface AnonymousTokenCredentialOptions
  extends BaseCredentialOptions,
    Omit<AnonymousTokenCredential, keyof BaseCredential> {}

// TODO: This is silly. A class with overloaded constructors would be better.

// NOTE: currently assumes that default is to return an anonymous credential,
// which doesn't match the runtime of only doing that when opts.defaultAnonymous
export type CredentialFromOptions<Opt extends BaseCredentialOptions> =
  Opt extends KeypairCredentialOptions
    ? KeypairCredential
    : Opt extends AnonymousTokenCredentialOptions
    ? AnonymousTokenCredential
    : Opt extends AuthenticatedTokenCredentialOptions
    ? AuthenticatedTokenCredential
    : AnonymousTokenCredential;

export type CredentialOptions =
  | KeypairCredentialOptions
  | AuthenticatedTokenCredentialOptions
  | AnonymousTokenCredentialOptions;

export const Credential = <
  InputCredentialOptions extends CredentialOptions,
  TargetCredential = CredentialFromOptions<InputCredentialOptions>
>(
  maybeCred: InputCredentialOptions | null,
  opts?: {
    defaultAnonymous?: boolean;
  }
): TargetCredential => {
  if (maybeCred === null) {
    return {
      token: "anonymous-token",
      anonymous: true,
    } as AnonymousTokenCredential as unknown as TargetCredential;
  } else if (isAnonymousTokenCredentialOptions(maybeCred)) {
    return maybeCred as AnonymousTokenCredential as unknown as TargetCredential;
  } else if (isAuthenticatedTokenCredentialOptions(maybeCred)) {
    return {
      ...maybeCred,
      anonymous: false,
    } as AuthenticatedTokenCredential as unknown as TargetCredential;
  } else if (isKeypairCredentialOptions(maybeCred)) {
    return {
      ...maybeCred,
      anonymous: false,
    } as KeypairCredential as unknown as TargetCredential;
  } else if (opts?.defaultAnonymous) {
    return {
      token: "defaultn-anonymous",
      anonymous: true,
    } as AnonymousTokenCredential as unknown as TargetCredential;
  } else {
    throw Error("Unexpected credentialType");
  }
};

// todo: move to somewhere non-http specific
export const makeAuthHeaders = (cred: BaseCredentialOptions): HeadersInit => {
  if (isTokenCredential(cred)) {
    return isAnonymousTokenCredential(cred)
      ? {}
      : {
          Authorization: `Bearer ${cred.token}`,
        };
  } else if (isKeypairCredential(cred)) {
    return {
      "X-API-Key": cred.apiKey,
      "X-API-Secret": cred.apiSecret,
    };
  } else {
    throw Error("Unexpected credential type not keypair nor token");
  }
};

export const makeAuthPgParams = (cred: BaseCredentialOptions) => {
  if (isTokenCredential(cred)) {
    return {
      username: cred.token,
      password: "ddn",
    };
  } else if (isKeypairCredential(cred)) {
    return {
      username: cred.apiKey,
      password: cred.apiSecret,
    };
  } else {
    throw Error("Unexpected credential type not keypair nor token");
  }
};

const isAnonymousTokenCredentialOptions = (
  cred: unknown
): cred is AnonymousTokenCredentialOptions => {
  return (cred as BaseCredentialOptions)?.["anonymous"] === true;
};

const isKeypairCredentialOptions = (
  cred: unknown
): cred is KeypairCredentialOptions => {
  return !!(cred as KeypairCredentialOptions)?.["apiKey"];
};

const isAuthenticatedTokenCredentialOptions = (
  cred: unknown
): cred is AuthenticatedTokenCredentialOptions => {
  return (
    !isAnonymousTokenCredentialOptions(cred) &&
    !!(cred as AuthenticatedTokenCredentialOptions)?.["token"]
  );
};

export const isTokenCredential = (cred: unknown): cred is TokenCredential => {
  return !!(cred as TokenCredential).token;
};

const isAnonymous = (cred: unknown): cred is AnonymousTokenCredential => {
  return (cred as BaseCredential).anonymous === true;
};

const isAuthenticated = (
  cred: unknown
): cred is AuthenticatedTokenCredential | KeypairCredential => {
  return (cred as BaseCredential).anonymous === false;
};

export const isAuthenticatedTokenCredential = (
  cred: unknown
): cred is AuthenticatedTokenCredential => {
  return isAuthenticated(cred) && isTokenCredential(cred);
};

export const isAnonymousTokenCredential = (
  cred: unknown
): cred is AnonymousTokenCredential => {
  return isTokenCredential(cred) && isAnonymous(cred);
};

export const isKeypairCredential = (
  cred: unknown
): cred is KeypairCredential => {
  return (
    !isAnonymous(cred) &&
    !!(cred as KeypairCredential).apiKey &&
    !!(cred as KeypairCredential).apiSecret
  );
};
