"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SetupFormProps {
  error?: string;
}

export function SetupForm({ error }: SetupFormProps) {
  const [formError, setFormError] = useState(error);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setFormError(undefined);

        const formData = new FormData(event.currentTarget);
        const displayName = String(formData.get("displayName") ?? "").trim();
        const password = String(formData.get("password") ?? "");
        const confirmPassword = String(formData.get("confirmPassword") ?? "");

        const response = await fetch("/api/setup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            displayName,
            password,
            confirmPassword,
          }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };

          switch (data.error) {
            case "display_name_taken":
              setFormError("That display name is already taken.");
              break;
            case "password_mismatch":
              setFormError("Password and confirmation must match.");
              break;
            case "missing_fields":
              setFormError("Display name and password are required.");
              break;
            case "password_too_short":
              setFormError("Password must be at least 8 characters.");
              break;
            default:
              setFormError("Setup failed.");
          }

          setIsSubmitting(false);
          return;
        }

        const data = (await response.json()) as { redirectTo: string };
        const result = await signIn("credentials", {
          displayName,
          password,
          redirect: false,
          callbackUrl: data.redirectTo,
        });

        if (!result || result.error) {
          setFormError("Account created, but automatic sign-in failed.");
          setIsSubmitting(false);
          return;
        }

        window.location.href = result.url ?? data.redirectTo;
      }}
    >
      {formError ? (
        <Alert>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          autoComplete="username"
          id="displayName"
          name="displayName"
          placeholder="Arcade Admin"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          autoComplete="new-password"
          id="password"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          autoComplete="new-password"
          id="confirmPassword"
          minLength={8}
          name="confirmPassword"
          required
          type="password"
        />
      </div>

      <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
        {isSubmitting ? "Creating account..." : "Create admin account"}
      </Button>
    </form>
  );
}
