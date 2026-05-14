# Frontend (Vite + React)

## Run locally

From the monorepo root:

```bash
npm ci
npm run dev --workspace frontend
```

Build:

```bash
npm run build --workspace frontend
```

## UI foundation setup

This frontend uses:

- **Tailwind CSS** (`tailwind.config.js`, `src/index.css`)
- **shadcn/ui** components in `src/components/ui`
- **Inter** font via `@fontsource/inter`

### Theme tokens

Core palette is defined with CSS variables in `src/index.css` and consumed by Tailwind/shadcn:

- Primary: `#0F172A`
- Secondary: `#2563EB`
- Accent: `#22C55E`
- Background: `#F8FAFC`

### App layout

Authenticated pages share a consistent shell:

- Fixed left sidebar navigation
- Top navbar with current page title + user chip/actions
- Centered content area (`rb-content`) with spacing and max-width

### UX primitives

Reusable primitives available in the codebase:

- Toasts (`sonner`, app-level `Toaster`)
- Loading skeleton (`src/components/ui/skeleton.jsx`)
- Empty state component (`src/components/rb/EmptyState.jsx`)
- Status badge component (`src/components/rb/StatusBadge.jsx`)
