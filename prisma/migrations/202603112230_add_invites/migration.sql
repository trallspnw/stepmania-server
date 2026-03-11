CREATE TABLE "invites" (
  "id" TEXT NOT NULL,
  "created_by" INTEGER NOT NULL,
  "claimed_by" INTEGER,
  "role_is_admin" BOOLEAN NOT NULL DEFAULT false,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "claimed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "invites"
ADD CONSTRAINT "invites_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "invites"
ADD CONSTRAINT "invites_claimed_by_fkey"
FOREIGN KEY ("claimed_by") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "invites_expires_at_idx" ON "invites"("expires_at");
CREATE INDEX "invites_claimed_at_idx" ON "invites"("claimed_at");
