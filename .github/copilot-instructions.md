# GitHub Copilot Custom Instructions
# Transferred from Antigravity IDE skills & config

## Project Context
This is a **BI Platform** built with Next.js, TypeScript, Supabase, and DuckDB.
- Source files are in `src/`
- Use Supabase for auth and database
- Use DuckDB for analytical queries
- Use Vercel for deployment

---

## Core Behavioral Rules

### Code Quality
- Always write **production-quality** code - no stubs, no TODOs, no skipped tests
- Never silence lint/type errors with `// @ts-ignore` or `// eslint-disable` unless absolutely necessary and always add a comment explaining why
- Prefer TypeScript strict mode patterns - no implicit `any`
- Use `const` over `let`; avoid `var`
- Always handle errors explicitly - never swallow exceptions silently

### Implementation Style
- **Incremental delivery**: Break large changes into small, independently testable steps
- **Test-driven**: Write or update tests when changing logic
- **Spec before code**: For ambiguous requirements, clarify what is expected before implementing
- **Source-grounded**: Ground implementation decisions in official docs (Next.js, Supabase, Vercel docs)

### Security
- Never hardcode secrets or API keys in source files
- Always validate and sanitize user inputs
- Use parameterized queries - never string-interpolate SQL
- Follow least-privilege principle for Supabase RLS policies

### React / Next.js Patterns
- Use Server Components by default; only add "use client" when necessary
- Prefer `async/await` in Server Components over `useEffect` for data fetching
- Use `next/image` for images, `next/link` for navigation
- Keep components focused and reusable
- Manage state with React hooks; avoid unnecessary global state

### Styling
- Use Vanilla CSS or Tailwind CSS (project default) - check existing patterns first
- Use CSS variables for theming
- Design for mobile-first, responsive layouts
- Follow WCAG 2.1 accessibility guidelines

### Git & Commits
- Write clear, imperative commit messages: `feat: add X`, `fix: resolve Y`, `refactor: simplify Z`
- Keep commits atomic - one logical change per commit
- Never commit secrets, `.env` files, or build artifacts

---

## Available MCP Tools

The following MCP servers are connected and available:

### Vercel (`vercel`)
- Deploy, inspect, and manage Vercel projects
- Check deployment status, domains, environment variables
- Use for: deploying the bi-platform, checking build logs, managing env vars

### Supabase (`supabase`)
- Query and manage Supabase projects
- Manage tables, RLS policies, auth settings, storage
- Use for: schema changes, RLS policy creation, auth configuration, edge functions

### GitHub (`github`)
- Create/manage issues, PRs, branches
- Search code, review PR status
- Use for: creating PRs, reviewing issues, code search

### Playwright (`playwright`)
- Browser automation and testing
- Take screenshots, interact with web pages, test UI flows
- Use for: E2E testing, UI verification, visual debugging

### Stitch (`stitch`)
- Google Stitch design tool
- Generate UI mockups and design screens
- Use for: creating UI designs, generating component mockups

---

## Workflow Skills Reference

### When planning features:
1. Clarify requirements first (ask if ambiguous)
2. Break into small, verifiable tasks
3. Implement incrementally
4. Verify with tests and manual checks

### When debugging:
1. Identify the exact error message and location
2. Reproduce the issue consistently
3. Hypothesize root cause based on evidence
4. Fix the root cause - not the symptom
5. Verify the fix does not break other things

### When deploying to Vercel:
1. Use the Vercel MCP tool to check current deployment status
2. Ensure environment variables are set in Vercel dashboard
3. Test on preview URL before promoting to production
4. Monitor build logs for errors

### When working with Supabase:
1. Use the Supabase MCP tool for schema changes
2. Always write RLS policies for new tables
3. Test auth flows in Supabase dashboard
4. Use Supabase Edge Functions for server-side logic

### Code Review Checklist:
- Correctness: Does it do what is intended?
- Security: Any injection, auth bypass, or data leak risks?
- Performance: N+1 queries? Unnecessary re-renders?
- Readability: Is it clear without comments?
- Tests: Are tests adequate?

---

## Project-Specific Patterns

### Auth (Supabase)
- Auth logic lives in `src/lib/auth/`
- Use server-side session validation for API routes
- Use `createServerClient` from `@supabase/ssr` in server components

### Data Sources
- Source management in `src/app/api/sources/`
- DuckDB engine in `src/lib/engine/duckdb.ts`
- Dataset routes in `src/app/api/datasets/`

### UI Components
- Dashboard components in `src/components/dashboard/`
- Source pages in `src/app/(app)/app/sources/`

---

## Style & Design
- Use vibrant, modern design - avoid generic plain colors
- Prefer dark mode with glassmorphism effects for dashboards
- Add subtle hover animations and micro-interactions
- Use modern typography (Inter, Outfit from Google Fonts)
- Dashboard UIs should feel premium and data-rich
