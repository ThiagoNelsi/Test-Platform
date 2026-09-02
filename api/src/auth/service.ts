import type { CookieOptions } from 'express';
import type { PrismaClient } from '@prisma/client';
import { buildGoogleAuthUrl, exchangeCodeForTokens, getGoogleUser, type FetchLike } from './oauth';
import { signSessionToken, verifySessionToken } from './jwt';

export type BackendUser = {
  id: number;
  name: string;
  email: string;
  image: string | null;
  googleSub: string | null;
};

export type AuthUserRecord = {
  id: number;
  name: string;
  email: string;
  image: string | null;
  googleSub: string | null;
};

export type AuthPrisma = Pick<PrismaClient, 'user'>;

export type AuthServiceDeps = {
  prisma: AuthPrisma;
  fetchFn: FetchLike;
  jwtSecret: string;
  googleClientId: string;
  googleClientSecret: string;
  backendUrl: string;
  frontendUrl: string;
  isProduction: boolean;
  cookieSameSite?: CookieOptions['sameSite'];
  cookieDomain?: string;
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

  const userSelect = {
    id: true,
    name: true,
    email: true,
    image: true,
    googleSub: true,
  } as const;

  const existingUser = await prisma.user.findUnique({
    where: { email: profile.email },
    select: userSelect,
  });

  if (!existingUser) {
    return prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name || 'Sem nome',
        image: profile.picture || null,
        googleSub: profile.sub || null,
        password: 'oauth',
      },
      select: userSelect,
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
    return prisma.user.update({ where: { id: existingUser.id }, data: updateData, select: userSelect });
  }

  return existingUser;
}

type CookieConfig = {
  sameSite?: CookieOptions['sameSite'];
  domain?: string;
};

function normalizeSameSite(sameSite?: CookieOptions['sameSite']): CookieOptions['sameSite'] {
  if (sameSite === 'none' || sameSite === 'lax' || sameSite === 'strict' || sameSite === true || sameSite === false) {
    return sameSite;
  }

  return 'lax';
}

export function buildSessionCookieOptions(isProduction: boolean, config: CookieConfig = {}): CookieOptions {
  const sameSite = normalizeSameSite(config.sameSite);
  return {
    httpOnly: true,
    secure: isProduction || sameSite === 'none',
    sameSite,
    ...(config.domain ? { domain: config.domain } : {}),
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE,
  };
}

export function buildLogoutCookieOptions(isProduction: boolean, config: CookieConfig = {}): CookieOptions {
  const sameSite = normalizeSameSite(config.sameSite);
  return {
    httpOnly: true,
    secure: isProduction || sameSite === 'none',
    sameSite,
    ...(config.domain ? { domain: config.domain } : {}),
    path: '/',
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

      const user = await deps.prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          googleSub: true,
        },
      });

      return user ? toPublicUser(user) : null;
    },

    buildLogoutCookieOptions(): CookieOptions {
      return buildLogoutCookieOptions(deps.isProduction, {
        sameSite: deps.cookieSameSite,
        domain: deps.cookieDomain,
      });
    },

    buildSessionCookieOptions(): CookieOptions {
      return buildSessionCookieOptions(deps.isProduction, {
        sameSite: deps.cookieSameSite,
        domain: deps.cookieDomain,
      });
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
