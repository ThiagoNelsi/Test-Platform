export type GoogleTokenResponse = {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

export type GoogleProfile = {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string | null;
};

export type FetchLike = typeof fetch;

export function getGoogleCallbackUrl(backendUrl: string): string {
  return `${backendUrl.replace(/\/$/, '')}/auth/google/callback`;
}

export function buildGoogleAuthUrl(params: {
  clientId: string;
  backendUrl: string;
  state?: string;
}): string {
  const query = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: getGoogleCallbackUrl(params.backendUrl),
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  if (params.state) {
    query.set('state', params.state);
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`;
}

export async function exchangeCodeForTokens(
  fetchFn: FetchLike,
  params: {
    code: string;
    clientId: string;
    clientSecret: string;
    backendUrl: string;
  },
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code: params.code,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: getGoogleCallbackUrl(params.backendUrl),
    grant_type: 'authorization_code',
  });

  const response = await fetchFn('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${await response.text()}`);
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function getGoogleUser(fetchFn: FetchLike, accessToken: string): Promise<GoogleProfile> {
  const response = await fetchFn('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch userinfo: ${await response.text()}`);
  }

  return (await response.json()) as GoogleProfile;
}
