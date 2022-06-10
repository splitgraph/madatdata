export interface Credential extends CredentialOptions {
  anonymous: boolean;
}

interface KeypairCredential extends Credential {
  apiKey: string;
  apiSecret: string;
  anonymous: false;
}

interface TokenCredential extends Credential {
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

interface CredentialOptions {
  anonymous?: boolean;
}

interface KeypairCredentialOptions
  extends CredentialOptions,
    Omit<KeypairCredential, keyof Credential> {}

interface AuthenticatedTokenCredentialOptions
  extends CredentialOptions,
    Omit<AuthenticatedTokenCredential, keyof Credential> {}

interface AnonymousTokenCredentialOptions
  extends CredentialOptions,
    Omit<AnonymousTokenCredential, keyof Credential> {}

type CredentialFromOptions<Opt extends CredentialOptions> =
  Opt extends KeypairCredentialOptions
    ? KeypairCredential
    : Opt extends AnonymousTokenCredentialOptions
    ? AnonymousTokenCredential
    : Opt extends AuthenticatedTokenCredentialOptions
    ? AuthenticatedTokenCredential
    : AnonymousTokenCredential;

export const Credential = <
  InputCredentialOptions extends
    | KeypairCredentialOptions
    | AuthenticatedTokenCredentialOptions
    | AnonymousTokenCredentialOptions,
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
    } as unknown as TargetCredential;
  } else if (isAnonymousTokenCredentialOptions(maybeCred)) {
    return maybeCred as unknown as TargetCredential;
  } else if (isAuthenticatedTokenCredentialOptions(maybeCred)) {
    return {
      ...maybeCred,
      anonymous: false,
    } as unknown as TargetCredential;
  } else if (isKeypairCredentialOptions(maybeCred)) {
    return {
      ...maybeCred,
      anonymous: false,
    } as unknown as TargetCredential;
  } else if (opts?.defaultAnonymous) {
    return {
      token: "defaultn-anonymous",
      anonymous: true,
    } as unknown as TargetCredential;
  } else {
    throw Error("Unexpected credentialType");
  }
};

export const makeAuthHeaders = (cred: CredentialOptions) => {
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
  return (cred as CredentialOptions)?.["anonymous"] === true;
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
