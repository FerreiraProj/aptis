"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Last-resort error boundary (errors in the root layout itself).
 * Reports to Sentry and shows a minimal, dependency-free fallback.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0b0b12",
          color: "#f4f4f5",
        }}
      >
        <div style={{ textAlign: "center", padding: 16 }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Algo correu mal / Something went wrong</h1>
          <p style={{ opacity: 0.7, marginBottom: 16 }}>
            {error.digest ? `Ref: ${error.digest}` : null}
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #3f3f46",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            Tentar novamente / Try again
          </button>
        </div>
      </body>
    </html>
  );
}
