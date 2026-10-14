# Vibe Coding Contest - Deployment Guide

## 🎯 Overview
Complete deployment guide for the "Vibe Coding Contest" system. This will add contest functionality to your existing UIC website.

---

## ✅ Prerequisites Checklist

Before starting deployment:
- [ ] Admin access to Supabase dashboard
- [ ] Local development environment set up
- [ ] All dependencies installed (`npm install` completed)
- [ ] Build passes successfully (`npm run build` completed)

---

## 📦 What's Been Built

### Database Layer (5 SQL Migrations)
1. **contest_participants** - Unstop verification system
2. **contest_submissions** - Website submissions with auto-calculated ratings
3. **contest_ratings** - Peer rating system (1-5 scale)
4. **contest_settings** - Contest configuration
5. **contest_views_rpcs** - Views and stored procedures

### Service Layer
- `src/services/contest.ts` - Complete contest service with all CRUD operations
- `src/lib/urlValidation.ts` - URL validation utilities

### React Query Hooks
- `src/hooks/useContest.ts` - 15+ hooks for data fetching and mutations

### UI Components (11 Total)

**Public Contest Pages (7 components in `src/components/contest/`):**
- `ContestEvent.tsx` - Main contest page (replaces standard event detail for contests)
- `ContestHeader.tsx` - Hero section with countdown timer
- `ParticipantVerification.tsx` - Unstop verification card
- `SubmissionForm.tsx` - Website submission form
- `SubmissionCard.tsx` - Individual submission display
- `SubmissionGrid.tsx` - Gallery of all submissions
- `Leaderboard.tsx` - Top 5 rankings

**Admin Dashboard (4 components in `src/components/admin/`):**
- `ContestAdmin.tsx` - Main admin panel with 6 tabs
- `ContestOverview.tsx` - Contest settings and stats
- `ContestParticipants.tsx` - CSV import and participant management
- `ContestSubmissions.tsx` - Submission moderation

**User Dashboard Widget:**
- `src/components/dashboard/ContestSection.tsx` - Shows user's contest participation

### Modified Existing Files
- `src/pages/EventDetail.tsx` - Detects contest events and renders ContestEvent
- `src/pages/Admin.tsx` - Added "Contest" tab ✅ (COMPLETED)
- `src/types/index.ts` - Extended ClubEvent type with contest fields
- `src/services/events.ts` - Extended event queries for contest fields

---

## 🚀 Step-by-Step Deployment

### Step 1: Database Migrations (CRITICAL - Do First)

**Important:** Run migrations in exact order. Each builds on the previous one.

1. Open your Supabase Dashboard
2. Navigate to: **SQL Editor** (left sidebar)
3. Click **"New Query"**

Run these 5 migrations in order:

#### Migration 1: Contest Participants
```sql
-- File: supabase/migrations/20260917000000_contest_participants.sql
-- Copy the ENTIRE content of this file and run it
```

**What it creates:**
- `contest_participants` table (stores Unstop verification)
- RLS policies for participant access
- Indexes for performance

**Verification:** After running, check the Tables section - you should see `contest_participants`

---

#### Migration 2: Contest Submissions
```sql
-- File: supabase/migrations/20260917000001_contest_submissions.sql
-- Copy the ENTIRE content of this file and run it
```

**What it creates:**
- `contest_submissions` table (stores website URLs and ratings)
- Auto-update triggers for rating calculations
- RLS policies for submission access
- Immutable `submitted_at` protection

**Verification:** Check for `contest_submissions` table and the `recalculate_submission_rating_stats` trigger

---

#### Migration 3: Contest Ratings
```sql
-- File: supabase/migrations/20260917000002_contest_ratings.sql
-- Copy the ENTIRE content of this file and run it
```

**What it creates:**
- `contest_ratings` table (peer ratings 1-5)
- Self-rating prevention trigger
- Unique constraint (one rating per submission per reviewer)
- Rating stats recalculation on insert/update/delete
- RLS policies

**Verification:** Check for `contest_ratings` table and `prevent_self_rating` trigger

---

#### Migration 4: Contest Settings
```sql
-- File: supabase/migrations/20260917000003_contest_settings.sql
-- Copy the ENTIRE content of this file and run it
```

