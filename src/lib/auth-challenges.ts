import { AuthChallengeKind } from '@prisma/client';
import { prisma } from '@/hooks/lib/prisma';

type JsonLike = Record<string, unknown>;

export async function createAuthChallenge(params: {
  userId: string;
  kind: AuthChallengeKind;
  challenge?: string;
  metadata?: JsonLike;
  expiresInSeconds?: number;
}) {
  const expiresInSeconds = params.expiresInSeconds ?? 300;

  return prisma.authChallenge.create({
    data: {
      userId: params.userId,
      kind: params.kind,
      challenge: params.challenge,
      metadata: params.metadata as any,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    },
  });
}

export async function getValidAuthChallenge(id: string, kind?: AuthChallengeKind) {
  const challenge = await prisma.authChallenge.findUnique({
    where: { id },
  });

  if (!challenge) {
    return null;
  }

  if (kind && challenge.kind !== kind) {
    return null;
  }

  if (challenge.consumedAt || challenge.expiresAt.getTime() < Date.now()) {
    return null;
  }

  return challenge;
}

export async function consumeAuthChallenge(id: string) {
  return prisma.authChallenge.update({
    where: { id },
    data: {
      consumedAt: new Date(),
    },
  });
}
