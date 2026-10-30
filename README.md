# Unstop Igniters Club (UIC) Website

Welcome to the official web platform for the **Unstop Igniters Club**! This platform is built to manage our community events, showcase our team, maintain a dynamic photo gallery, and engage with our members.

## 🚀 Features

- **Event Management:** Create, publish, and manage upcoming and past events. Includes integration with Unstop registration links.
- **Member Dashboard:** Personal portal at `/dashboard` showing the signed-in member's profile, registered and past events, recorded attendance, certificates, and an activity progress summary.
- **Certificate QR Verification:** Members scan the QR code printed on a physical UIC certificate with their camera (or upload a photo of it) to confirm authenticity and view the full verification record.
- **Public Certificate Verification:** Anyone with a certificate's link can verify it at `/verify/certificate/:token` without signing in. The page exposes only the details already printed on the certificate.
- **Certificate Administration:** Issue certificates per event (individually or for everyone who redeemed an attendance code), revoke or restore them, export CSV, and download the printable QR code.
- **Dynamic Gallery:** Showcase photos and memories from past club events.
- **Team Directory:** Display active team members, their roles, and social profiles.
- **Role-Based Access Control (RBAC):** Secure admin dashboard with varying levels of permissions (`super_admin`, `admin`, `member`).
- **Super Admin Protection:** Database-level security ensuring the club owner account is permanently protected and cannot be tampered with.
- **Dynamic Site Settings:** Update community counters, contact information, and social links directly from the admin dashboard.

## 🛠️ Tech Stack

- **Frontend:** React (Vite), TypeScript
- **Styling:** Tailwind CSS, shadcn/ui
- **State Management:** React Query (@tanstack/react-query)
- **Backend & Database:** Supabase (PostgreSQL, Auth, Storage)
- **Routing:** React Router DOM
- **Icons:** Lucide React

## 🔒 Security & Environment Variables

For security reasons, sensitive information like database credentials and API keys must **never** be committed to the repository. 

To run this project locally, create a `.env` file in the root directory and add your own Supabase configuration:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

# Public site URL, no trailing slash. Used for canonical URLs and for the
# certificate verification links encoded into certificate QR codes, so this
# must be correct in production.
VITE_SITE_URL=https://your-domain.com
```

See `.env.example` for the full list.

*Note: Never share your `.env` file or commit it to GitHub. Make sure `.env` is included in your `.gitignore` file.*

## 💻 Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Revanth-Boina/UIC-main.git
   cd UIC-main
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Supabase Database:**
   - Create a new project on [Supabase](https://supabase.com/).
   - Go to the SQL Editor in your Supabase dashboard and run the SQL migration files provided in the `supabase/migrations/` folder. This will set up your tables, Row Level Security (RLS) policies, and database triggers.
   - Add your Supabase URL and Anon Key to your `.env` file.

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:8080` (or the port specified by your terminal).

## 🎓 Certificates & QR Verification

The certificate system migrations are `supabase/migrations/20260913000000_certificates.sql`, `supabase/migrations/20261028000000_certificate_management.sql`, `supabase/migrations/20261029000000_certificate_download_counter.sql`, and `supabase/migrations/20261030000000_certificate_recipient_category.sql`, in that order. Run any unapplied migrations in the Supabase SQL Editor before issuing certificates. The category migration adds admin-reviewed participant and contributor classification to the issue and verification flows. Existing certificates are left unclassified for administrator review. If PostgREST reports a missing certificate column (often `PGRST204`), apply the relevant migration and refresh the schema cache from Supabase **Project Settings → API** (or run `NOTIFY pgrst, 'reload schema';` as a database owner).

Official certificate signature PNGs are bundled under `public/assets/certificates/signatures/` and loaded through the shared signatory configuration. The preview, print view, downloadable PDFs, and email PDF attachments use these same assets. Missing signature files block issuing or generating signed PDFs rather than substituting typed text.

Certificate email delivery requires a configured Resend account authorized to send from `club.igniter@srmap.edu.in`. Set Edge Function secrets `RESEND_API_KEY`, `SENDER_EMAIL=club.igniter@srmap.edu.in`, and `SITE_URL` to the deployed site origin, then deploy with `supabase functions deploy send-certificate-email`. The function checks admin access, resolves the recipient from the stored certificate, reserves the record against concurrent sends, attaches a generated signed PDF, and records provider acceptance or failure. Test delivery goes only to the explicitly entered test address. Before live sending, verify the sender/domain with the provider and institutional IT. Use only the SPF/DKIM/DMARC values generated for the verified domain. The provider acceptance state is not delivery confirmation; this project does not currently process delivery webhooks.

Bulk Distribution currently sends personalized messages sequentially while the Admin page remains open. Failed recipients can be retried individually; accepted messages are excluded. A durable background campaign queue, delivery webhooks, and automatic retry processing are not implemented yet. Do not treat the live-send button as a queue that continues after the browser closes.

How it works:

1. **Issue** — an admin opens **Admin → Certificates**, picks an event, and issues certificates. The Faculty Coordinator signature is on the left; Revanth Boina, President, is on the right. Their printed names, role labels, and PNG assets come from one shared configuration. The certificate number (`UIC-YYYY-NNNNN`) and opaque verification token are generated by the database.
2. **Print** — the downloadable landscape PDF includes both transparent signature images and its verification QR code. The QR encodes `https://<VITE_SITE_URL>/verify/certificate/<token>`.
3. **Verify** — scanning the code opens the public verification page, or a signed-in member can scan it from **Dashboard → Scan Certificate** using their camera or an uploaded photo.

Security notes:

- Event name, date and weekday are always read from the linked event record, so a certificate can never drift out of sync with its event. Weekdays are calculated, never stored.
- A member can only read their own certificates; RLS matches on their account id or verified email. Changing an id in the URL cannot expose someone else's private data.
- Public verification runs through a `SECURITY DEFINER` function that returns only the details already printed on the certificate. Recipient emails, account ids and verification tokens are never returned.
- Revoking a certificate keeps the record but makes scans report it as no longer valid, and hides its downloadable file.

Attendance is the source of truth for the dashboard's "Attended" state: it comes from attendance codes redeemed at the venue (or an `attended` flag on a registration). An event simply being in the past is never treated as attendance.

## 🛡️ Admin Access & Initial Setup

The platform uses Supabase Authentication. When setting up a new environment:
1. Sign up through the website.
2. In your Supabase Dashboard, manually assign the `admin` or `super_admin` role to your user in the `user_roles` table to gain access to the Admin Dashboard.
3. Once logged in as a Super Admin, you can use the secure UI to promote other registered users to the Admin role.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a new branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
