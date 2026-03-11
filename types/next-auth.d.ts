import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      displayName: string;
      isAdmin: boolean;
    };
  }

  interface User {
    id: string;
    displayName: string;
    isAdmin: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    displayName: string;
    isAdmin: boolean;
  }
}
