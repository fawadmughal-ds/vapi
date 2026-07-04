"""Shared enumerations used across models and schemas."""

import enum


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    CUSTOMER = "customer"


class AccountStatus(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"


class AgentStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    DISABLED = "disabled"


class CallStatus(str, enum.Enum):
    QUEUED = "queued"
    RINGING = "ringing"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    NO_ANSWER = "no_answer"
    BUSY = "busy"


class CallDirection(str, enum.Enum):
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class DocumentStatus(str, enum.Enum):
    UPLOADING = "uploading"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class PlanTier(str, enum.Enum):
    STARTER = "starter"
    GROWTH = "growth"
    PRO = "pro"


class SubscriptionStatus(str, enum.Enum):
    TRIALING = "trialing"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    INACTIVE = "inactive"


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    FULFILLED = "fulfilled"
    CANCELED = "canceled"


class PhoneNumberStatus(str, enum.Enum):
    AVAILABLE = "available"
    ASSIGNED = "assigned"
    RELEASED = "released"
