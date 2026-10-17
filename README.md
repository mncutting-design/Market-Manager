# Market Manager (মার্কেট ম্যানেজার) 🏢
### Production-Ready Bilingual (English / বাংলা) Rental Market & Property Management Platform

**Market Manager** is a full-stack, mobile-first and desktop-optimized web application engineered for commercial property owners to seamlessly manage rental markets, shop allocations, tenant records, rent invoicing, utility collections, overdue tracking with aging, maintenance expenses, and profit analytics.

---

## 🌟 Key Highlights & Architecture

### 1. 🌐 Instant Bilingual Localization (English & বাংলা)
- **Zero-Reload Dynamic Toggle**: Switch seamlessly between **English** and **বাংলা** via the top navigation bar. Every single UI element, badge, chart tooltip, modal, toast, and report translates instantaneously.
- **Natural Language Parsing**: Idiomatic Bangla phrases with natural pluralization and interpolation (e.g. `{total}টি দোকানের মধ্যে {paid}টি পরিশোধ করেছে`).
- **Typography & Font**: Built using **Anek Bangla** Google Font via `next/font` with `bengali` and `latin` subsets and `line-height: 1.6` for Bengali vertical clearance.
- **Digit Normalization & Mixed Input**: Shared `<NumberInput>` accepts both Bangla (`০১২৩৪৫৬৭৮৯`) and Latin (`0123456789`) digits on any keyboard, automatically normalizing them for calculations while rendering them in the active language.
- **Bilingual Search**: Searching `০১` finds shop `01`, and searching `01` finds shop `০১`.
- **Translation Parity Check**: Built-in verification script (`npm run verify-i18n`) ensuring 100% key symmetry between `messages/en.json` and `messages/bn.json`.

### 2. 💰 Currency & High-Precision Money Handling
- **Bangladeshi Taka (৳)**: Formatted according to the Indian/Subcontinent numbering system (e.g. `৳ ১,২৫,০০০` or `৳ 1,25,000`).
- **Integer Paisa Storage**: Stored strictly as integers in paisa (`1 BDT = 100 paisa`) to prevent floating-point rounding errors.

### 3. 📱 Mobile-First & Desktop-Optimized UX
- **Mobile**: Fixed bottom tab navigation (Dashboard, Rent, Expenses, Reports, More), card-based layout instead of overflowing wide tables, floating action button (FAB) for quick add, bottom sheets for forms, and minimum 44px touch targets.
- **Desktop**: Collapsible left sidebar with Lucide React icons, sticky top bar with global market filter, month/year selector, and language toggle.
- **Light & Dark Mode**: Semantic color scheme with teal primary accent (`#0d9488` / `#14b8a6`) and dark mode support.

---

## 📦 Tech Stack

- **Framework**: [Next.js 14+](https://nextjs.org) (App Router, Turbopack, Server Actions & Route Handlers)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS, CSS variables, glassmorphism headers, responsive print stylesheets
- **UI Components**: shadcn-inspired modular components (Card, Dialog, Sheet, Select, Tabs, Badge, Button, Input, NumberInput, Skeleton, Sonner Toaster)
- **Icons**: [Lucide React](https://lucide.dev)
- **Charts**: [Recharts](https://recharts.org) (Monthly Income vs Expense bar charts, Net Profit trend lines, and Category expense distributions)
- **Database & ORM**: PostgreSQL-ready schema with [Prisma ORM](https://www.prisma.io) (SQLite out-of-the-box for local development)
- **Authentication**: Credentials authentication with bcrypt password hashing and HTTP-only session cookies
- **Exports**: Excel (XLSX via `xlsx` with raw numeric cells) and printable receipts / PDF reports

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js 18.x or 20.x+ (tested on Node v24)
- npm or pnpm

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd "RENT PRO"
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="market-manager-secret-key-super-secure-2026"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Database Migration & Seed
Run Prisma to create the SQLite database and seed initial test data (3 markets, 60 shops, 56 tenants, bills, payments, and maintenance expenses):
```bash
npx prisma db push
npm run seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Demo Admin Credentials
- **Email**: `admin@marketmanager.com`
- **Password**: `admin123`
*(A quick one-click autofill button is also provided on the login page)*

---

## ⚙️ How to Add a New Translation Key

To maintain strict bilingual parity across English and Bangla:

1. Add the new key to `messages/en.json`:
   ```json
   {
     "dashboard": {
       "myNewKey": "Hello {name}"
     }
   }
   ```
2. Add the exact matching key to `messages/bn.json`:
   ```json
   {
     "dashboard": {
       "myNewKey": "স্বাগতম {name}"
     }
   }
   ```
3. Run the automated parity test:
   ```bash
   npm run verify-i18n
   ```
   If a key is missing in either file, the script will output the exact missing keys and exit with an error code.

4. In your React component, consume the key:
   ```tsx
   import { useTranslation } from "@/lib/i18n";
   const { t } = useTranslation();
   return <p>{t("dashboard.myNewKey", { name: "করিম" })}</p>;
   ```

---

## ☁️ Deployment Guide (Vercel + Supabase or Neon PostgreSQL)

### Step 1: Create a PostgreSQL Database
1. Create a free PostgreSQL database on [Supabase](https://supabase.com) or [Neon](https://neon.tech).
2. Copy your connection URI (e.g. `postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres?pgbouncer=true`).

### Step 2: Switch Prisma Provider to PostgreSQL
In `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Step 3: Configure Vercel Project
1. Push your repository to GitHub.
2. In Vercel, import the project.
3. Add Environment Variables:
   - `DATABASE_URL`: Your Supabase/Neon PostgreSQL connection string.
   - `AUTH_SECRET`: A secure 32+ character random secret.
4. Set Build Command:
   ```bash
   npx prisma generate && npx prisma db push && npm run build
   ```
5. Deploy! Once deployed, execute `npm run seed` or run it from your local terminal pointing to the production `DATABASE_URL` to seed your initial markets and charge types.

---

## 📄 License
MIT License. Built with ❤️ for property owners and market managers.
