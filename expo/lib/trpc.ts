import { createTRPCClient, httpLink } from "@trpc/client";
import superjson from "superjson";

import type { AppRouter } from "@/backend/trpc/app-router";

const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL?.trim();
const apiUrl = baseUrl ? `${baseUrl}/api/trpc` : "http://127.0.0.1:1/api/trpc";

if (!baseUrl) {
  console.warn("EXPO_PUBLIC_RORK_API_BASE_URL is not set. Using offline static data fallback.");
}

export const api = createTRPCClient<AppRouter>({
  links: [
    httpLink({
      url: apiUrl,
      transformer: superjson,
    }),
  ],
});
