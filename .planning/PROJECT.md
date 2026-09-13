# PROJECT — Unstop Igniters Club (UIC) Website

> Initialized by `/gsd-onboard --fast` on 2026-09-14

## Project Summary

A full-featured web platform for the **Unstop Igniters Club**, a college student community focused on competitions, hackathons, and professional development through [Unstop](https://unstop.com/). The site manages events, team showcasing, photo galleries, member dashboards, certificate issuance with QR verification, attendance tracking, and role-based admin operations.

## Repository

- **Origin**: `https://github.com/Revanth-Boina/UIC-main.git`
- **License**: MIT

## Tech Stack

| Layer        | Technology                                                       |
| ------------ | ---------------------------------------------------------------- |
| Frontend     | React 18, TypeScript, Vite (SWC)                                |
| UI           | shadcn/ui (Radix primitives), Tailwind CSS 3, Framer Motion     |
| State        | React Query v5                                                   |
| Routing      | React Router DOM v6                                              |
| Backend/DB   | Supabase (PostgreSQL, Auth, Storage, RLS, RPC)                   |
| Auth         | Google OAuth via Supabase                                        |
| SEO          | react-helmet-async, JSON-LD structured data                     |
| Analytics    | Vercel Web Analytics                                             |
| Deployment   | Vercel (SPA)                                                     |

## Core Features

1. **Event Management** — Create, publish, manage upcoming/past events with Unstop registration links
2. **Member Dashboard** — Personal portal with profile, registered events, attendance, certificates, and progress tracking
3. **Certificate System** — Issue, revoke, restore certificates per event; QR code verification (camera + public URL)
4. **Attendance Tracking** — One-time attendance codes redeemed at venues; source of truth for "attended" status
5. **Dynamic Gallery** — Photo/video albums from past events with masonry layout and lightbox
6. **Team Directory** — Active members with roles, bios, social profiles, and skills
7. **Role-Based Admin** — Tabbed admin dashboard (`super_admin`, `admin`, `member` roles) with DB-level super admin protection
8. **Dynamic Site Settings** — Community counters, social links, contact info updatable from admin
9. **SEO** — Per-page meta tags, Open Graph, Twitter cards, sitemap.xml, robots.txt, JSON-LD
10. **Contact Form** — Public contact page with message storage and admin read tracking

## Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Supabase over custom backend | Rapid development with built-in auth, RLS, storage |
| 2 | Google-only OAuth | Club members primarily use Google accounts (college ecosystem) |
| 3 | shadcn/ui over Material UI | Composable primitives, Tailwind-native, smaller bundle |
| 4 | React Query over Redux | Server state pattern fits data-fetching-heavy app |
| 5 | Monolithic Admin.tsx | Initially fast; now a maintenance concern |
| 6 | Certificate verification via RPC | SECURITY DEFINER function ensures no data leakage |
| 7 | Vercel deployment | Free tier, good DX, automatic preview deployments |

## Conventions

- **Path alias**: `@/` maps to `./src`
- **Domain types**: All in `src/types/index.ts`, decoupled from Supabase row shapes
- **Services pattern**: One file per domain area in `src/services/`, maps DB rows → types
- **Component organization**: By feature domain (`admin/`, `dashboard/`, `certificates/`, etc.)
- **No tests**: Currently zero test coverage

## Stakeholders

- **Maintainer(s)**: Revanth Boina (original author), contributors via PR
- **Users**: UIC club members, event attendees, club administrators
