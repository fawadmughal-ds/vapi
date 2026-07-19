"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CheckCircle2, MailCheck, XCircle } from "lucide-react";
import { toast } from "sonner";

import { OtpInput } from "@/components/auth/otp-input";
import { Button } from "@/components/ui/button";
import { FullPageSpinner, Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const RESEND_SECONDS = 45;

/** Legacy flow: verify via ?token= link. */
function LinkVerify({ token }: { token: string }) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
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
          <CheckCircle2 className="mx-auto size-12 text-success" />
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

/** Primary flow: enter the 6-digit OTP sent to the user's email. */
function OtpVerify({ email }: { email: string }) {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function submit(value: string) {
    if (value.length !== 6 || verifying) return;
    setVerifying(true);
    try {
      await api.post("/auth/verify-otp", { email, code: value }, { auth: false });
      setVerified(true);
      toast.success("Email verified successfully");
      await refreshUser();
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid or expired code");
      setCode("");
    } finally {
      setVerifying(false);
    }
  }

  async function resend() {
    if (resendIn > 0) return;
    try {
      await api.post("/auth/resend-otp", { email }, { auth: false });
      toast.success("A new code is on its way");
      setResendIn(RESEND_SECONDS);
    } catch {
      toast.error("Could not resend code. Try again shortly.");
    }
  }

  if (verified) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-12 text-success" />
        <h1 className="mt-4 text-2xl font-semibold">Email verified</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Taking you to your workspace…
        </p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-transparent ring-1 ring-primary/20">
        <MailCheck className="size-7 text-primary" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Verify your email</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We sent a 6-digit code to{" "}
        {email ? <span className="font-medium text-foreground">{email}</span> : "your email"}.
        Enter it below to activate your workspace.
      </p>

      <div className="mt-8">
        <OtpInput
          value={code}
          onChange={setCode}
          onComplete={submit}
          disabled={verifying}
        />
      </div>

      <Button
        className="mt-8 w-full"
        disabled={code.length !== 6 || verifying}
        onClick={() => submit(code)}
      >
        {verifying && <Spinner />} Verify email
      </Button>

      <p className="mt-6 text-sm text-muted-foreground">
        Didn&apos;t get the code?{" "}
        {resendIn > 0 ? (
          <span>Resend in {resendIn}s</span>
        ) : (
          <button
            type="button"
            onClick={resend}
            className="font-medium text-primary hover:underline"
          >
            Resend code
          </button>
        )}
      </p>
      <p className="mt-3 text-xs text-muted-foreground/70">
        <Link href="/dashboard" className="hover:text-foreground">
          Skip for now
        </Link>
      </p>
    </div>
  );
}

function VerifyInner() {
  const params = useSearchParams();
  const { user } = useAuth();
  const token = params.get("token") || "";
  const email = useMemo(
    () => params.get("email") || user?.email || "",
    [params, user]
  );

  if (token) return <LinkVerify token={token} />;
  return <OtpVerify email={email} />;
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <VerifyInner />
    </Suspense>
  );
}
