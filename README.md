<div align="center">

# ⚡ DataFusion BI

**Next-Generation Embedded Business Intelligence & In-Process Analytical Platform**

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![DuckDB](https://img.shields.io/badge/DuckDB-In--Process%20Engine-FFF000?style=for-the-badge&logo=duckdb&logoColor=black)](https://duckdb.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Multi--Tenant%20RLS-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<p align="center">
  <b>Upload Excel / CSV · Connect PostgreSQL · Infer Joins · Compute In-Memory KPIs · Interactive Dashboards · Automated Insights</b>
</p>

[Explore Features](#-key-features) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [Tech Stack](#-tech-stack) • [Roadmap](#-engineering-guarantees)

---

</div>

## 💡 Overview

**DataFusion BI** is a high-performance, full-stack Business Intelligence platform that consolidates disparate data sources into actionable, interactive dashboards in seconds. Powered by an embedded **DuckDB columnar vectorized engine**, DataFusion BI executes complex analytical queries and aggregations over millions of rows in-process without requiring heavy cloud data warehouses or external OLAP clusters.

> **The Core Guarantee:** Zero mock figures, zero synthetic charts. Every KPI, visual aggregation, and statistical insight is computed deterministically from real underlying rows with full lineage and traceability.

---

## ✨ Key Features

<table>
  <tr>
    <td width="50%">
      <h3>⚡ DuckDB In-Process Engine</h3>
      <p>Vectorized, columnar analytical execution directly inside the application runtime. Execute sub-second aggregations, group-bys, and transforms over 1M+ rows staged as zero-copy Parquet files.</p>
    </td>
    <td width="50%">
      <h3>📂 Multi-Source Ingestion</h3>
      <p>Seamlessly ingest multi-sheet <b>Excel (.xlsx)</b>, <b>CSV</b>, <b>Parquet</b>, and live <b>PostgreSQL</b> databases with automated schema validation and column profiling.</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🧠 Automated Schema & Join Inference</h3>
      <p>Intelligent relationship discovery algorithms analyze foreign-key candidates, cardinality ratios, and name similarities to suggest automated multi-table joins.</p>
    </td>
    <td width="50%">
      <h3>📊 Smart KPI & Chart Recommender</h3>
      <p>Statistical distribution analysis automatically detects optimal visualization types (Time-series, Distributions, Categorical break-downs) and computes core business metrics.</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🛡️ Enterprise Multi-Tenancy</h3>
      <p>Complete multi-tenant isolation powered by <b>PostgreSQL Row-Level Security (RLS)</b>, cryptographic Argon2id password hashing, and role-based access control (RBAC).</p>
    </td>
    <td width="50%">
      <h3>🎨 Modern Ergonomic UI</h3>
      <p>Crafted with Next.js 15 App Router, Tailwind CSS, Radix UI primitives, dynamic Dark/Light themes, and WCAG AA compliant data visualization palettes.</p>
    </td>
  </tr>
</table>

---

## 🏗️ Architecture

DataFusion BI combines transactional PostgreSQL storage for tenant metadata with high-performance, ephemeral columnar storage for analytical processing:

```mermaid
flowchart TD
    subgraph Ingestion [" 📥 Ingestion & Staging "]
        F1["📁 Excel (.xlsx) / CSV / Parquet"] --> S1["Fast File Parser"]
        F2["🐘 PostgreSQL Database"] --> S2["Table Stream Ingest"]
        S1 --> P1["Parquet Staging Store"]
        S2 --> P1
    end

    subgraph Engine [" ⚡ DuckDB Analytics Engine "]
        P1 --> D1["DuckDB In-Process Instance"]
        D1 --> A1["Data Profiler & Type Inferrer"]
        D1 --> A2["Join & Relationship Engine"]
        D1 --> A3["Consolidation & Transforms"]
        D1 --> A4["KPI & Metric Evaluator"]
        D1 --> A5["Automated Chart Recommender"]
    end

    subgraph Backend [" 🔒 Multi-Tenant App Core "]
        PG[("🐘 PostgreSQL (RLS)")] <--> Drizzle["Drizzle ORM"]
        Drizzle <--> Auth["Session & Org Context"]
        Auth <--> API["Next.js 15 App Router API"]
    end

    subgraph Frontend [" 🖥️ Interactive Presentation "]
        API --> UI["Tailwind & Radix UI Platform"]
        UI --> D_Dash["📊 Dynamic Recharts Dashboards"]
        UI --> D_Prep["🧹 Data Prep & Transformation Studio"]
        UI --> D_Ins["🔍 Automated Anomaly & Insights Hub"]
        UI --> D_Exp["📥 Export (CSV, Parquet, Excel, PDF)"]
    end

    Engine --> API
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Framework** | [Next.js 15 (App Router)](https://nextjs.org/) + [React 19](https://react.dev/) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) (Strict Mode) |
| **Analytical Engine** | [DuckDB Node API](https://duckdb.org/) (Embedded Columnar SQL Engine) |
| **Relational Database** | [PostgreSQL 16](https://www.postgresql.org/) with native **Row-Level Security (RLS)** |
| **ORM & Migrations** | [Drizzle ORM](https://orm.drizzle.team/) + `drizzle-kit` |
| **Styling & Design System** | [Tailwind CSS](https://tailwindcss.com/), Radix UI, Lucide Icons, `next-themes` |
| **Visualizations** | [Recharts](https://recharts.org/) with custom accessibility-validated color palettes |
| **File Processing** | [ExcelJS](https://github.com/exceljs/exceljs), Apache Parquet Staging |
| **Security & Auth** | Argon2id password hashing, HTTP-only secure cookie sessions, tenant context guards |
| **Testing & Quality** | [Playwright](https://playwright.dev/) End-to-End Test Suite, ESLint 9 |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `>= 20.11.0`
- **npm** or **pnpm** / **yarn**
- **PostgreSQL** or **Docker** (optional, self-contained scripts included)

---

### 1. Clone the Repository
```bash
git clone https://github.com/ashwin777-ctrl/DataFusion-BI.git
cd DataFusion-BI
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory (or copy from `.env.example`):
```bash
cp .env.example .env
```

Ensure your database connection string and session secrets are set:
```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/bi_platform
SESSION_SECRET=your_32_character_super_secret_key_here
NODE_ENV=development
```

### 4. Database Setup & Migrations
Initialize and run the database migrations:
```bash
# Run Drizzle migrations
npm run db:migrate

# (Optional) Seed sample data fixtures
npm run db:bootstrap
```

### 5. Start the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to start exploring!

---

## 📁 Repository Structure

```
├── docker/                  # Docker configuration & PostgreSQL initialization
├── scripts/                 # Database bootstrap, migration & verification scripts
├── src/
│   ├── app/
│   │   ├── (app)/           # Authenticated application shell & pages
│   │   │   ├── app/         # Dashboard, Sources, Data Prep, Insights & Reports
│   │   │   └── onboarding/  # Organization onboarding flow
│   │   ├── (auth)/          # Authentication pages (Login, Signup)
│   │   └── api/             # REST API endpoints (Sources, Datasets, KPIs, Export)
│   ├── components/
│   │   └── ui/              # Radix + Tailwind design system components
│   ├── lib/
│   │   ├── auth/            # Password hashing, token management & session guards
│   │   ├── db/              # Drizzle ORM schema, migrations & RLS policies
│   │   ├── engine/          # DuckDB analytical core:
│   │   │   ├── duckdb.ts            # In-process connection pool & query runner
│   │   │   ├── ingest-file.ts       # CSV / Excel / Parquet ingestion
│   │   │   ├── ingest-postgres.ts   # Live PostgreSQL stream extraction
│   │   │   ├── profile.ts           # Type inference & statistical profiling
│   │   │   ├── relationships.ts     # Automated join key discovery
│   │   │   ├── kpi-engine.ts        # Automated KPI calculations
│   │   │   ├── insights.ts          # Anomaly detection & distribution insights
│   │   │   └── export.ts            # High-speed data export generator
│   │   └── utils.ts         # Shared styling and formatting utilities
└── tailwind.config.ts       # Design token system & chart palettes
```

---

## 🎯 Engineering Guarantees

- **No Data Hallucination**: No random numbers or placeholder data. If a dataset has 14,210 rows, metrics reflect exactly 14,210 rows.
- **Tenant Isolation**: Row-Level Security guarantees cross-tenant data leaks are physically blocked at the database engine level.
- **In-Memory Analytical Speed**: Query performance avoids round-trips to traditional slow disk-bound relational databases for aggregations.
- **Accessible & Responsive**: Contrast-ratio verified color schemes (WCAG AA compliant) with complete dark/light mode parity.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
  <b>Built with precision using Next.js 15 & DuckDB</b>
</div>
