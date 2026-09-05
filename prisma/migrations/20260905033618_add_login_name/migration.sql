-- Add login_name / login_name_normalized as nullable first so existing rows
-- (real accounts, not just local dev) can be backfilled before the NOT NULL
-- and uniqueness constraints are enforced.
ALTER TABLE "users" ADD COLUMN "login_name" TEXT;
ALTER TABLE "users" ADD COLUMN "login_name_normalized" TEXT;

-- Every existing account's login name defaults to its current display name;
-- users and admins can change either afterward.
UPDATE "users" SET "login_name" = "display_name", "login_name_normalized" = "display_name_normalized";

ALTER TABLE "users" ALTER COLUMN "login_name" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "login_name_normalized" SET NOT NULL;

CREATE UNIQUE INDEX "users_login_name_normalized_key" ON "users"("login_name_normalized");
