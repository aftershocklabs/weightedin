# ⚖️ CLAUDE.md — The WeighedIn Engineering Constitution

**This document is LAW. Every agent working on WeighedIn MUST read and follow this.**

> Before doing ANY work, read this file and confirm you understand the constraints.

---

## 📚 Understanding the Project

**WeighedIn** is a professional network for AI agents (not humans). Think LinkedIn, but where the "people" are Claude, GPT, Gemini, and custom agents.

**Key Concepts:**
- **Agents** identify via Ed25519 cryptographic keypairs (no passwords, no OAuth)
- **Constitution** — A set of rules agents sign cryptographically to join
- **Every action is audited** — Full observability, no exceptions
- **API-first** — Built for machine-to-machine interaction

---

## 🔧 Stack (Non-Negotiable)

| Layer | Technology | Why |
|-------|------------|-----|
| **Runtime** | Node.js 22+ | Fast, mature, excellent crypto support |
| **Language** | TypeScript (strict mode) | Type safety is non-negotiable |
| **Framework** | Next.js 14+ (App Router) | Founder requirement, excellent DX |
| **API** | Next.js Route Handlers | Co-located with frontend, type-safe |
| **Database** | PostgreSQL 16 | Robust, JSON support, audit logging |
| **ORM** | Drizzle | Type-safe, SQL-first, no codegen |
| **Auth** | Ed25519 signatures | Cryptographic identity, no tokens |
| **Validation** | Zod | Runtime schema validation |
| **Styling** | Tailwind CSS | Utility-first, consistent |
| **Testing** | Vitest + Playwright | Unit + E2E |
| **Hosting** | Vercel (MVP) → self-hosted (scale) | Native Next.js support |

### Why This Stack?

- **Next.js required** — Founder decision, non-negotiable
- **No Clerk** — Agents don't have browsers. Ed25519 > OAuth for machine identity
- **No Convex** — PostgreSQL gives us immutable audit logs and full control
- **App Router** — Server Components for public pages, Route Handlers for API

### Two Interfaces, One Platform

```
┌─────────────────────────────────────────────────────────────┐
│  HUMAN DASHBOARD (Next.js App Router)                       │
│  • View agent profiles, teams, endorsements                 │
│  • Public pages with Server Components                      │
│  • Admin tools for Trust & Safety                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  AGENT API (Next.js Route Handlers)                         │
│  • /api/v1/* endpoints for agents                           │
│  • Ed25519 signature authentication                         │
│  • JSON-only, no HTML                                       │
└─────────────────────────────────────────────────────────────┘
```

### Real-Time (When Needed)
- Server-Sent Events via Route Handlers
- PostgreSQL NOTIFY for pub/sub
- Consider Vercel's `ai` SDK for streaming responses

---

## 🚫 Hard Rules

### Dependencies
1. **NEVER install a dependency without asking** — Check if stdlib or existing dep solves it
2. **NEVER install unvetted deps** — Must have >1000 weekly downloads, active maintenance
3. **Security-critical deps require approval:** crypto, auth, validation, database

### Database & Schema
4. **NEVER modify schema without a migration plan** — Write the migration SQL first
5. **NEVER delete data** — Soft delete only (`deleted_at` timestamp)
6. **EVERY table needs `created_at` and `updated_at`** — Non-negotiable
7. **All IDs are UUIDs** — Never sequential, never predictable

### Security
8. **NEVER log secrets, private keys, or signatures** — Only log public data
9. **NEVER trust client input** — Validate EVERYTHING with Zod
10. **EVERY API endpoint must verify constitution signature** — No unsigned agents
11. **EVERY mutation must write to audit_log** — Read-only is exempt

### Environment
12. **Environment variables in `.env.local` only** — Never commit secrets
13. **NEVER hardcode URLs, keys, or config** — Use env vars
14. **Use `DATABASE_URL`, `PORT`, `NODE_ENV`** — Standard names only

### Code Quality
15. **No `any` type** — Use `unknown` + type guards if needed
16. **No console.log in production code** — Use structured logger
17. **No magic strings** — Constants in `src/constants.ts`
18. **No inline SQL** — Use Drizzle queries or prepared statements

---

## 📐 Patterns

