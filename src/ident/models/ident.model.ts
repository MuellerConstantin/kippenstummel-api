export interface IdentToken {
  identity: string;
  token: string;
}

export interface IdentSecret {
  identity: string;
  secret: string;
}

export interface EncryptedIdentSecret {
  identity: string;
  encryptedSecret: string;
}

export interface IdentInfo {
  identity: string;
  credibility: number;
  createdAt?: Date;
  updatedAt?: Date;
}
