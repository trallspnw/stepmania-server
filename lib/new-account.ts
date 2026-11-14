/**
 * Shared rules for creating a password account: reading and validating the
 * sign-up fields, and turning a duplicate-name database error into an error code.
 */
import { getTakenIdentityField } from "@/lib/users";

const MINIMUM_PASSWORD_LENGTH = 8;

export type NewAccountFields = {
  loginName: string;
  displayName: string;
  password: string;
};

export type NewAccountFieldsResult =
  | { ok: true; fields: NewAccountFields }
  | { ok: false; error: "missing_fields" | "password_too_short" | "password_mismatch" };

export function readNewAccountFields(body: unknown): NewAccountFieldsResult {
  const values = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const loginName = String(values.loginName ?? "").trim();
  const displayName = String(values.displayName ?? "").trim();
  const password = String(values.password ?? "");
  const confirmPassword = String(values.confirmPassword ?? "");

  if (!loginName || !displayName || !password || !confirmPassword) {
    return { ok: false, error: "missing_fields" };
  }

  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    return { ok: false, error: "password_too_short" };
  }

  if (password !== confirmPassword) {
    return { ok: false, error: "password_mismatch" };
  }

  return { ok: true, fields: { loginName, displayName, password } };
}

export function getNameTakenError(error: unknown) {
  switch (getTakenIdentityField(error)) {
    case "login":
      return "login_name_taken";
    case "display":
      return "display_name_taken";
    default:
      return null;
  }
}
