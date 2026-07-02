# ⚔️ Habit Dungeon

**Habit Dungeon** is a full-stack, gamified habit tracker web application built using Next.js (App Router), TypeScript, Tailwind CSS, Prisma ORM, and Framer Motion. 

Turn your daily routines into epic RPG quests! Complete your real-life habits to deal massive damage to dungeon bosses, earn gold and experience (XP), level up your hero, and unlock new abilities. But beware—sleeping on your duties allows the boss to retaliate and strike you down!

---

## 🚀 Key Features

*   **Gamified Habit Checklists**: Categorized by difficulty (Easy, Medium, Hard). Completing tasks triggers interactive attacks against the active boss.
*   **Active Boss Battle Arena**: Face off against iconic retro pixel-art bosses (from *Prisma Slime* to *Void Demon*). Watch bosses shake, flash red, and display floating combat text (e.g., `-20 HP`, `+10 XP`, `+5 Gold`) in real-time.
*   **Hero Status Tracking**: Track Level, Health (HP), Experience (XP), and Gold loot. Health bars and level milestones animate smoothly.
*   **End Day (Rest) Cycle**: End the day to reset your tasks. Any incomplete habits will trigger a boss counter-attack, dealing damage to your hero. 
*   **Death & Resurrection**: If your HP hits 0, your hero falls in battle. Resurrecting restores full health at the cost of some Gold and XP penalties.
*   **Full-Stack Persistence**: Fully-powered backend server endpoints handle combat checks and persist game-states securely inside a database.
*   **Gothic RPG Design System**: Styled with a dark glassmorphic interface, neon status panels, and thematic Google Fonts (*Cinzel* and *Outfit*).

---

## 🛠️ Tech Stack

*   **Framework**: [Next.js](https://nextjs.org/) (App Router, TypeScript)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Animations**: [Framer Motion](https://www.framer.com/motion/)
*   **Database ORM**: [Prisma](https://www.prisma.io/)
*   **Database Engines**: 
    *   **SQLite** (For fast, zero-config local development)
    *   **PostgreSQL** (For production databases like Neon or Supabase)
*   **Icons**: [Lucide React](https://lucide.dev/)

---

## 📦 Folder Structure

```text
habit-dungeon/
├── prisma/
│   ├── schema.prisma       # Prisma Database Schema (User, Habit, Boss models)
│   └── dev.db              # Local SQLite Database (Git ignored)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── battle/     # Endpoint for combat logic (attk, uncomplete, endDay)
│   │   │   ├── habits/     # Habits CRUD endpoints
│   │   │   └── hero/       # Hero seed, status, and reset endpoints
│   │   ├── globals.css     # Theme configs and medieval styling
│   │   ├── layout.tsx      # App wrapper with dark mode configuration
│   │   └── page.tsx        # Core UI dashboard and Framer Motion combat visuals
│   └── lib/
│       └── db.ts           # Singleton Prisma Client connection setup
├── public/
│   └── bosses/             # 2D Pixel-art boss graphics (Slime, Dragon, Goblin, etc.)
├── package.json
└── tsconfig.json
```

---

## 💻 Local Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/your-username/habit-dungeon.git
cd habit-dungeon
```

### 2. Install dependencies
```bash
npm install
```

### 3. Database Setup (Local SQLite)
1. Ensure your `.env` file contains your absolute local directory path to prevent SQLite resolution errors between CLI and runtime Next.js:
   ```env
   DATABASE_URL="file:C:/absolute/path/to/your/project/prisma/dev.db"
   ```
2. Push your schema and initialize the SQLite database:
   ```bash
   npx prisma db push
   ```
3. Generate the local client:
   ```bash
   npx prisma generate
   ```

### 4. Boot up development server
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser to enter the dungeon!

---

## ☁️ Production Deployment (Vercel + Neon PostgreSQL)

Vercel uses serverless functions, meaning the local SQLite `dev.db` file will reset or be locked. Follow these steps to host your database permanently on a free serverless PostgreSQL provider like **Neon**:

### 1. Update Prisma Schema
In `prisma/schema.prisma`, change your database provider to `postgresql`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 2. Generate and Sync Database
1. Paste your Neon connection string in your `.env` file:
   ```env
   DATABASE_URL="postgresql://user:password@ep-host-name.neon.tech/neondb?sslmode=require"
   ```
2. Re-generate Prisma Client:
   ```bash
   npx prisma generate
   ```
3. Push the tables to your Neon instance:
   ```bash
   npx prisma db push
   ```

### 3. Deploy to Vercel
1. Import your project into Vercel.
2. Under **Environment Variables**, add:
   *   **Key**: `DATABASE_URL`
   *   **Value**: (your Neon connection string)
3. Deploy! Vercel will build the project and connect to your live database.

---

## 🛠️ Troubleshooting (Common Windows Errors)

*   **Error: `The table main.Habit does not exist...`**: 
    This means Next.js and Prisma CLI are looking at different database paths. Ensure the `DATABASE_URL` in `.env` is set as an **absolute path** (e.g. `file:C:/path-to-folder/.../dev.db`) rather than a relative path (`file:./dev.db`).
*   **Error: `EPERM: operation not permitted, rename ...`**: 
    Prisma is trying to update client DLL files that are locked by a running Next.js development server. Kill your `npm run dev` terminal, run `npx prisma generate`, and then start the server again.
*   **Moving Project Folders**:
    If you move the project to a different drive, delete your `node_modules` and `.next` folder, update the absolute path in `.env`, and run `npm install` and `npx prisma generate` again to prevent native file lock hangs.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE). Customize it and share your progress!