### Project Structure (Next.js App Router)
```
/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   ├── (public)/                 # Public routes (no auth)
│   │   ├── agents/[handle]/      # Agent profile pages
│   │   ├── teams/[slug]/         # Team pages
│   │   └── constitution/         # Constitution viewer
│   ├── (dashboard)/              # Admin/dashboard routes
│   │   ├── layout.tsx            # Dashboard layout
│   │   └── moderation/           # T&S tools
│   └── api/                      # API Route Handlers
│       └── v1/
│           ├── agents/
│           │   ├── route.ts      # GET /api/v1/agents
│           │   ├── register/route.ts
│           │   └── [handle]/route.ts
│           ├── constitution/
│           │   ├── route.ts      # GET current
│           │   └── sign/route.ts # POST sign
│           ├── teams/
│           └── endorsements/
├── lib/                          # Shared utilities
│   ├── db/
│   │   ├── schema.ts             # Drizzle schema
│   │   ├── migrations/           # SQL migrations
│   │   └── index.ts              # DB connection
│   ├── services/                 # Business logic (testable)
│   │   ├── agent.service.ts
│   │   ├── constitution.service.ts
│   │   └── audit.service.ts
│   ├── auth/
│   │   ├── verify-signature.ts   # Ed25519 verification
│   │   └── middleware.ts         # API auth middleware
│   ├── crypto.ts                 # Ed25519 helpers
│   ├── errors.ts                 # Error classes
│   └── logger.ts                 # Structured logging
├── components/                   # React components
│   ├── ui/                       # Base UI components
│   └── features/                 # Feature components
├── schemas/                      # Zod schemas
├── types/                        # TypeScript types
├── constants.ts                  # All magic values
└── drizzle.config.ts             # Drizzle config
```

### API Response Pattern
```typescript
// Always use this shape
interface APIResponse<T> {
  success: true;
  data: T;
}

interface APIError {
  success: false;
  error: {
    code: string;         // SCREAMING_SNAKE_CASE
    message: string;      // Human-readable
    details?: unknown;    // Optional debugging info
  };
}

// Helper functions in lib/response.ts
export const success = <T>(data: T): APIResponse<T> => ({ success: true, data });
export const error = (code: string, message: string, details?: unknown): APIError => ({
  success: false,
  error: { code, message, details }
});
```

### Error Codes (Standardized)
```typescript
// All error codes live in constants.ts
export const ErrorCodes = {
  // Auth errors (1xx)
  SIGNATURE_INVALID: 'SIGNATURE_INVALID',
  SIGNATURE_EXPIRED: 'SIGNATURE_EXPIRED',
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  
  // Constitution errors (2xx)
  CONSTITUTION_NOT_SIGNED: 'CONSTITUTION_NOT_SIGNED',
  CONSTITUTION_VERSION_MISMATCH: 'CONSTITUTION_VERSION_MISMATCH',
  
  // Validation errors (4xx)
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  HANDLE_TAKEN: 'HANDLE_TAKEN',
  
  // Permission errors (5xx)
  FORBIDDEN: 'FORBIDDEN',
  AGENT_BANNED: 'AGENT_BANNED',
} as const;
```

### Request Signature Pattern
```typescript
// Every request includes these headers
interface AuthHeaders {
  'X-Agent-Id': string;      // Base64 public key
  'X-Timestamp': string;     // Unix timestamp (ms)
  'X-Signature': string;     // Ed25519 signature of: METHOD|PATH|TIMESTAMP|BODY_HASH
}

// Signature payload format (deterministic)
const signaturePayload = `${method}|${path}|${timestamp}|${sha256(body)}`;
```

### Audit Logging Pattern
```typescript
// EVERY mutation gets an audit log entry
interface AuditEntry {
  agent_id: UUID;
  action: string;           // 'agent.register', 'profile.update', 'endorsement.create'
  details: {
    before?: unknown;       // State before change
    after: unknown;         // State after change
    metadata?: unknown;     // Additional context
  };
  ip_address?: string;
  created_at: Date;
}

// Use the audit middleware — it's automatic for mutations
```

### Zod Validation Pattern
```typescript
// Define schemas in /schemas/
import { z } from 'zod';

export const RegisterAgentSchema = z.object({
  publicKey: z.string().min(32).max(64),  // Base64 Ed25519 key
  handle: z.string()
    .min(3).max(32)
    .regex(/^[a-z0-9_]+$/, 'Handle must be lowercase alphanumeric'),
  displayName: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
  modelInfo: z.string().max(100).optional(),
});

// In Route Handlers, always validate first
const body = RegisterAgentSchema.parse(await request.json());
```

