import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { ensureDB } from "./db";

const app = new Hono();

app.use("*", cors());

// Initialize database on startup
let dbInitialized = false;
app.use(async (c, next) => {
  if (!dbInitialized) {
    try {
      await ensureDB();
      dbInitialized = true;
      console.log("[Hono] Database initialized successfully on first request");
    } catch (err) {
      console.error("[Hono] Failed to initialize database:", err);
      return c.json({ error: "Database initialization failed" }, 500);
    }
  }
  await next();
});

app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  }),
);

app.get("/", (c) => {
  return c.json({ status: "ok", message: "RPI Live API is running" });
});

export default app;
