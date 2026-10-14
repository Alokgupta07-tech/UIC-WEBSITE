# Vibe Coding Contest - Quick Start

## 🚀 5-Minute Deployment

### 1. Deploy Database (2 min)
```bash
# Open Supabase Dashboard → SQL Editor
# Copy & paste these 5 files in order:
supabase/migrations/202609170000*.sql
```

### 2. Build & Verify (1 min)
```bash
npm run build
npx tsc --noEmit
```

### 3. Start Dev Server (30 sec)
```bash
npm run dev
# Visit http://localhost:8080/events
```

### 4. Find Contest Event (30 sec)
- Look for "Vibe Coding Contest" in events list
- Click to open contest page
- Everything should work!

### 5. Test Core Flow (1 min)
1. Sign in as regular user
2. You'll see "Not Registered" status
3. Admin verifies you (or import CSV)
4. Submit website → Rate others → View leaderboard

---

## 📦 What's Already Integrated

✅ **Database**: 5 migrations with triggers and RLS
✅ **Services**: Complete CRUD layer
✅ **Hooks**: React Query for all operations
✅ **Components**: 7 contest UI components
✅ **Pages**: Contest event page (auto-renders for contest events)
✅ **Security**: URL validation, fraud prevention
✅ **Types**: Full TypeScript coverage

---

## ⚡ Key URLs

- **Contest**: `/events/[contest-id]`
- **Dashboard**: `/dashboard` (has contest section)
- **Admin**: `/admin` (needs contest tab)

---

## 🔧 Admin Integration (Optional, 30-60 min)

Create 6 admin components in `src/components/admin/`:

1. `ContestOverview.tsx` - KPIs
2. `ContestParticipants.tsx` - Verification
3. `ContestSubmissions.tsx` - Moderation
4. `ContestRatings.tsx` - Audit
5. `ContestLeaderboardAdmin.tsx` - Results
6. `ContestSettings.tsx` - Lifecycle

Use hooks from `src/hooks/useContest.ts`.

Add tab to `Admin.tsx`:
```typescript
{
  id: "contest",
  label: "Contest",  
  icon: Trophy,
  component: <YourAdminPanel />
}
```

---

## 📊 Admin CSV Import

Upload Unstop CSV with these columns:
- Email: `email`, `participant email`, etc.
- Name: `name`, `full name`, etc.
- Unstop ID: `registration id`, `unstop id`, etc.

System auto-detects headers and links to existing accounts.

---

## 🎯 Contest Lifecycle

1. `draft` → Hidden
2. `published` → Visible
3. `verification_open` → Admin verifies
4. `submissions_open` → Submit websites
5. `submissions_closed` → Deadline passed
6. `ratings_open` → Peer rating
7. `ratings_closed` → Voting closed
8. `results_published` → Winners shown
9. `completed` → Archived

---

## 🐛 Quick Fixes

**Contest not showing?**
- Check event title contains "coding contest"
- Verify `contest_status` field exists

**Can't submit website?**
- Must be verified participant
- Check `is_submissions_open = true`

**Can't rate?**
- Must be verified participant
- Check `is_ratings_open = true`
- Can't rate own submission

**Leaderboard empty?**
- Need ≥1 approved submission with ratings
- Check `is_leaderboard_published = true`

---

## 📝 Files Reference

```
Database: supabase/migrations/202609170000*.sql (5 files)
Services: src/services/contest.ts
Hooks: src/hooks/useContest.ts
Page: src/pages/ContestEvent.tsx
Types: src/types/index.ts
Components: src/components/contest/*.tsx (7 files)
```

---

## ✅ Verification Checklist

- [ ] Migrations deployed successfully
- [ ] `npm run build` passes
- [ ] Contest event appears in events list
- [ ] Contest page loads without errors
- [ ] Can view gallery (empty is OK)
- [ ] Leaderboard section visible
- [ ] Dashboard shows contest section
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

## 🎉 You're Ready!

Everything core is working. Admin dashboard is optional polish.

See `CONTEST_DEPLOYMENT_GUIDE.md` for detailed instructions.
