# NextCall Frontend (Next.js 15)

The customer + admin dashboard for the white-label voice platform. Built with the
App Router, TypeScript, Tailwind CSS and shadcn-style UI components.

## Run

```bash
npm install
cp .env.local.example .env.local   # point NEXT_PUBLIC_API_URL at the backend
npm run dev
```

App runs at http://localhost:3000.

## Structure

| Path                          | Purpose                                       |
| ----------------------------- | --------------------------------------------- |
| `src/app/(auth)/`             | Login, register, forgot/reset, verify email   |
| `src/app/(dashboard)/`        | Authenticated app (sidebar layout)            |
| `src/app/(dashboard)/admin/`  | Super-admin console                           |
| `src/components/ui/`          | Reusable shadcn-style primitives              |
| `src/components/dashboard/`   | Sidebar + top navigation                      |
| `src/lib/api.ts`              | Typed fetch client w/ JWT refresh             |
| `src/lib/auth.tsx`            | Auth context (login/register/logout)          |
| `src/lib/types.ts`            | Shared TypeScript types mirroring the API     |

## Pages

Dashboard · AI Agents (+ 7-step create wizard) · Knowledge Base · Phone Numbers ·
Calls · Orders · Analytics · Billing · Settings · Admin Console.

## White-label note

Nothing in the UI references the underlying voice provider. Agents are presented
as first-class "AI Agents" and voices use neutral, branded names.
