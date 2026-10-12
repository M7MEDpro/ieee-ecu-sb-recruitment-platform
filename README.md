# IEEE ECU Student Branch — Recruitment & Interview Governance Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)

An enterprise-grade, high-concurrency recruitment, scheduling, and interview governance platform engineered specifically for **IEEE ECU Student Branch (Egyptian Chinese University)**.

---

## 🌟 Key Architectural Capabilities

### 1. Public Applicant Portal (`apps/applicant`)
- **Strict Validation Rules**: Enforces official IEEE recruitment criteria:
  - Validates **14-digit Egyptian National ID** with century, birth date, governorate code, and checksum verification.
  - Egyptian phone number normalization across all domestic operators (Vodafone, Orange, Etisalat, WE).
  - Committee constraints: Maximum 1 Technical committee and 1 Non-Technical committee.
- **Atomic Submission Ledger**: Concurrency-safe registration with zero data collisions.
- **Instant Printable Digital Receipt**: Clean printable receipt with registration timestamp and candidate verification code.

### 2. Administrative Control Center (`apps/admin`)
- **Executive Dashboard**: Real-time funnel analytics, applicant distributions, and committee quota tracking.
- **Intelligent Autonomous Scheduler**:
  - Automatically matches applicants, committee heads, and HR interviewers.
  - Multi-head conflict resolution for cross-disciplinary candidates (e.g. Software + PR).
  - Configurable interview slots (12m interview + 3m buffer), automatic breaks every 6 consecutive slots, and non-overlapping constraint solver.
- **Dynamic Criteria Studio**: Custom scoring rubrics per committee (Tech, Non-Tech, General) with live preview and category averages.
- **Live Interview Room**: Real-time scoring interface (1-10 scale), evaluator notes, and instant weighted average calculation.
- **WhatsApp & Email Dispatch Studio**:
  - Templated WhatsApp messaging with candidate name and interview slot interpolation.
  - Resend & SMTP transactional email engine with automatic retry queues and comprehensive audit logging.
  - Strict Double-Rejection privacy compliance protecting candidate status confidentiality.
- **Comprehensive Excel Export**: Exports multi-sheet workbooks with applicant dossiers, section averages, rubric details, and committee decisions.

### 3. Shared Library (`packages/shared`)
- Single source of truth for:
  - Canonical IEEE ECU Committees and Branding.
  - Official Egyptian Chinese University Faculties & Academic Levels.
  - Algorithms: Egyptian National ID verification, committee selection rules, head resolution, and phone validation.

---

## 📁 Repository Architecture

```
ieee-ecu-sb-recruitment-platform/
├── apps/
│   ├── admin/                     # Administrative command center & HR portal
│   │   ├── app/                   # Next.js App Router (Dashboard, Scheduling, Criteria, etc.)
│   │   ├── components/            # Reusable UI components & tables
│   │   ├── lib/                   # Database adapter, auth, scheduler, mailer, excel generator
│   │   └── public/                # Static assets & brand logos
│   └── applicant/                 # Public applicant registration portal
│       ├── app/                   # Next.js App Router (Apply, Success receipt)
│       ├── components/            # Multi-step application form & team explainer
│       └── lib/                   # High-concurrency submission handler
├── packages/
│   └── shared/                    # Monorepo shared utilities, types, and constants
│       ├── src/constants/         # Branding, ECU faculties, committee definitions
│       ├── src/types/             # Canonical TypeScript domain types
│       └── src/utils/             # National ID validator, name parser, scheduler algorithms
├── scripts/                       # Automated test runners and verification scripts
├── supabase/                      # PostgreSQL schemas, migrations, and seed scripts
│   ├── complete_setup.sql         # One-shot database recreation script
│   ├── schema.sql                 # Canonical database schema definitions
│   └── seed.sql                   # Initial committee, admin, and criteria seed data
└── tests/                         # Autonomous test suite (63 unit and logic verification tests)
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `>= 18.17.0`
- **npm**: `>= 9.0.0`
- A free **[Supabase](https://supabase.com/)** project (or local PostgreSQL)

### 1. Installation
Clone the repository and install dependencies from the monorepo root:

```bash
git clone https://github.com/your-org/ieee-ecu-sb-recruitment-platform.git
cd ieee-ecu-sb-recruitment-platform
npm install
```

### 2. Configure Environment Variables
Copy the example environment files:

```bash
# Root
cp .env.example .env.local

# Admin portal
cp apps/admin/.env.example apps/admin/.env.local

# Applicant portal
cp apps/applicant/.env.example apps/applicant/.env.local
```

Update the credentials in `apps/admin/.env.local` and `apps/applicant/.env.local` with your Supabase project URL, Anon Key, and Service Role Key.

### 3. Database Setup
Execute the SQL schema in your Supabase SQL Editor:
1. Open `supabase/complete_setup.sql` (or run `supabase/schema.sql` followed by `supabase/seed.sql`).
2. Run the script to initialize tables, policies, teams, and default evaluation criteria.

### 4. Running the Development Servers
Run both portals concurrently:

```bash
# Build shared library first
npm run build:shared

# Launch both Applicant (Port 3000) and Admin (Port 3001) portals
npm run dev
```

Or run each portal independently:

```bash
npm run dev:applicant  # http://localhost:3000
npm run dev:admin      # http://localhost:3001
```

---

## 🧪 Testing & Verification

The platform includes a comprehensive test suite covering National ID validation, committee constraints, scheduler algorithms, and layout integrity:

```bash
npm test
```

---

## 📖 Code Documentation & Style Guide

This codebase strictly adheres to **Doxygen / JSDoc standards**:
- Every source file begins with an authoritative `/** @file ... @brief ... @author ... */` block.
- All exported functions, components, API route handlers, and utility methods include descriptive `@param` and `@return` annotations.
- Pure English comments across all modules for international open-source maintenance.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — see the LICENSE file for details.
