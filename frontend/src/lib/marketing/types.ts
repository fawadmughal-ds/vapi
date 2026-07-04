/** Marketing & pricing types — structured for future backend API replacement. */

export type BillingInterval = "monthly" | "yearly";
export type PlanTierId = "trial" | "starter" | "growth" | "scale" | "enterprise";

export interface PlanLimits {
  callMinutes: number;
  aiAgents: number;
  phoneNumbers: number;
  campaigns: number;
  teamMembers: number;
  providerConnections: number;
}

export interface OverageRate {
  label: string;
  unit: string;
  pricePerUnit: number;
}

export interface PlanAddOn {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  unit?: string;
}

export interface PricingPlan {
  planId: PlanTierId;
  planName: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  isPopular: boolean;
  isVisible: boolean;
  isEnterprise: boolean;
  trialEnabled: boolean;
  trialDays: number;
  features: string[];
  limits: PlanLimits;
  overageRates: OverageRate[];
  addOns: PlanAddOn[];
  ctaLabel: string;
  ctaUrl: string;
  sortOrder: number;
  /** Maps to backend PlanTier when subscribing */
  backendTier?: "starter" | "growth" | "pro";
}

export interface PricingConfig {
  currency: string;
  yearlyDiscountPercent: number;
  publishedAt: string | null;
  draft: boolean;
  plans: PricingPlan[];
}

export interface HeroContent {
  badge: string;
  headline: string;
  subheadline: string;
  primaryCta: string;
  primaryCtaUrl: string;
  secondaryCta: string;
  secondaryCtaUrl: string;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  company: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface UseCase {
  id: string;
  title: string;
  industry: string;
  problem: string;
  solution: string;
  workflow: string[];
  outcome: string;
}

export interface IntegrationItem {
  id: string;
  name: string;
  category: string;
  description: string;
  status: "available" | "beta" | "coming_soon";
}

export interface ResourceArticle {
  id: string;
  title: string;
  excerpt: string;
  category: "guide" | "case-study" | "update" | "best-practice";
  date: string;
  readTime: string;
}

export interface WebsiteContent {
  hero: HeroContent;
  announcement: string | null;
  testimonials: Testimonial[];
  faqs: FaqItem[];
  useCases: UseCase[];
  integrations: IntegrationItem[];
  resources: ResourceArticle[];
  seo: {
    defaultTitle: string;
    defaultDescription: string;
  };
}

export interface MarketingStore {
  pricing: PricingConfig;
  content: WebsiteContent;
}

export interface AdminActivityEntry {
  id: string;
  action: string;
  detail: string;
  at: string;
}
