"use client";

import { createAuthClient } from "better-auth/client";
import { twoFactorClient } from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";

// No baseURL: the client uses the current origin.
export const authClient = createAuthClient({
  plugins: [twoFactorClient({ twoFactorPage: "/two-factor" }), passkeyClient()],
});
