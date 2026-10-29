# Quick Migration Guide

## ⚡ Fast Track: Run SQL Migrations

### Important Rules
1. ✅ Copy **SQL statements only** (CREATE TABLE, CREATE INDEX, etc.)
2. ❌ **DO NOT** copy comment lines starting with `--` or `#`
3. ❌ **DO NOT** copy file paths or instructions
4. ✅ Run migrations in the exact order listed below

---

## 🎯 Where to Run

1. Open **Supabase Dashboard** (https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** in left sidebar
4. Click **New Query**
5. Paste SQL and click **Run**

---

## 📋 Migration Order

### Certificates (required for Admin → Certificates)

Run these certificate migrations in order before issuing certificates:

1. `supabase/migrations/20260913000000_certificates.sql` — creates the certificate table, RLS policies, and verification function.
2. `supabase/migrations/20261028000000_certificate_management.sql` — adds the fields used by the current issuance form and management screens.

If the API reports a missing certificate column after the second migration succeeds, refresh the PostgREST schema cache from Supabase **Project Settings → API**, or run `NOTIFY pgrst, 'reload schema';` as a database owner.

The contest migrations below are separate and are only needed for contest features.

Run these files in this exact order:

### 1️⃣ Contest Participants
**File:** `supabase/migrations/20260917000000_contest_participants.sql`

Open the file, copy ALL the SQL content, paste into Supabase SQL Editor, and run.

✅ **Verify:** Check Tables section for `contest_participants`

---

### 2️⃣ Contest Submissions
**File:** `supabase/migrations/20260917000001_contest_submissions.sql`

Open the file, copy ALL the SQL content, paste into Supabase SQL Editor, and run.

✅ **Verify:** Check Tables section for `contest_submissions`

---

### 3️⃣ Contest Ratings
**File:** `supabase/migrations/20260917000002_contest_ratings.sql`

Open the file, copy ALL the SQL content, paste into Supabase SQL Editor, and run.

✅ **Verify:** Check Tables section for `contest_ratings`

---

### 4️⃣ Contest Settings
**File:** `supabase/migrations/20260917000003_contest_settings.sql`

Open the file, copy ALL the SQL content, paste into Supabase SQL Editor, and run.

✅ **Verify:** Check Tables section for `contest_settings` and `contest_moderation_logs`

---

### 5️⃣ Views and Functions
**File:** `supabase/migrations/20260917000004_contest_views_rpcs.sql`

Open the file, copy ALL the SQL content, paste into Supabase SQL Editor, and run.

✅ **Verify:** 
- Check **Database → Functions** for 3 new functions
- Check **Database → Views** for `contest_leaderboard`

---

## ✅ Verify All Migrations

Run this query to check all tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'contest%'
ORDER BY table_name;
```

**Expected output (5 tables):**
- contest_moderation_logs
- contest_participants
- contest_ratings
- contest_settings
- contest_submissions

---

## 🐛 If You See Errors

### "syntax error at or near '#'"
❌ You copied a comment line. Go back and copy **only SQL statements**.

### "syntax error at or near '//'"
❌ You copied a comment. Copy **only the SQL code**.

### "relation already exists"
✅ Migration already ran successfully! Skip to next one.

### "permission denied"
❌ Make sure you're logged into Supabase dashboard as project owner/admin.

---

## 🎉 Done!

Once all 5 migrations run successfully:

1. Close SQL Editor
2. Check **Database → Tables** to confirm all 5 contest tables exist
3. Your database is ready!
4. Next: Configure the contest in Admin panel (`/admin` → Contest tab)

---

## 📖 Full Documentation

See `CONTEST_DEPLOYMENT_GUIDE.md` for:
- Complete deployment steps
- Admin panel usage
- Participant import
- Testing checklist
- Troubleshooting
