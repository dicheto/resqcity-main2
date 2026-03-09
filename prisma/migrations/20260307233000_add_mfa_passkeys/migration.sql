-- Add TOTP support on users
ALTER TABLE "users"
ADD COLUMN "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "totpSecret" TEXT;

-- Enum for challenge types
CREATE TYPE "AuthChallengeKind" AS ENUM (
  'LOGIN_MFA',
  'TOTP_ENROLL',
  'PASSKEY_REGISTRATION',
  'PASSKEY_AUTHENTICATION'
);

-- Passkey credentials for WebAuthn authenticators
CREATE TABLE "passkey_credentials" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "webauthnUserId" TEXT NOT NULL,
  "credentialId" TEXT NOT NULL,
  "publicKey" TEXT NOT NULL,
  "counter" INTEGER NOT NULL DEFAULT 0,
  "transports" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "deviceType" TEXT,
  "backedUp" BOOLEAN,
  "name" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "passkey_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "passkey_credentials_credentialId_key" ON "passkey_credentials"("credentialId");
CREATE INDEX "passkey_credentials_userId_idx" ON "passkey_credentials"("userId");

ALTER TABLE "passkey_credentials"
ADD CONSTRAINT "passkey_credentials_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Temporary auth flow state (MFA setup/login)
CREATE TABLE "auth_challenges" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" "AuthChallengeKind" NOT NULL,
  "challenge" TEXT,
  "metadata" JSONB,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "auth_challenges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "auth_challenges_userId_kind_idx" ON "auth_challenges"("userId", "kind");
CREATE INDEX "auth_challenges_expiresAt_idx" ON "auth_challenges"("expiresAt");

ALTER TABLE "auth_challenges"
ADD CONSTRAINT "auth_challenges_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
