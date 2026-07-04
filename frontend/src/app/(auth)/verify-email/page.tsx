"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FullPageSpinner } from "@/components/ui/spinner";

function VerifyInner() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }
    api
      .post("/auth/verify-email", { token }, { auth: false })
      .then(() => setState("ok"))
      .catch(() => setState("error"));
  }, [token]);

  if (state === "loading") return <FullPageSpinner />;

  return (
    <div className="text-center">
      {state === "ok" ? (
        <>
          <CheckCircle2 className="mx-auto size-12 text-emerald-400" />
          <h1 className="mt-4 text-2xl font-semibold">Email verified</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is now fully active.
          </p>
        </>
      ) : (
        <>
          <XCircle className="mx-auto size-12 text-destructive" />
          <h1 className="mt-4 text-2xl font-semibold">Verification failed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This link is invalid or has expired.
          </p>
        </>
      )}
      <Link href="/dashboard">
        <Button className="mt-6">Go to dashboard</Button>
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <VerifyInner />
    </Suspense>
  );
}
