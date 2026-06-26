# Supabase Auth Setup

This folder contains BidSight's auth foundation. It only covers accounts and
public profiles; training mode, predictions, leaderboard, and frontend pages are
separate work.

## Environment

Copy `.env.example` into your local frontend environment when the app scaffold
exists:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Use the publishable anon/client key here. Do not commit service-role keys or
database passwords.

## Supabase Dashboard

1. Open the project in Supabase.
2. Go to **Authentication > Providers > Email**.
3. Enable email/password sign-in for the HEAP MVP.
4. For local development later, add the app URL to **Authentication > URL
   Configuration** once the frontend route exists.

## Apply The Migration

Preferred CLI flow:

```bash
supabase db push
```

If the CLI is not linked yet:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

Fallback dashboard flow:

1. Open **SQL Editor** in Supabase.
2. Paste the SQL from `migrations/20260626000000_create_profiles.sql`.
3. Run it once.

The migration creates `public.profiles`, links each row to `auth.users(id)`,
auto-creates a profile after signup, and enables RLS so signed-in users can read
profiles but only update their own `display_name` and `avatar_url`.

## Verification Checklist

After applying the migration in Supabase:

1. Create a test email/password user.
2. Confirm one matching `public.profiles` row was created automatically.
3. Sign in as user A and update user A's `display_name`.
4. Confirm user A cannot update user B's profile.
5. Delete the test auth user and confirm the profile row is deleted too.

## Frontend Integration Contract

When the Next.js app is added, install:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Client code should:

- call `supabase.auth.signUp({ email, password, options: { data: { display_name } } })`
  for signup;
- call `supabase.auth.signInWithPassword({ email, password })` for login;
- read the current user from Supabase Auth instead of storing user IDs manually;
- join future prediction/stat rows to `auth.users.id` or `public.profiles.id`;
- update names through `public.profiles`, never through direct `auth.users`
  writes from the browser.

The frontend should not depend on user emails being exposed in `public.profiles`.