**What it creates:**
- `contest_settings` table (contest configuration)
- `contest_moderation_logs` table (admin actions audit trail)
- RLS policies for admin-only access

**Verification:** Check for both `contest_settings` and `contest_moderation_logs` tables

---

#### Migration 5: Views and RPCs
```sql
-- File: supabase/migrations/20260917000004_contest_views_rpcs.sql
-- Copy the ENTIRE content of this file and run it
```

**What it creates:**
- `contest_leaderboard` view (top submissions with rankings)
- `get_contest_settings()` RPC
- `update_contest_settings()` RPC
- `bulk_verify_participants()` RPC (CSV import)

**Verification:** 
- Check **Database > Functions** for the 3 RPCs
- Check **Database > Views** for `contest_leaderboard`

---

### Step 2: Verify Database Setup

Run this query in SQL Editor to verify all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'contest%'
ORDER BY table_name;
```

**Expected output:**
```
contest_moderation_logs
contest_participants
contest_ratings
contest_settings
contest_submissions
```

---

### Step 3: Configure Supabase Environment Variables

1. Check your `.env.local` file (create if it doesn't exist)
2. Ensure these are set:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Get these from: Supabase Dashboard → Settings → API

---

### Step 4: Start Development Server

```bash
npm run dev
```

The application should start without errors.

---

### Step 5: Create Your First Contest Event

1. Navigate to `/admin` in your browser
2. Click the **"Contest"** tab (you should see it with a Trophy icon 🏆)
3. Go to the **"Overview"** sub-tab
4. Configure contest settings:
   - Enable the contest
   - Set submission start/end dates
   - Set rating start/end dates
   - Configure min/max ratings per submission

**OR** manually insert settings:

```sql
INSERT INTO contest_settings (
  contest_name,
  is_enabled,
  submission_start,
  submission_end,
  rating_start,
  rating_end,
  max_submissions_per_user,
  min_ratings_per_submission,
  max_ratings_per_submission
) VALUES (
  'Vibe Coding Contest 2026',
  true,
  '2026-10-14 00:00:00',
  '2026-10-28 23:59:59',
  '2026-10-29 00:00:00',
  '2026-11-05 23:59:59',
  1,
  3,
  50
);
```

---

### Step 6: Import Participants

1. Go to **Admin → Contest → Participants** tab
2. Export participant list from Unstop (CSV format)
3. CSV should have these columns:
   - `Participant Name` or `Full Name` or `Name`
   - `Email` or `Email Address`
   - `Unstop Profile URL` (optional)

4. Click **"Upload CSV"** and select your file
5. Review the preview
6. Click **"Import X Participants"**

**Manual SQL insert (if needed):**

```sql
INSERT INTO contest_participants (event_id, email, full_name, unstop_profile_url)
VALUES (
  'your-event-id-here',
  'student@example.com',
  'John Doe',
  'https://unstop.com/u/johndoe'
);
```

---

### Step 7: Link Event to Contest

You need to mark an event as a contest event:

**Option A: Update existing event in Admin UI**
1. Go to **Admin → Events**
2. Edit an event
3. (Future: Add contest toggle) For now, use SQL:

**Option B: SQL Update**

```sql
-- First, find your event ID
SELECT id, title FROM events ORDER BY created_at DESC LIMIT 10;

-- Then update it to be a contest event
UPDATE events 
SET 
  event_type = 'contest',
  contest_theme = 'Vibe Coding Contest',
  contest_prizes = '{"first": "₹10,000", "second": "₹5,000", "third": "₹2,500"}',
  contest_rules = 'Build a website showcasing your coding vibes. No restrictions on tech stack.'
