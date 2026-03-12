-- DropForeignKey
ALTER TABLE "invites" DROP CONSTRAINT "invites_claimed_by_fkey";

-- DropForeignKey
ALTER TABLE "invites" DROP CONSTRAINT "invites_created_by_fkey";

-- DropForeignKey
ALTER TABLE "machine_tokens" DROP CONSTRAINT "machine_tokens_created_by_fkey";

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_claimed_by_fkey" FOREIGN KEY ("claimed_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_tokens" ADD CONSTRAINT "machine_tokens_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
