-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_child" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "password_hash" DROP NOT NULL,
ALTER COLUMN "login_name" DROP NOT NULL,
ALTER COLUMN "login_name_normalized" DROP NOT NULL;