WHERE id = 'your-event-id-here';
```

**Note:** The frontend will detect `event_type = 'contest'` and render ContestEvent instead of standard event details.

---

### Step 8: Test the Full Flow

#### As an Admin:
1. ✅ Import participants via CSV
2. ✅ View participant list
3. ✅ Monitor submissions in real-time
4. ✅ View leaderboard
5. ✅ Check moderation logs

#### As a Participant:
1. Visit the contest event page (e.g., `/events/your-event-id`)
2. Verify eligibility (email must match Unstop registration)
3. Submit website URL
4. Rate 3-5 other submissions
5. View your position on leaderboard

---

## 🔒 Security Features Built-In

### Database-Level Protection
- ✅ **RLS Policies:** All tables have Row-Level Security
- ✅ **Self-Rating Prevention:** Trigger blocks users from rating their own submissions
- ✅ **Immutable Timestamps:** `submitted_at` cannot be changed after creation
- ✅ **Unique Constraints:** One rating per submission per reviewer

### Application-Level Validation
- ✅ **URL Validation:** Validates website URLs (HTTP/HTTPS, no localhost)
- ✅ **Email Verification:** Checks participant eligibility before submission
- ✅ **Admin-Only Actions:** Settings and moderation require admin role
- ✅ **Rate Limiting:** Built into Supabase (configurable in dashboard)

---

## 🎨 Admin Panel Features

### Overview Tab
- Contest settings (enable/disable, dates, limits)
- Quick stats (participants, submissions, ratings)
- Contest status indicators

### Participants Tab
- CSV import with preview
- Manual add/edit/delete
- Verification status
- Bulk actions

### Submissions Tab
- All submissions with preview
- Moderation actions (hide/delete)
- Rating statistics
- Filter and search

### Ratings Tab
- All ratings with reviewer info
- Flag inappropriate ratings
- Delete ratings if needed

### Leaderboard Tab
- Real-time rankings
- Filtering options
- Export to CSV

### Moderation Logs Tab
- Audit trail of all admin actions
- Filterable by admin, action type, date
- JSON details of each action

---

## 📊 Database Schema Overview

### contest_participants
```
id (uuid, pk)
event_id (uuid, fk → events.id)
user_id (uuid, nullable, fk → auth.users.id)
email (text, not null)
full_name (text, not null)
unstop_profile_url (text, nullable)
is_verified (boolean, default false)
created_at (timestamptz)
```

### contest_submissions
```
id (uuid, pk)
event_id (uuid, fk)
participant_id (uuid, fk → contest_participants.id)
website_url (text, not null)
description (text, nullable)
tech_stack (text[], nullable)
avg_rating (numeric, default 0) -- auto-calculated
rating_count (integer, default 0) -- auto-calculated
is_hidden (boolean, default false)
submitted_at (timestamptz, immutable)
```

### contest_ratings
```
id (uuid, pk)
submission_id (uuid, fk → contest_submissions.id)
reviewer_id (uuid, fk → contest_participants.id)
rating (integer, 1-5)
feedback (text, nullable)
created_at (timestamptz)
UNIQUE (submission_id, reviewer_id)
```

### contest_settings
```
id (uuid, pk)
contest_name (text)
is_enabled (boolean)
submission_start (timestamptz)
submission_end (timestamptz)
rating_start (timestamptz)
rating_end (timestamptz)
max_submissions_per_user (integer)
min_ratings_per_submission (integer)
max_ratings_per_submission (integer)
allow_external_participants (boolean)
prizes (jsonb)
rules (text)
```

---

## 🐛 Troubleshooting

### Issue: "Migration failed - syntax error"
**Solution:** Make sure you copied the **SQL content only** from the migration files. Do NOT copy:
- Comment lines starting with `#` or `--`
- Instructions in comments
- File paths

Just copy the SQL statements (CREATE TABLE, CREATE INDEX, etc.)

---

### Issue: "Table already exists"
**Solution:** Migration was already run. Skip to the next one.

To check what migrations have been run:
```sql
SELECT * FROM supabase_migrations.schema_migrations 
WHERE version LIKE '20260917%'
ORDER BY version;
```

---

### Issue: "ContestAdmin component not found"
**Solution:** File should exist at `src/components/admin/ContestAdmin.tsx`. If missing, check git status or re-clone.

---

### Issue: "Permission denied" when accessing /admin
**Solution:** 
1. Check your user has admin role:
```sql
SELECT * FROM user_roles WHERE user_id = 'your-user-id';
```

