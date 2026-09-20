# DevEstimate client request setup

The client request workflow is now prepared for a real cross-device setup while GitHub Pages remains the frontend host.

## 1. Create a Supabase project

Create a Supabase project and copy its Project URL plus the **publishable key** from the project's API Keys / Connect settings. Supabase recommends publishable keys for browser-side clients and Row Level Security for protecting data. citeturn691372search9turn691372search0

## 2. Run the database migration

In Supabase SQL Editor, run:

supabase/migrations/001_client_requests.sql

This creates:
- request links
- client submissions
- owner-only RLS policies
- a secure public RPC used by the client form

The client never gets direct read access to dashboard data.

## 3. Create your private admin user

In Supabase Authentication, create the email/password user you will use for DevEstimate. The dashboard will require a signed-in Supabase session once the public environment variables are configured.

## 4. Add GitHub repository secrets

Repository → Settings → Secrets and variables → Actions:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

The Pages workflow already passes these values into the static build.

## 5. Enable real AI analysis

The request form first calculates a local fallback analysis. When the Supabase Edge Function is available, it asks OpenAI for a structured technical analysis and falls back automatically if the function is unavailable.

Deploy:

supabase/functions/analyze-request/index.ts

Then add the Edge Function secret:

OPENAI_API_KEY

The function uses the Responses API with structured JSON output and does not receive the client's contact details. OpenAI documents the Responses API and structured JSON schema output, and the current cost-sensitive GPT-5.6 Luna model is suitable for this high-volume estimation workflow. citeturn771714search2turn771714search0turn608025search0

## 6. Public client URL

Generated links look like:

https://estimate.skup.ge/request/?token=<unique-token>

The client-facing form never renders your internal price, hourly rate, multipliers, Basic/Standard/Premium packages, or commercial formula.

Until Supabase credentials are configured in the GitHub Actions secrets, the app intentionally stays in local-demo mode so the deployed site remains usable without exposing a fake database configuration.
