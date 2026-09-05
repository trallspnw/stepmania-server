"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginFormProps {
  error?: string;
}

export function LoginForm({ error: initialError }: LoginFormProps) {
  const [error, setError] = useState(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError(undefined);

        const formData = new FormData(event.currentTarget);
        const loginName = String(formData.get("loginName") ?? "");
        const password = String(formData.get("password") ?? "");

        const result = await signIn("credentials", {
          loginName,
          password,
          redirect: false,
          callbackUrl: "/dashboard",
        });

        if (!result || result.error) {
          setError("Invalid credentials or inactive account.");
          setIsSubmitting(false);
          return;
        }

        window.location.href = result.url ?? "/dashboard";
      }}
    >
      {error ? (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="loginName">Login name</Label>
        <Input
          autoComplete="username"
          id="loginName"
          name="loginName"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          autoComplete="current-password"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>

      <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
        {isSubmitting ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
