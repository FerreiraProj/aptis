/**
 * Server-side Sentry initialisation (Node.js + Edge runtimes).
 * Disabled automatically when no DSN is configured (e.g. local dev).
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

export async function register() {
  if (!dsn) return;

  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      // Performance tracing: sample a fraction in production to control cost
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      sendDefaultPii: false,
    });
  }
}

// Reports errors thrown in Server Components, route handlers and server actions.
export const onRequestError = Sentry.captureRequestError;
