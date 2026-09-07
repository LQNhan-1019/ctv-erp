export type AuthUser = {
  userId: string;
  username: string;
  roles: string[];
  permissions: string[];
};

export type AccessTokenResponse = {
  tokenType: 'Bearer';
  accessToken: string;
  expiresIn: number;
  issuedAt: string;
  expiresAt: string;
  roles: string[];
  permissions: string[];
};

export type LoginInput = { username: string; password: string };
