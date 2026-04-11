---
agent: agent
---

# UI Rebuild — Apply Design System to All Pages

## Context
The frontend was built but has NO styling applied. Every page looks like a 
loading skeleton — light text on light background, no colors, no theme, no 
visual hierarchy. This prompt fixes ALL of that.

## FIRST: Read the Design System
Before writing a single line of code, read these files in full:

1. `design-system/MASTER.md` — This is the source of truth. Every color, 
   font, spacing rule, and effect comes from here.
2. Check if `design-system/pages/<page-name>.md` exists for each page you 
   are working on. If it exists, its rules override MASTER.md for that page.

## What You Are Fixing
Every `.tsx` file in `frontend/src/pages/` and `frontend/src/components/` 
needs its Tailwind classes replaced with the design system values. The 
current state is:
- White/grey backgrounds everywhere (should have proper dark/colored theme)
- Text is invisible (light text on light background — critical contrast failure)
- No color palette applied at all
- No visual hierarchy
- Looks like an unstyled HTML skeleton

## Rules for This Rebuild
1. DO NOT touch any TypeScript logic, hooks, stores, services, or state management
2. DO NOT change file structure or component props
3. ONLY change: className strings, Tailwind utilities, inline styles, shadcn variant props
4. Apply the EXACT colors from MASTER.md — hex values, not approximations
5. Apply the EXACT font family from MASTER.md — add Google Fonts import to index.html
6. Fix contrast FIRST on every component before adding decorative styles

## Fix Order — Do Exactly This Order

### Fix 1: Global Foundation (do this first, everything else depends on it)
File: `frontend/src/styles/globals.css` or `frontend/index.html`
- Add Google Fonts import from MASTER.md
- Set CSS variables for primary/secondary/accent/background/text colors
- Set body background color and default text color
- This single fix will make text visible immediately

### Fix 2: NavigationBar
File: `frontend/src/components/shared/NavigationBar.tsx`
- Apply background color from MASTER.md
- Apply text color — must have 4.5:1 contrast ratio minimum
- Active link indicator using accent color
- Hover states with smooth transition (150-300ms)

### Fix 3: HomePage
File: `frontend/src/pages/HomePage.tsx`
- Apply background from MASTER.md
- Style the natural language input: proper border, focus ring using accent color
- Past workflows cards: use Card component with proper shadow and border
- Submit button: primary color from MASTER.md

### Fix 4: DAGPage
File: `frontend/src/pages/DAGPage.tsx` + `frontend/src/components/dag/DAGNode.tsx`
Read `design-system/pages/dag.md` for page-specific rules.
- DAG canvas background: dark enough to see nodes
- Node card colors: pending=neutral, running=primary pulse, success=green, failed=red
- Confidence badge colors from MASTER.md accent palette
- Edge animation color matching theme

### Fix 5: ExecutionPage  
File: `frontend/src/pages/ExecutionPage.tsx` + execution components
Read `design-system/pages/execution.md` for page-specific rules.
- Step status colors: consistent with DAG node colors
- ApprovalGate buttons: APPROVE=success green (large, prominent), REJECT=danger red
- Log level badge colors: DEBUG=grey, INFO=blue, WARN=amber, ERROR=red

### Fix 6: StatusPage
File: `frontend/src/pages/StatusPage.tsx` + status components
Read `design-system/pages/status.md` for page-specific rules.
- StatusDot: healthy=green animated pulse, degraded=yellow, down=red flash
- Health cards: use Card with subtle border, proper contrast
- ECharts theme: match chart colors to MASTER.md palette

### Fix 7: ConnectorsPage
File: `frontend/src/pages/ConnectorsPage.tsx` + connector components
Read `design-system/pages/connectors.md` for page-specific rules.
- ConnectorCard states must be visually distinct:
  - Connected: green dot + green-tinted border
  - Disconnected: neutral
  - Error: red dot + red-tinted border  
  - Connecting: spinner + muted
- Connect button: primary color
- Disconnect button: outlined danger
- Reconnect button: outlined warning/orange

## Anti-Patterns to Avoid (from MASTER.md)
- DO NOT use emojis as icons — use lucide-react icons only
- DO NOT use bg-white/10 for cards in light contexts (invisible)
- DO NOT use gray-400 or lighter for body text (fails contrast)
- DO NOT apply scale transforms on hover (causes layout shift)
- DO NOT use instant transitions — always duration-200 minimum

## Pre-Delivery Checklist — Verify Before Finishing
- [ ] Open the app in browser — text is readable everywhere
- [ ] Background is NOT white/grey — matches MASTER.md color
- [ ] All 5 pages have consistent color theme
- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states work on all buttons and cards
- [ ] Font from MASTER.md is loading (check Network tab)
- [ ] Run: `npx tsc --noEmit` — must be 0 errors

## Self-Test
```bash
cd frontend && npm run dev
# Open http://localhost:5173 in browser
# Every page should now match the design system from MASTER.md
# No invisible text, no white skeleton look
```