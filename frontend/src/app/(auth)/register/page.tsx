"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth";
import { useMarketing } from "@/lib/marketing/store";
import { cn, formatCurrency } from "@/lib/utils";

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { visiblePlans, getPlanPrice } = useMarketing();
  const initialPlan = searchParams.get("plan") || "trial";
  const selectablePlans = visiblePlans.filter(
    (p) => !p.isEnterprise && p.planId !== "enterprise"
  );

  const [selectedPlan, setSelectedPlan] = useState(initialPlan);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    company_name: "",
  });
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await register(form);
      toast.success("Workspace created! We sent a 6-digit code to your email.");
      router.push(`/verify-email?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Create your workspace
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Start your free trial — isolated workspace with full platform access
      </p>

      {/* Plan selection from admin pricing data */}
      <div className="mt-6 space-y-2">
        <Label>Choose a plan</Label>
        <div className="grid gap-2">
          {selectablePlans.map((plan) => (
            <button
              key={plan.planId}
              type="button"
              onClick={() => setSelectedPlan(plan.planId)}
              className={cn(
                "flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-all",
                selectedPlan === plan.planId
                  ? "border-primary bg-primary/5"
                  : "border-border/60 hover:border-border"
              )}
            >
              <div>
                <p className="font-medium">{plan.planName}</p>
                <p className="text-xs text-muted-foreground">
                  {plan.trialEnabled
                    ? `${plan.trialDays}-day trial`
                    : plan.description.slice(0, 50)}
                </p>
              </div>
              <div className="text-right">
                {plan.monthlyPrice === 0 ? (
                  <span className="font-semibold text-success">Free</span>
                ) : (
                  <span className="font-semibold">
                    {formatCurrency(getPlanPrice(plan, "monthly"))}
                    <span className="text-xs font-normal text-muted-foreground">
                      /mo
                    </span>
                  </span>
                )}
                {selectedPlan === plan.planId && (
                  <Check className="ml-auto mt-1 size-4 text-primary" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={form.name} onChange={update("name")} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Company / workspace name</Label>
          <Input
            id="company"
            value={form.company_name}
            onChange={update("company_name")}
            placeholder="Acme Corp"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={update("email")}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={form.password}
            onChange={update("password")}
            required
          />
        </div>
        <p className="text-xs text-muted-foreground">
          By creating an account you agree to our Terms of Service and Privacy Policy.
        </p>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Spinner />} Create workspace & start trial
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <RegisterForm />
    </Suspense>
  );
}
