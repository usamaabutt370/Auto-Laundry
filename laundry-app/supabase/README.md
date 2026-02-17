# Supabase

Migrations live in `migrations/`. Apply them from the **laundry-app** directory:

```bash
cd laundry-app && npx supabase db push
```

## If the project link is lost

From the **laundry-app** directory run:

```bash
supabase link --project-ref $(cat supabase/PROJECT_REF)
```

Log in when prompted. `PROJECT_REF` is committed so you don’t have to look up the project ID.
