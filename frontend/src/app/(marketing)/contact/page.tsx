"use client";

import { useState } from "react";
import { CheckCircle2, Mail } from "lucide-react";
import { toast } from "sonner";

import { MarketingPageShell } from "@/components/marketing/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
    toast.success("Message received — we'll be in touch within 1 business day.");
  }

  if (submitted) {
    return (
      <MarketingPageShell
        title="Thank you"
        description="We've received your inquiry and will respond shortly."
      >
        <div className="mx-auto max-w-md text-center">
          <CheckCircle2 className="mx-auto size-12 text-emerald-400" />
          <p className="mt-4 text-muted-foreground">
            A member of our team will reach out to discuss your use case and schedule
            a demo if requested.
          </p>
        </div>
      </MarketingPageShell>
    );
  }

  return (
    <MarketingPageShell
      title="Contact & book a demo"
      description="Tell us about your use case. We'll help you evaluate the platform and plan your deployment."
    >
      <div className="mx-auto mb-8 flex max-w-2xl flex-col items-center gap-2 text-center">
        <p className="text-sm text-muted-foreground">
          Prefer email? Reach us directly at
        </p>
        <a
          href="mailto:info@nextcall.online"
          className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.08] px-4 py-1.5 text-sm font-medium text-primary shadow-[0_0_24px_-12px_hsl(var(--primary)/0.9)] transition-colors hover:bg-primary/[0.14]"
        >
          <Mail className="size-4" />
          info@nextcall.online
        </a>
      </div>

      <form
        onSubmit={onSubmit}
        className="mx-auto grid max-w-2xl gap-5 sm:grid-cols-2"
      >
        <div className="space-y-2 sm:col-span-2">
          <Label>Inquiry type</Label>
          <Select name="type" required defaultValue="demo">
            <option value="demo">Book a demo</option>
            <option value="sales">Sales inquiry</option>
            <option value="support">Support</option>
            <option value="enterprise">Enterprise pricing</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Full name</Label>
          <Input name="name" required placeholder="Jane Smith" />
        </div>
        <div className="space-y-2">
          <Label>Work email</Label>
          <Input name="email" type="email" required placeholder="you@company.com" />
        </div>
        <div className="space-y-2">
          <Label>Company</Label>
          <Input name="company" required placeholder="Acme Corp" />
        </div>
        <div className="space-y-2">
          <Label>Company size</Label>
          <Select name="size" required defaultValue="11-50">
            <option value="1-10">1–10</option>
            <option value="11-50">11–50</option>
            <option value="51-200">51–200</option>
            <option value="201+">201+</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Estimated monthly call volume</Label>
          <Select name="volume" defaultValue="1000-5000">
            <option value="<1000">&lt; 1,000 minutes</option>
            <option value="1000-5000">1,000 – 5,000</option>
            <option value="5000-20000">5,000 – 20,000</option>
            <option value="20000+">20,000+</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Preferred provider</Label>
          <Select name="provider" defaultValue="twilio">
            <option value="twilio">Twilio</option>
            <option value="telephonyx">TelephonyX</option>
            <option value="sip">SIP / Custom</option>
            <option value="undecided">Not sure yet</option>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Use case</Label>
          <Textarea
            name="usecase"
            required
            rows={4}
            placeholder="Describe what you're trying to automate with AI voice agents..."
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Spinner />} Submit inquiry
          </Button>
        </div>
      </form>
    </MarketingPageShell>
  );
}
