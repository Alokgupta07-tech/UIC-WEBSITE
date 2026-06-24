# Unstop Igniters Club (UIC) Website

Welcome to the official web platform for the **Unstop Igniters Club**! This platform is built to manage our community events, showcase our team, maintain a dynamic photo gallery, and engage with our members.

## 🚀 Features

- **Event Management:** Create, publish, and manage upcoming and past events. Includes integration with Unstop registration links.
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
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

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
