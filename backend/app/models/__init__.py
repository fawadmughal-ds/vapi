"""SQLAlchemy ORM models.

Importing this package registers every model on the shared ``Base`` metadata,
which is required for ``Base.metadata.create_all`` to build all tables.
"""

from app.models.user import User  # noqa: F401
from app.models.agent import Agent  # noqa: F401
from app.models.call import Call  # noqa: F401
from app.models.order import Order  # noqa: F401
from app.models.knowledge_base import KnowledgeBaseDocument  # noqa: F401
from app.models.subscription import Subscription  # noqa: F401
from app.models.phone_number import PhoneNumber  # noqa: F401
from app.models.audit_log import AuditLog  # noqa: F401
from app.models.tool import AgentTool  # noqa: F401
from app.models.token import EmailToken  # noqa: F401
from app.models.integration import Integration  # noqa: F401
from app.models.plan_override import PlanOverride  # noqa: F401
from app.models.platform_settings import PlatformSettings  # noqa: F401
from app.models.tenant_integration import TenantIntegrationEntitlement  # noqa: F401
from app.models.squad import Squad  # noqa: F401
from app.models.campaign import Campaign, CampaignContact  # noqa: F401
