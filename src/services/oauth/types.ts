export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scopes: string[];
  subscriptionType: SubscriptionType | null;
  rateLimitTier: RateLimitTier | null;
  profile?: OAuthProfileResponse;
  tokenAccount?: {
    uuid: string;
    emailAddress: string;
    organizationUuid?: string;
  };
}

export type SubscriptionType = 'free' | 'pro' | 'enterprise' | 'max' | 'team';
export type RateLimitTier = 'tier1' | 'tier2' | 'tier3';
export interface OAuthProfileResponse {
  [key: string]: any;
}
export interface OAuthTokenExchangeResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  account?: {
    uuid: string;
    email_address: string;
  };
  organization?: {
    uuid: string;
  };
}
