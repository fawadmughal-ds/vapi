export type UserRole = "super_admin" | "customer";
export type AccountStatus = "active" | "suspended";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  is_email_verified: boolean;
  company_name?: string | null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

export type AgentStatus = "draft" | "published" | "disabled";

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  system_prompt: string;
  first_message?: string | null;
  voice_provider: string;
  voice_id: string;
  language: string;
  model: string;
  status: AgentStatus;
  configuration: Record<string, unknown>;
  is_provisioned: boolean;
  created_at: string;
  updated_at: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  provider: string;
  language: string;
  gender?: string | null;
  preview_url?: string | null;
}

export interface LanguageOption {
  code: string;
  name: string;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  description?: string;
}

export interface WebCallConfig {
  public_key: string;
  assistant_id: string;
}

export interface TranscriberOption {
  id: string;
  name: string;
  provider: string;
  model: string;
  description?: string;
}

export interface FirstMessageMode {
  id: string;
  name: string;
  description?: string;
}

export interface ToolField {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

export interface ToolCatalogEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  fields: ToolField[];
}

export interface ToolCatalogCategory {
  category: string;
  tools: ToolCatalogEntry[];
}

export type CallStatus =
  | "queued"
  | "ringing"
  | "in_progress"
  | "completed"
  | "failed"
  | "no_answer"
  | "busy";

export type CallDirection = "inbound" | "outbound";

export interface Call {
  id: string;
  user_id: string;
  agent_id?: string | null;
  call_sid?: string | null;
  direction: CallDirection;
  status: CallStatus;
  caller_number?: string | null;
  callee_number?: string | null;
  duration_seconds: number;
  cost: number;
  recording_url?: string | null;
  transcript?: string | null;
  summary?: string | null;
  ended_reason?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  agent_name?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentStatus = "uploading" | "processing" | "ready" | "failed";

export interface KnowledgeDoc {
  id: string;
  user_id: string;
  agent_id?: string | null;
  file_name: string;
  file_type: string;
  file_size: number;
  status: DocumentStatus;
  extracted_chars: number;
  error_message?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  created_at: string;
  updated_at: string;
}

export type PhoneNumberStatus = "available" | "assigned" | "released";

export interface PhoneNumber {
  id: string;
  user_id: string;
  agent_id?: string | null;
  e164_number: string;
  label?: string | null;
  provider: string;
  country?: string | null;
  status: PhoneNumberStatus;
  is_provisioned: boolean;
  owner_name?: string | null;
  owner_email?: string | null;
  created_at: string;
  updated_at: string;
}

export type PlanTier = "starter" | "growth" | "pro";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "inactive";

export interface PlanInfo {
  tier: PlanTier;
  name: string;
  minutes: number;
  credits: number;
  price_usd: number;
  features: string[];
}

export interface PlanAdminInfo extends PlanInfo {
  published: boolean;
}

export interface Subscription {
  id: string;
  plan: PlanTier;
  status: SubscriptionStatus;
  minutes_limit: number;
  minutes_used: number;
  minutes_remaining: number;
  credit_limit: number;
  credits_used: number;
  topup_credits: number;
  credits_remaining: number;
  minutes_per_credit: number;
  minutes_balance: number;
  current_period_start?: string | null;
  current_period_end?: string | null;
}

export interface PlatformCredits {
  credits_purchased: number;
  credits_used: number;
  credits_remaining: number;
  minutes_per_credit: number;
  enforce_pool: boolean;
  low_balance_threshold: number;
  minutes_remaining: number;
  credits_allocated: number;
  is_low: boolean;
}

export interface ProviderBalance {
  balance: number;
  currency: string;
  balance_at?: string | null;
  spent_since: number;
  remaining: number;
  total_spend: number;
  is_set: boolean;
}

export type OrderStatus = "pending" | "confirmed" | "fulfilled" | "canceled";

export interface Order {
  id: string;
  user_id: string;
  agent_id?: string | null;
  call_id?: string | null;
  customer_name?: string | null;
  phone?: string | null;
  product?: string | null;
  quantity: number;
  status: OrderStatus;
  notes?: string | null;
  extra: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsSummary {
  total_calls: number;
  minutes_used: number;
  avg_duration_seconds: number;
  total_cost: number;
  success_rate: number;
  active_agents: number;
}

export interface TimeSeriesPoint {
  date: string;
  calls: number;
  minutes: number;
  cost: number;
}

export interface AgentPerformance {
  agent_id: string;
  agent_name: string;
  calls: number;
  minutes: number;
  success_rate: number;
  avg_duration_seconds: number;
}

export interface AnalyticsResponse {
  summary: AnalyticsSummary;
  calls_per_day: TimeSeriesPoint[];
  calls_per_month: TimeSeriesPoint[];
  agent_performance: AgentPerformance[];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  is_email_verified: boolean;
  company_name?: string | null;
  agent_count: number;
  call_count: number;
  plan?: PlanTier | null;
  credit_limit: number;
  credits_used: number;
  topup_credits: number;
  credits_remaining: number;
  total_cost: number;
  minutes_used: number;
}

export interface PlatformStats {
  total_customers: number;
  total_agents: number;
  total_calls: number;
  total_minutes: number;
  total_revenue_estimate: number;
  total_cost: number;
  active_subscriptions: number;
}

export interface ResourceSyncCount {
  imported: number;
  updated: number;
  total: number;
}

export interface SyncResult {
  agents?: ResourceSyncCount | null;
  calls?: ResourceSyncCount | null;
  integrations?: ResourceSyncCount | null;
  phone_numbers?: ResourceSyncCount | null;
}

export interface AdminAgentRow {
  id: string;
  name: string;
  user_id: string;
  owner_name?: string | null;
  owner_email?: string | null;
  status: AgentStatus;
  voice_id: string;
  model: string;
  is_provisioned: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  resource_type?: string | null;
  resource_id?: string | null;
  ip_address?: string | null;
  detail: Record<string, unknown>;
  actor_name?: string | null;
  actor_email?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  auth_type: string;
  connected: boolean;
  masked_key?: string | null;
  label?: string | null;
}

export interface ProviderCategory {
  category: string;
  providers: ProviderInfo[];
}

export interface TenantProviderEntitlement {
  provider_id: string;
  name: string;
  category: string;
  enabled: boolean;
}

export interface AgentTool {
  id: string;
  agent_id: string;
  name: string;
  description: string;
  parameters_schema: Record<string, unknown>;
  handler: string;
  enabled: boolean;
  agent_name?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SquadMember {
  agent_id: string;
  agent_name?: string | null;
  is_provisioned: boolean;
}

export interface Squad {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  member_agent_ids: string[];
  is_provisioned: boolean;
  members: SquadMember[];
  owner_name?: string | null;
  owner_email?: string | null;
  created_at: string;
  updated_at: string;
}
