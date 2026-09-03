<div align="center">

# ⚡ DataFusion BI

**Enterprise Embedded Business Intelligence, In-Process DuckDB OLAP & 3D Spatial Data Universe**

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![DuckDB](https://img.shields.io/badge/DuckDB-v1.3%20OLAP-FFF000?style=for-the-badge&logo=duckdb&logoColor=black)](https://duckdb.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20RLS-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Three.js](https://img.shields.io/badge/Three.js-3D%20Spatial-000000?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<p align="center">
  <b>Multi-Source Ingestion (PostgreSQL 16 & Excel/CSV) · In-Process DuckDB Vectorized Aggregations · Automated Join Inference · 3D Schema Universe · Pitch-Black OLED Visuals</b>
</p>

[Explore Features](#-key-features) • [System Architecture](#-system-architecture) • [Getting Started](#-getting-started) • [Default Credentials](#-default-credentials) • [Port Configuration](#-port-configuration--troubleshooting) • [Verification](#-qa--verification-suite)

---

</div>

## 💡 Overview

**DataFusion BI** is a high-performance, full-stack Business Intelligence suite that transforms disparate spreadsheets and enterprise databases into real-time, interactive analytical workspaces. Powered by an embedded **DuckDB columnar vectorized engine**, DataFusion executes complex analytical queries, group-bys, and metric evaluations over millions of rows in-process without requiring heavy cloud data warehouses or external OLAP clusters.

> **The Zero-Hallucination Guarantee:** Zero mock figures, zero synthetic charts. Every KPI, visual aggregation, and statistical insight is computed deterministically from real underlying rows with full lineage and traceability.

---

## ✨ Key Features

<table>
  <tr>
    <td width="50%">
      <h3>⚡ DuckDB In-Process Vectorized OLAP</h3>
      <p>Vectorized, columnar analytical execution directly inside the application process. Sub-millisecond aggregations and filter operations over zero-copy Parquet partitions with full DuckDB v1.3 SQL support.</p>
    </td>
    <td width="50%">
      <h3>🌐 3D Spatial Data Topology & Universe</h3>
      <p>Interactive Three.js 3D force-directed node graph visualizing tables, column types, foreign-key linkages, and live pipeline sync velocities in immersive 3D space.</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>📂 Multi-Source Ingestion & Live Connectors</h3>
      <p>Seamlessly ingest multi-sheet <b>Excel (.xlsx, .xls)</b>, <b>CSV</b>, and live <b>PostgreSQL 16</b> databases with automated schema validation, type inference, and dirty-data sanitization.</p>
    </td>
    <td width="50%">
      <h3>🧠 Automated Schema & Join Inference</h3>
      <p>Intelligent relationship discovery algorithms analyze foreign-key candidates, cardinality ratios, and name similarities to synthesize clean multi-table relational star schemas.</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🛡️ Cryptographic Multi-Tenant RLS</h3>
      <p>Physical tenant data isolation powered by <b>PostgreSQL Row-Level Security (RLS)</b>, argon2id password hashing, HTTP-only authenticated cookie sessions, and fail-closed tenant guards.</p>
    </td>
    <td width="50%">
      <h3>🖤 Pitch-Black OLED High-Contrast Aesthetic</h3>
      <p>Pure OLED black canvas (<code>#000000</code>), specular micro-borders (<code>rgba(255,255,255,0.10)</code>), glassmorphic carbon cards, and zero-blue wash for an enterprise mission-control feel.</p>
    </td>
  </tr>
</table>

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Ingestion [" 📥 Ingestion Layer "]
        F1["📁 Excel (.xlsx) / CSV Files"] --> S1["Fast Stream Parser"]
        F2["🐘 PostgreSQL 16 (Port 5434)"] --> S2["Direct Table Stream Ingest"]
        S1 --> P1["Parquet Tenant Staging Store"]
        S2 --> P1
    end

    subgraph Analytics [" ⚡ DuckDB In-Process Engine "]
        P1 --> D1["DuckDB In-Process Instance"]
        D1 --> A1["Schema Discovery & Type Inferrer"]
        D1 --> A2["Automated Join Engine"]
        D1 --> A3["Vectorized KPI Aggregator"]
        D1 --> A4["Statistical Insights Engine"]
    end

    subgraph Auth [" 🔒 Multi-Tenant Security Core "]
        PG[("🐘 PostgreSQL 16 (RLS)")] <--> Drizzle["Drizzle ORM Engine"]
        Drizzle <--> Session["HTTP-Only Session Cookies"]
        Session <--> API["Next.js 15 API Routes"]
    end

    subgraph Frontend [" 🖥️ Pitch-Black Presentation "]
        API --> UI["Next.js App Shell"]
        UI --> D_Dash["📊 Executive Overview & Visual Builder"]
        UI --> D_3D["🌐 Three.js 3D Spatial Universe"]
        UI --> D_Src["🔌 Data Sources & Connector Hub"]
        UI --> D_Exp["📥 Export Hub (CSV, Excel, PDF)"]
    end

    Analytics --> API
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `>= 20.11.0` (LTS recommended)
- **npm**: `>= 10.0.0`
- **PostgreSQL 16**: (Self-contained local cluster scripts included)

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
Create your `.env` configuration file in the project root:
```bash
cp .env.example .env
```

Ensure your connection parameters are set:
```env
# Dedicated local PostgreSQL cluster (Port 5434 avoids collision with port 5432)
DATABASE_URL=postgres://bi_app:bi_app_pw@127.0.0.1:5434/bi_platform
MIGRATION_DATABASE_URL=postgres://bi_owner:bi_owner_pw@127.0.0.1:5434/bi_platform

SESSION_SECRET=c38e92f7a61d4b2e8f0a1c5d9e3b7a4f5c6d7e8a9b0c1d2e3f4a5b6c7d8e9f0a
NODE_ENV=development
```

### 4. Initialize Local PostgreSQL Database
Start the dedicated PostgreSQL 16 cluster and initialize the schema:
```bash
# Start the local database cluster
npm run db:start

# Run Drizzle schema migrations
npm run db:migrate

# Seed baseline enterprise fixtures & demo accounts
npm run db:bootstrap
```

### 5. Start the Application Server
```bash
npm run dev
```

The application will start on **`http://localhost:3001`**.

---

## 🔑 Default Credentials

Use the pre-seeded enterprise administrator credentials to log in:

| Parameter | Value |
|---|---|
| **Login Portal** | [http://localhost:3001/login](http://localhost:3001/login) |
| **Email** | `ashwin@datafusion.io` |
| **Password** | `Password123!` |
| **Role** | Organization Owner (`datafusion_primary`) |

> You can also click the **"Fill Demo Credentials"** button directly on the login page or on the embedded sign-in module on the homepage for instant one-click access.

---

## 🔌 Port Configuration & Troubleshooting

### Why Port 3001?
By default, Next.js applications attempt to bind to port `3000`. If you have another application (such as `recura` or another development project) currently running on port `3000`, clicking a generic `localhost:3000` link will open that other project instead.

To prevent port collision:
- DataFusion BI is explicitly configured to serve on **Port 3001**:  
  👉 **[http://localhost:3001](http://localhost:3001)**
- If you wish to specify a custom port, pass the `-p` flag:
  ```bash
  npm run dev -- -p 3005
  ```

### Database Port (5434)
The local PostgreSQL 16 cluster is configured to listen on **Port 5434** (`127.0.0.1:5434`). This ensures it will never collide with any global PostgreSQL instances that may already be listening on default port `5432`.

---

## 🛡️ QA & Verification Suite

The repository includes automated verification suites covering security, type safety, code quality, and end-to-end user journeys:

```bash
# 1. Verify PostgreSQL Row-Level Security (19 Multi-Tenant Isolation Checks)
npm run db:verify-rls

# 2. Verify TypeScript strict type-checking
npm run typecheck

# 3. Verify ESLint compliance
npx next lint --dir src

# 4. Execute Full Autonomous E2E QA Suite (80 Automated Checks)
node .scratch/autonomous-qa-suite.mjs

# 5. Compile Next.js Production Build
npm run build
```

---

## 📁 Repository Structure

```
├── .scratch/                # Autonomous QA test suites and scratch scripts
├── docker/                  # Docker Compose configuration & PostgreSQL initialization
├── scripts/                 # Database bootstrap, migration & RLS verification scripts
├── src/
│   ├── app/
│   │   ├── (app)/           # Authenticated application shell (Protected via RLS session)
│   │   │   ├── app/         # Dashboard, Sources, Data Prep, Insights & Reports
│   │   │   └── onboarding/  # Organization workspace onboarding
│   │   ├── (auth)/          # Authentication views (Dedicated /login and /signup)
│   │   ├── api/             # REST API routes (DuckDB OLAP, Sources, KPIs, Export)
│   │   └── page.tsx         # Public overview page with embedded sign-in module
│   ├── components/
│   │   ├── 3d/              # Three.js 3D Spatial Universe & Hero Data Core
│   │   ├── dashboard/       # KPI Ribbon, Ingestion Velocity, SQL Profiler, Latency Map
│   │   └── ui/              # Radix UI primitives & high-contrast pitch-black tokens
│   ├── lib/
│   │   ├── auth/            # Argon2id hashing, session token cookies & tenant guards
│   │   ├── db/              # Drizzle ORM schema, migrations & RLS isolation policies
│   │   └── engine/          # In-process DuckDB engine, Excel/CSV parser, KPI evaluator
│   └── globals.css          # Pitch-black OLED design tokens & specular glass utilities
└── package.json             # Scripts & dependencies
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

<div align="center">
  <b>Built with precision using Next.js 15, DuckDB v1.3 & Three.js</b>
</div>
