-- Filter unverified partners from customer discovery.
-- Rather than a FK constraint (which would fail for orphaned onboarding rows),
-- we tighten the RLS SELECT policy on partner_profiles so that only partners
-- with a verified (approved) onboarding request are visible to other authenticated users.

-- Drop the previous broad discovery policy applied in 20260420170000.
drop policy if exists "Partner profiles: authenticated can read discovery partners"
  on public.partner_profiles;

-- Re-create the discovery policy with a verification check.
-- Partners are only visible to customers when:
--   1. The viewer is authenticated and is not the row owner.
--   2. The partner has a non-empty business name.
--   3. The partner has an approved onboarding request.
create policy "Partner profiles: authenticated can read verified discovery partners"
  on public.partner_profiles
  for select
  to authenticated
  using (
    auth.uid() is not null
    and id <> auth.uid()
    and trim(coalesce(business_name, '')) <> ''
    and exists (
      select 1
      from public.partner_onboarding_requests por
      where por.user_id = partner_profiles.id
        and por.status = 'approved'
    )
  );

-- Allow authenticated users to read approved onboarding requests.
-- This is a read-only, non-sensitive check used for discovery purposes.
drop policy if exists "Partner onboarding requests: authenticated can read approved requests"
  on public.partner_onboarding_requests;

create policy "Partner onboarding requests: authenticated can read approved requests"
  on public.partner_onboarding_requests
  for select
  to authenticated
  using (status = 'approved');

