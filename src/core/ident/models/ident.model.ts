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
  displayName?: string;
  credibility: number;
  karma: number;
  trusted: boolean;
  lastActiveAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IdentProfile {
  identity: string;
  displayName?: string;
  karma: number;
  trusted: boolean;
}
