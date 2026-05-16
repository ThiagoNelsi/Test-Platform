import type { CookieOptions } from 'express';
import { buildGoogleAuthUrl, exchangeCodeForTokens, getGoogleUser, type FetchLike } from './oauth';
import { signSessionToken, verifySessionToken } from './jwt';

export type BackendUser = {
  id: number;
  name: string;
  email: string;
  image: string | null;
  googleSub?: string | null;
};

export type AuthUserRecord = {
  id: number;
  name: string;
  email: string;
  image: string | null;
  googleSub?: string | null;
};

export type AuthPrisma = {
  user: {
    findUnique(args: { where: { id?: number; email?: string } }): Promise<AuthUserRecord | null>;
    create(args: {
      data: {
        email: string;
        name: string;
        image: string | null;
        googleSub?: string | null;
        password: string;
      };
    }): Promise<AuthUserRecord>;
    update(args: {
      where: { id: number };
      data: Partial<Pick<AuthUserRecord, 'name' | 'image' | 'googleSub'>>;
    }): Promise<AuthUserRecord>;
  };
};

export type AuthServiceDeps = {
  prisma: AuthPrisma;
  fetchFn: FetchLike;
  jwtSecret: string;
  googleClientId: string;
  googleClientSecret: string;
  backendUrl: string;
  frontendUrl: string;
  isProduction: boolean;
};

const SESSION_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function toPublicUser(user: AuthUserRecord): BackendUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    googleSub: user.googleSub,
  };
}

async function upsertGoogleUser(prisma: AuthPrisma, profile: { email?: string; name?: string; picture?: string | null; sub?: string }): Promise<AuthUserRecord> {
  if (!profile.email) {
    throw new Error('No email in Google profile');
  }

  const existingUser = await prisma.user.findUnique({ where: { email: profile.email } });

  if (!existingUser) {
    return prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name || 'Sem nome',
        image: profile.picture || null,
        googleSub: profile.sub || null,
        password: 'oauth',
      },
    });
  }

  const updateData: Partial<Pick<AuthUserRecord, 'name' | 'image' | 'googleSub'>> = {};

  if (profile.name && existingUser.name !== profile.name) {
    updateData.name = profile.name;
  }

  if (existingUser.image !== (profile.picture || null)) {
    updateData.image = profile.picture || null;
  }

  if (profile.sub && existingUser.googleSub !== profile.sub) {
    updateData.googleSub = profile.sub;
  }

  if (Object.keys(updateData).length > 0) {
    return prisma.user.update({ where: { id: existingUser.id }, data: updateData });
  }

  return existingUser;
}

export function buildSessionCookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: SESSION_COOKIE_MAX_AGE,
  };
}

export function buildLogoutCookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    expires: new Date(0),
  };
}

export function createAuthService(deps: AuthServiceDeps) {
  return {
    startGoogleAuth(state?: string): string {
      return buildGoogleAuthUrl({
        clientId: deps.googleClientId,
        backendUrl: deps.backendUrl,
        state,
      });
    },

    async handleGoogleCallback(code: string): Promise<{ user: BackendUser; sessionToken: string; redirectTo: string }> {
      const tokens = await exchangeCodeForTokens(deps.fetchFn, {
        code,
        clientId: deps.googleClientId,
        clientSecret: deps.googleClientSecret,
        backendUrl: deps.backendUrl,
      });

      const profile = await getGoogleUser(deps.fetchFn, tokens.access_token);
      const user = await upsertGoogleUser(deps.prisma, profile);
      const sessionToken = signSessionToken({ userId: user.id }, deps.jwtSecret);

      return {
        user: toPublicUser(user),
        sessionToken,
        redirectTo: deps.frontendUrl,
      };
    },

    async getCurrentUser(token?: string): Promise<BackendUser | null> {
      const payload = verifySessionToken(token, deps.jwtSecret);

      if (!payload) {
        return null;
      }

      const user = await deps.prisma.user.findUnique({ where: { id: payload.userId } });

      return user ? toPublicUser(user) : null;
    },

    buildLogoutCookieOptions(): CookieOptions {
      return buildLogoutCookieOptions(deps.isProduction);
    },

    buildSessionCookieOptions(): CookieOptions {
      return buildSessionCookieOptions(deps.isProduction);
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
