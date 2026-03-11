ALTER TABLE "users"
ADD COLUMN "display_name_normalized" TEXT;

UPDATE "users"
SET "display_name_normalized" = lower(trim("display_name"));

ALTER TABLE "users"
ALTER COLUMN "display_name_normalized" SET NOT NULL;

ALTER TABLE "users"
DROP CONSTRAINT "users_display_name_key";

ALTER TABLE "users"
ADD CONSTRAINT "users_display_name_normalized_key" UNIQUE ("display_name_normalized");
