# C5.b.2 — Supabase PostgreSQL private checkpoint store (pre-activation)

Created dedicated **atria-clinical** Supabase project in sa-east-1, project reference `hugqjejfyyilslbomsgi`, under the user's existing free organization. Supabase quoted **USD $0/month**. Legacy Supabase projects untouched. **No clinical data copied from suspended Vercel Blob**.

The schema was installed with Supabase remote migration `atria_clinical_guard_atomic_cas`. Table `public.atria_clinical_guards` has RLS enabled, no policies, and table/RPC grants ONLY for `service_role`; `anon` and `authenticated` were verified to have no access. Supabase advisor has one **INFO** RLS-no-policy advisory, intentionally due to a strictly server-only table (not a leak).

A real SQL smoke test in Supabase checked first-create revision=1, duplicate-create rejected, update revision=2, stale revision=1 update rejected, and state unchanged after the conflict. Test data cleaned up (0 rows). This proves sequential CAS contract; **remote multi-client contention, rate, and service-key REST access have not yet been certified**.

New backend-only `src/v5/server/postgres-guard-store.js` implements `read` / `compareAndSwap`, using `sb_secret_` API key in `apikey` header, database atomic RPC and no memory fallback. Added contract test and reproducible DDL in `docs/migration/ATRIA_SUPABASE_DB_SETUP.sql`.

`api/clinical.js` selects Postgres only when BOTH `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are configured as server-only Vercel variables. Otherwise it retains the old private Blob probe. **Critically `enabled:false` remains: the public C5.a clinical host is unchanged. A successful probe alone must not activate the new runtime.**

## Next required steps before public C5.b.2
1. In Vercel project `night-shift-clinical`, provision project URL `https://hugqjejfyyilslbomsgi.supabase.co/` as `SUPABASE_URL` and a new Supabase **secret** key (`sb_secret_...`) as `SUPABASE_SECRET_KEY` for Preview. Configure via Vercel's secure UI; NEVER paste API secret into ChatGPT or commit it. Treat as sensitive.
2. Re-deploy a preview after environment assignment, call the authenticated `/api/clinical` capability probe and confirm `kind: postgres-atomic-cas` with durable=true. If test fails, leave C5.b public routes disabled.
3. End-to-end two independent service workers using the same Supabase rows, high-contention CAS/fencing, expired lease, nurse pending/restoration, death, closure/XP; validate no stale owner writes. Validate snapshot JSON lengths and quotas. Use isolated QA rooms and cleanup.
4. Migrate the UI clinical host and guests to a single durable authority; **do not simply flip enabled:true while C5.a still hosts**. Then test 2/3/4 independent browsers, hidden host, reload, reconnect, lost messages and completion receipts.
5. Complete CI for SHA and update CURRENT_HANDOFF. Never claim C5.b fully deployed until all this passes.

No changes to main, legacy 4.8.7, V5 clinical engines, browser UI, maps, XP, studies or nursing. Five cases and current Cooperative stay intact.
