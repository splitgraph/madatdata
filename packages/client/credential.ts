export interface Credential {
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
  anonymous: false;
}
interface AnonymousTokenCredential extends TokenCredential {
  anonymous: true;
}

type UnconstrainedCredentialOptions<TargetCredential extends Credential> = Omit<
  TargetCredential,
  "anonymous"
>;

// Ensure that {} is not a valid option
type CredentialOptions<TargetCredential extends Credential> =
  UnconstrainedCredentialOptions<TargetCredential> extends never
    ? never
    : UnconstrainedCredentialOptions<TargetCredential>;

export const Credential = (
  maybeCred:
    | CredentialOptions<KeypairCredential>
    | CredentialOptions<AuthenticatedTokenCredential>
    | CredentialOptions<AnonymousTokenCredential>
    | null,
  opts?: {
    defaultAnonymous?: boolean;
  }
) => {
  if (isAnonymousTokenCredential(maybeCred)) {
    return maybeCred as AnonymousTokenCredential;
  } else if (isTokenCredential(maybeCred)) {
    return { ...maybeCred, anonymous: false } as AuthenticatedTokenCredential;
  } else if (isKeypairCredential(maybeCred)) {
    return { ...maybeCred, anonymous: false } as KeypairCredential;
  } else if (maybeCred === null || opts?.defaultAnonymous) {
    return {
      token: "anonymous-token",
      anonymous: true,
    } as AnonymousTokenCredential;
  } else {
    throw Error("Unexpected credentialType");
  }
};

export const makeAuthHeaders = (cred: Credential) => {
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

export const isAnonymousTokenCredential = (
  cred: unknown
): cred is AnonymousTokenCredential => {
  return (cred as Credential)?.["anonymous"] === true;
};

export const isKeypairCredential = (
  cred: unknown
): cred is KeypairCredential => {
  return !!(cred as KeypairCredential)?.["apiKey"];
};

export const isTokenCredential = (cred: unknown): cred is TokenCredential => {
  return !!(cred as TokenCredential)?.["token"];
};
