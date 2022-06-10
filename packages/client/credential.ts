export interface Credential {
  anonymous: boolean;
}

interface KeypairCredential extends Credential {
  apiKey: string;
  apiSecret: string;
}

interface TokenCredential extends Credential {
  token: string;
}

interface AnonymousCredential extends TokenCredential {
  anonymous: true;
}

export const unpackCredential = (maybeCred: Credential | null) => {
  if (maybeCred === null) {
    return {
      token: "anonymous-token",
      anonymous: true,
    } as AnonymousCredential;
  } else if (isAnonymousCredential(maybeCred)) {
    return maybeCred;
  } else if (isTokenCredential(maybeCred)) {
    return maybeCred;
  } else if (isKeypairCredential(maybeCred)) {
    return maybeCred;
  } else {
    throw Error("Unexpected credentialType");
  }
};

export const isAnonymousCredential = (
  cred: unknown
): cred is AnonymousCredential => {
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
