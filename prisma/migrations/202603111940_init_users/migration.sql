CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "display_name" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "is_admin" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