2. Add admin role if missing:
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('your-user-id', 'admin');
```

---

### Issue: "Contest tab not showing in Admin"
**Solution:** 
1. Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
2. Check browser console for errors
3. Verify `Trophy` icon imported in `Admin.tsx`
4. Verify build completed successfully

---

### Issue: Ratings not updating submission averages
**Solution:** Check if trigger exists:
```sql
SELECT trigger_name, event_manipulation 
FROM information_schema.triggers 
WHERE trigger_name = 'recalculate_submission_rating_stats_trigger';
```

If missing, re-run migration 20260917000002.

---

### Issue: Users can rate their own submissions
**Solution:** Check if trigger exists:
```sql
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name = 'prevent_self_rating_trigger';
```

If missing, re-run migration 20260917000002.

---

## 📁 File Locations Reference

### Migrations
```
supabase/migrations/
├── 20260917000000_contest_participants.sql
├── 20260917000001_contest_submissions.sql
├── 20260917000002_contest_ratings.sql
├── 20260917000003_contest_settings.sql
└── 20260917000004_contest_views_rpcs.sql
```

### Services
```
src/
├── services/
│   └── contest.ts (all contest CRUD operations)
└── lib/
    └── urlValidation.ts (URL validation)
```

### Hooks
```
src/hooks/
└── useContest.ts (15+ React Query hooks)
```

### Public UI
```
src/components/contest/
├── ContestEvent.tsx (main page)
├── ContestHeader.tsx
├── ParticipantVerification.tsx
├── SubmissionForm.tsx
├── SubmissionCard.tsx
├── SubmissionGrid.tsx
└── Leaderboard.tsx
```

### Admin UI
```
src/components/admin/
├── ContestAdmin.tsx (main panel)
├── ContestOverview.tsx
├── ContestParticipants.tsx
└── ContestSubmissions.tsx
```

### Dashboard Widget
```
src/components/dashboard/
└── ContestSection.tsx
```

### Modified Files
```
src/
├── pages/
│   ├── Admin.tsx (added Contest tab)
│   └── EventDetail.tsx (contest detection)
├── types/
│   └── index.ts (extended ClubEvent)
└── services/
    └── events.ts (added contest fields)
```

---

## 🎯 Next Steps After Deployment

1. **Test with real users** - Get a small group to test the flow
2. **Monitor performance** - Check Supabase dashboard for slow queries
3. **Set up backups** - Configure Supabase backups in dashboard
4. **Add analytics** - Track submissions and engagement
5. **Customize prizes** - Update contest settings for your event
6. **Promote the contest** - Share event link on social media

---

## 📝 CSV Import Format

Your Unstop export CSV should look like:

```csv
Participant Name,Email,Unstop Profile URL
John Doe,john@example.com,https://unstop.com/u/johndoe
Jane Smith,jane@example.com,https://unstop.com/u/janesmith
```

**Supported column name variations:**
- Name: `Participant Name`, `Full Name`, `Name`
- Email: `Email`, `Email Address`
- Unstop URL: `Unstop Profile URL`, `Profile URL`

The system will auto-detect column names (case-insensitive).

---

## ✅ Deployment Checklist

### Database
- [ ] All 5 migrations run successfully
- [ ] All tables visible in Supabase dashboard
- [ ] All 3 RPCs created
- [ ] `contest_leaderboard` view created
- [ ] RLS policies enabled on all tables

### Application
- [ ] Dependencies installed
- [ ] Build passes
- [ ] `.env.local` configured
- [ ] Dev server starts
- [ ] Admin panel accessible
- [ ] Contest tab visible

### Configuration
- [ ] Contest settings configured
- [ ] Participants imported
- [ ] Event marked as contest type
- [ ] Dates set correctly

### Testing
- [ ] Admin can access contest panel
- [ ] Participant verification works
- [ ] Submission form works
- [ ] Rating system works
- [ ] Leaderboard updates
- [ ] Self-rating is blocked

---

## 🎉 Success!

If all checkboxes are ticked, your Vibe Coding Contest is ready! 

Visit your contest event page and start accepting submissions! 🚀

---

## 📞 Support

If you encounter issues:
1. Check the Troubleshooting section above
2. Review browser console for errors
3. Check Supabase logs for database errors
4. Verify RLS policies are not blocking expected access

---

**Last Updated:** October 14, 2026
**Version:** 1.0.0
