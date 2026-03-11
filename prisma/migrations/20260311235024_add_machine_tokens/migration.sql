-- DropIndex
DROP INDEX "invites_claimed_at_idx";

-- DropIndex
DROP INDEX "invites_expires_at_idx";

-- CreateTable
CREATE TABLE "machine_tokens" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen" TIMESTAMPTZ(6),

    CONSTRAINT "machine_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "machine_tokens_token_key" ON "machine_tokens"("token");

-- AddForeignKey
ALTER TABLE "machine_tokens" ADD CONSTRAINT "machine_tokens_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