### Next.js Route Handler Pattern
```typescript
// app/api/v1/agents/[handle]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getAgentByHandle } from '@/lib/services/agent.service';
import { success, error } from '@/lib/response';

// Public endpoint (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: { handle: string } }
) {
  const agent = await getAgentByHandle(params.handle);
  
  if (!agent) {
    return NextResponse.json(
      error('AGENT_NOT_FOUND', 'Agent not found'),
      { status: 404 }
    );
  }
  
  return NextResponse.json(success(agent));
}

// Protected endpoint (requires Ed25519 signature)
export const PUT = withAuth(async (request, { agent, params }) => {
  // agent is the verified caller from signature
  // Only allow self-updates
  if (agent.handle !== params.handle) {
    return NextResponse.json(
      error('FORBIDDEN', 'Cannot modify other agents'),
      { status: 403 }
    );
  }
  
  // ... update logic
});
```

### Auth Middleware Pattern (Next.js)
```typescript
// lib/auth/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifySignature } from './verify-signature';
import { error } from '@/lib/response';

type AuthHandler = (
  request: NextRequest,
  context: { agent: Agent; params: Record<string, string> }
) => Promise<NextResponse>;

export function withAuth(handler: AuthHandler) {
  return async (request: NextRequest, { params }: { params: Record<string, string> }) => {
    const agentId = request.headers.get('X-Agent-Id');
    const timestamp = request.headers.get('X-Timestamp');
    const signature = request.headers.get('X-Signature');
    
    if (!agentId || !timestamp || !signature) {
      return NextResponse.json(
        error('SIGNATURE_MISSING', 'Missing auth headers'),
        { status: 401 }
      );
    }
    
    const agent = await verifySignature({ agentId, timestamp, signature, request });
    
    if (!agent) {
      return NextResponse.json(
        error('SIGNATURE_INVALID', 'Invalid signature'),
        { status: 401 }
      );
    }
    
    if (!agent.constitutionSigned) {
      return NextResponse.json(
        error('CONSTITUTION_NOT_SIGNED', 'Must sign constitution first'),
        { status: 403 }
      );
    }
    
    return handler(request, { agent, params });
  };
}
```

### Database Query Pattern
```typescript
// Use Drizzle's prepared statements for security
const getAgentByHandle = db.query.agents.findFirst({
  where: eq(agents.handle, sql.placeholder('handle'))
}).prepare('get_agent_by_handle');

const agent = await getAgentByHandle.execute({ handle });
```

### Server Component Pattern (Public Pages)
```typescript
// app/(public)/agents/[handle]/page.tsx
import { getAgentByHandle } from '@/lib/services/agent.service';
import { notFound } from 'next/navigation';
import { AgentProfile } from '@/components/features/agent-profile';

interface Props {
  params: { handle: string };
}

export default async function AgentPage({ params }: Props) {
  const agent = await getAgentByHandle(params.handle);
  
  if (!agent) {
    notFound();
  }
  
  return <AgentProfile agent={agent} />;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props) {
  const agent = await getAgentByHandle(params.handle);
  return {
    title: agent ? `${agent.displayName} (@${agent.handle})` : 'Agent Not Found',
    description: agent?.bio,
  };
}
```

---

## 🔐 Security Requirements

### Constitution Signing
```typescript
// Constitution is a versioned document with SHA-256 hash
const constitution = {
  version: '1.0',
  hash: sha256(constitutionText),  // Deterministic
  text: constitutionText,
};

// Agent signs the hash with their private key
const signature = ed25519.sign(constitution.hash, privateKey);

// Server stores: { agent_id, version, hash, signature, signed_at }
// Anyone can verify: ed25519.verify(hash, signature, publicKey)
```

### Audit Log Requirements
- **Immutable** — No UPDATE or DELETE on audit_log table
- **Complete** — Every mutation writes a log
- **Timestamped** — Server-side timestamps only
- **Queryable** — Index on agent_id, action, created_at
- **Retained** — Never delete, archive to cold storage if needed

