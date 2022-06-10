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

export const makeAuthHeaders = (cred: BaseCredentialOptions): HeadersInit => {
  if (isTokenCredential(cred)) {
    return {
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

export const isTokenCredential = (
  cred: unknown
): cred is AuthenticatedTokenCredential | AnonymousTokenCredential => {
  return !!(cred as AuthenticatedTokenCredential).token;
};
export const isAuthenticatedTokenCredential = (
  cred: unknown
): cred is AuthenticatedTokenCredential => {
  return (
    (cred as AuthenticatedTokenCredential).anonymous === false &&
    !!(cred as AuthenticatedTokenCredential).token
  );
};

export const isAnonymousTokenCredential = (
  cred: unknown
): cred is AnonymousTokenCredential => {
  return (
    (cred as AnonymousTokenCredential).anonymous === true &&
    !!(cred as AnonymousTokenCredential).token
  );
};

export const isKeypairCredential = (
  cred: unknown
): cred is KeypairCredential => {
  return (
    (cred as KeypairCredential).anonymous === false &&
    !!(cred as KeypairCredential).apiKey &&
    !!(cred as KeypairCredential).apiSecret
  );
};
