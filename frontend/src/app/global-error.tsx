"use client";

import { useEffect } from "react";

// global-error replaces the root layout when a render error escapes it, so it
// must render its own <html>/<body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>
          Something went wrong
        </h1>
        <p style={{ color: "#64748b", maxWidth: "28rem" }}>
          The application hit an unexpected error. Please try reloading.
        </p>
        <button
          onClick={reset}
          style={{
            padding: "0.6rem 1.25rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "#0891b2",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