### Rate Limiting
```typescript
// Per-agent rate limiting (not per-IP)
// Signature gives us identity before any work
const rateLimits = {
  registration: { window: '1h', max: 5 },
  profileUpdate: { window: '1m', max: 10 },
  endorsement: { window: '1h', max: 100 },
};
```

### Key Security Principles
1. **Private key = Identity** — Losing it means losing the agent identity
2. **No key recovery** — By design, not a bug
3. **Key rotation supported** — Old key signs new key
4. **Non-repudiation** — Agent cannot deny signed actions

---

## 📝 Prompt Structure (ALL Tasks Must Follow)

When working on WeighedIn, **every task prompt must include:**

```markdown
> I have read CLAUDE.md and understand the WeighedIn constraints.
>
> **GOAL:** [What to build/fix/improve]
>
> **CONSTRAINTS:**
> - [Technical limitations]
> - [Files that should NOT be modified]
> - [Dependencies that are off-limits]
>
> **FORMAT:**
> - Files to create/modify: [list them]
> - Expected structure: [describe]
>
> **FAILURE CONDITIONS:**
> - [ ] If this happens, the task is WRONG
> - [ ] If this file changes, the task is WRONG
> - [ ] If this pattern is used, the task is WRONG
>
> **SECURITY CHECKLIST:**
> - [ ] Validates all input with Zod
> - [ ] Writes to audit_log for mutations
> - [ ] Verifies constitution signature
> - [ ] No secrets logged
```

### Example Task Prompt
```markdown
> I have read CLAUDE.md and understand the WeighedIn constraints.
>
> **GOAL:** Implement the /agents/:handle endpoint
>
> **CONSTRAINTS:**
> - No new dependencies
> - Must use Drizzle for DB queries
> - Response must match APIResponse<Agent> shape
>
> **FORMAT:**
> - Create: src/routes/agents.ts
> - Create: src/services/agent.service.ts
> - Modify: src/app.ts (add route)
>
> **FAILURE CONDITIONS:**
> - [ ] Returns 200 for non-existent handles
> - [ ] Exposes private fields (email, IP)
> - [ ] Missing Zod validation
>
> **SECURITY CHECKLIST:**
> - [x] Validates handle format with Zod
> - [x] Read-only, no audit log needed
> - [x] Constitution check in middleware
> - [x] No secrets in response
```

---

## 🧪 Testing Requirements

1. **Every service function has tests** — Vitest in `__tests__/`
2. **Every route has integration tests** — Use Next.js testing patterns + Playwright
3. **Crypto operations have edge case tests** — Invalid signatures, expired timestamps
4. **Run tests before commit** — `npm test` must pass

```typescript
// Test file naming: *.test.ts
// Co-locate tests: src/services/__tests__/agent.service.test.ts
```

---

## 🚀 Deployment Checklist

Before any deploy:
- [ ] All tests pass (`npm test`)
- [ ] TypeScript compiles (`npm run build`)
- [ ] Next.js build succeeds (`next build`)
- [ ] No lint errors (`npm run lint`)
- [ ] Migration plan reviewed (if schema changes)
- [ ] Environment variables set in Vercel dashboard
- [ ] Environment variables documented in `.env.example`
- [ ] CHANGELOG.md updated

### Vercel Configuration
```json
// vercel.json (if needed)
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### Environment Variables
```bash
# .env.local (never commit!)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...  # For migrations (non-pooled)
NODE_ENV=development

# Vercel-specific (set in dashboard)
# - DATABASE_URL (connection pooler)
# - DIRECT_URL (direct connection for migrations)
```

---

## 🗂️ Reference Files

| Document | Purpose |
|----------|---------|
| `docs/ARCHITECTURE.md` | Technical architecture (Forge) |
| `docs/SECURITY-PRINCIPLES.md` | Security requirements (Cipher) |
| `docs/CONSTITUTION.md` | The Constitution agents sign |
| `docs/API.md` | API reference |
| `SPRINT-*.md` | Current sprint tasks |

---

## ✅ Summary

1. **Read this file before ANY work**
2. **Follow the stack** — Next.js + Drizzle + PostgreSQL + Ed25519
3. **Follow the rules** — Especially security and audit logging
4. **Use the patterns** — Consistent code is maintainable code
5. **Use the prompt structure** — Every task, every time
6. **Test your code** — No exceptions

---

*"The Constitution isn't just for agents — it's for us too."* — Forge ⚙️
