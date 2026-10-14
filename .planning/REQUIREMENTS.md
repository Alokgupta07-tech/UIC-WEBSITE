# REQUIREMENTS — UIC Website

> Extracted from existing codebase by `/gsd-onboard --fast` on 2026-09-14

## Functional Requirements (Implemented)

### FR-1: Event Management
- [x] Create events with title, description, dates, venue, category, banner image
- [x] Publish/draft lifecycle
- [x] Unstop registration link integration
- [x] Event detail pages with registration info
- [x] Upcoming/past event filtering

### FR-2: Member Dashboard
- [x] Personal profile with avatar, bio, skills
- [x] Registered events view
- [x] Attendance tracking display
- [x] Certificate listing with detail dialogs
- [x] Activity progress calculation with milestones
- [x] Stat cards (certs, events attended, upcoming, etc.)
- [x] QR certificate scanning from dashboard

### FR-3: Certificate System
- [x] Issue certificates per event (individual or bulk for attendees)
- [x] Auto-generated certificate numbers (`UIC-YYYY-NNNNN`)
- [x] Opaque verification tokens
- [x] Revoke/restore lifecycle
- [x] Public verification page (`/verify/certificate/:token`)
- [x] QR code generation (SVG download)
- [x] Camera-based QR scanning with `jsqr`
- [x] RLS: members see only own certificates
- [x] Public verify RPC returns only printed-on-certificate data

### FR-4: Attendance Tracking
- [x] One-time attendance codes created per event
- [x] Code redemption with participant name/email
- [x] Attendance as source of truth (not event date)
- [x] Bulk code generation
- [x] Delete/pagination in admin

### FR-5: Gallery
- [x] Photo and video uploads
- [x] Album system (per-event or named)
- [x] Masonry grid layout
- [x] Lightbox viewing
- [x] Hover effects

### FR-6: Team Directory
- [x] Member profiles with role, department, bio, social links
- [x] Active/inactive toggle
- [x] Display ordering
- [x] Skills tags

### FR-7: Admin Dashboard
- [x] Tabbed interface for all admin functions
- [x] User management (list, promote, demote)
- [x] Super admin protection (DB-level)
- [x] Event CRUD from admin
- [x] Gallery management from admin
- [x] Team management from admin
- [x] Site settings editing
- [x] Contact messages (read/unread)
- [x] Certificate administration

### FR-8: Authentication & Authorization
- [x] Google OAuth sign-in/sign-out
- [x] Role-based access control (super_admin, admin, member)
- [x] Protected admin route
- [x] Session persistence with auto-refresh

### FR-9: SEO & Analytics
- [x] Per-page title/meta/OG tags
- [x] JSON-LD structured data
- [x] robots.txt + sitemap.xml
- [x] Vercel Web Analytics

### FR-10: Contact
- [x] Public contact form
- [x] Message storage in Supabase
- [x] Admin read tracking

---

## Non-Functional Requirements (Current State)

| Area            | Status     | Notes                                            |
| --------------- | ---------- | ------------------------------------------------ |
| Testing         | ❌ None    | Zero test files                                  |
| CI/CD           | ❌ None    | No GitHub Actions or equivalent                  |
| Error handling  | ⚠️ Partial | Toast notifications but no error boundaries      |
| Accessibility   | ⚠️ Partial | Radix primitives help but no audit done          |
| Performance     | ⚠️ Partial | React Query caching; 82KB Admin page is concern  |
| Security        | ✅ Good    | RLS, SECURITY DEFINER RPC, super admin protection|
| Documentation   | ✅ Good    | Comprehensive README with setup instructions      |

---

## Backlog / Potential Improvements

These are observations from the codebase, not user-requested features:

1. **Split Admin.tsx** — 82KB monolith into separate tab components
2. **Add error boundaries** — Prevent full-app crashes
3. **Add tests** — Unit tests for services, integration tests for key flows
4. **CI/CD pipeline** — GitHub Actions for lint + build + deploy
5. **Remove unused shadcn/ui components** — Reduce bundle size
6. **Accessibility audit** — WCAG compliance pass
7. **Replace placeholder meta tags** — `YOUR_COLLEGE_NAME`, `YOUR_DOMAIN`, `YOUR_TWITTER_HANDLE` in `index.html`
