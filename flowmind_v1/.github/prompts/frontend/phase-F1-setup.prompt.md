agent: agent

# Phase F1 — Frontend Project Setup

Use @frontend-agent for this phase.

## Goal
Scaffold the complete `frontend/` project with Vite + React + TypeScript, install
all packages from Report 1 Section 1, configure Tailwind, and init shadcn/ui.

## Deliverables

### 1. Run these commands in order:
```bash
cd flowmind  # project root
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install

# State + routing
npm install zustand@4.5.4 react-router-dom@6.26.0

# DAG
npm install @xyflow/react @dagrejs/dagre

# Charts
npm install echarts echarts-for-react recharts

# Virtualization
npm install @tanstack/react-virtual

# Styling utils
npm install -D tailwindcss@3.4.7 @tailwindcss/forms postcss autoprefixer
npm install class-variance-authority clsx lucide-react

# shadcn init
npx tailwindcss init -p
npx shadcn@latest init
npx shadcn@latest add button badge card separator tooltip scroll-area dialog
```

### 2. Create the full `src/` folder structure from Report 1 Section 2:
Create all empty files (with just the export placeholder comment) for:
- src/types/ — 4 type files
- src/store/ — 4 store files
- src/services/ — 5 service files
- src/hooks/ — 5 hook files
- src/lib/ — logger.ts, error-boundary.tsx, constants.ts
- src/pages/ — 5 page files (empty shells returning <div>PageName</div>)
- src/components/shared/ — ErrorBoundary, StatusDot, LogBadge, ConfidenceBadge

### 3. `src/lib/constants.ts`:
API_BASE_URL, SSE_ENDPOINT and other config values read from import.meta.env.

### 4. Configure Vite proxy in `vite.config.ts`:
```ts
proxy: {
  '/api': { target: 'http://localhost:8000', changeOrigin: true }
}
```

## Self-Test ✅
```bash
cd frontend
npm run dev
# Expected: Vite starts on port 5173, browser shows default React page with no errors
npx tsc --noEmit
# Expected: 0 TypeScript errors
```