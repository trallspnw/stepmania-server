import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SetupFormProps {
  error?: string;
}

export function SetupForm({ error }: SetupFormProps) {
  return (
    <form action="/setup" className="space-y-5" method="post">
      {error ? (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
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

      <Button className="w-full" size="lg" type="submit">
        Create admin account
      </Button>
    </form>
  );
}
