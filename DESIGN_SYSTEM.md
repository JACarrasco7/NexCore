# 🎨 NEXUM Design System

## Color Palette

| Token              | Hex                              | Usage                                      |
| ------------------ | -------------------------------- | ------------------------------------------ |
| **accent**         | `#7c3aed` (purple)               | Primary actions, highlights, active states |
| **accent-strong**  | `#6d28d9`                        | Hover/focus state for accent               |
| **success**        | `#10b981` (emerald)              | Positive state, achievements, gains        |
| **warning**        | `#f59e0b` (amber)                | Caution, adherence gaps, alerts            |
| **danger**         | `#ef4444` (red)                  | Errors, risk states, critical              |
| **foreground**     | `#ffffff` (white)                | Primary text                               |
| **foreground/50**  | `rgba(255,255,255,0.5)`          | Secondary text                             |
| **foreground/40**  | `rgba(255,255,255,0.4)`          | Tertiary text                              |
| **background**     | `#0f172a` (slate-950)            | Page background                            |
| **surface**        | `#1e293b` (slate-900)            | Card backgrounds                           |
| **surface-strong** | `#334155` (slate-700)            | Surface elevation                          |
| **line**           | `#475569` (slate-600/40 opacity) | Borders                                    |

## Typography

| Usage     | Classes                          | Size    | Weight | Line Height |
| --------- | -------------------------------- | ------- | ------ | ----------- |
| **H1**    | `text-3xl md:text-4xl font-bold` | 30-36px | 700    | 1.2         |
| **H2**    | `text-2xl md:text-3xl font-bold` | 24-28px | 700    | 1.3         |
| **H3**    | `text-xl font-semibold`          | 20px    | 600    | 1.4         |
| **Label** | `text-sm font-medium`            | 14px    | 500    | 1.5         |
| **Body**  | `text-sm text-foreground/70`     | 14px    | 400    | 1.6         |
| **Small** | `text-xs text-foreground/50`     | 12px    | 400    | 1.5         |
| **Tiny**  | `text-[10px] text-foreground/40` | 10px    | 400    | 1.4         |

## Spacing System

```
xs: 0.25rem (4px)    → px-1, py-1
sm: 0.5rem (8px)     → px-2, py-2
md: 1rem (16px)      → px-4, py-4
lg: 1.5rem (24px)    → px-6, py-6
xl: 2rem (32px)      → px-8, py-8
2xl: 3rem (48px)     → px-12, py-12
3xl: 4rem (64px)     → px-16, py-16
```

## Components

### Cards

- **Base**: `rounded-2xl border border-line bg-surface p-4 md:p-6`
- **Elevated**: `rounded-3xl border border-line bg-surface-strong p-5 md:p-6`
- **Accent**: `rounded-2xl border border-accent/20 bg-accent/5 p-4 md:p-5`

### Buttons

- **Primary**: `rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong`
- **Secondary**: `rounded-full border border-line px-4 py-2 text-sm text-foreground/70 hover:text-foreground`
- **Danger**: `rounded-full border border-danger/30 bg-danger/5 px-4 py-2 text-xs text-danger hover:bg-danger/10`

### Inputs

```
rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm
outline-none transition focus:border-accent
```

### Tables

- Use `striped` alternating row colors: `even:bg-surface-strong`
- Borders: `border-b border-line/50`
- Padding: `px-4 py-3`

### List Items

- **Base**: `flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4 hover:border-line/70`
- **Active**: `border-accent/30 bg-accent/8`

## Layout Patterns

### Main Container

```html
<div class="mx-auto w-full max-w-[1480px] px-6 py-8 md:px-10 lg:px-12"></div>
```

### Section Header

```html
<div class="flex items-center justify-between gap-4">
  <div>
    <p class="text-xs uppercase tracking-widest text-foreground/40">Eyebrow</p>
    <h1 class="mt-1 text-2xl font-bold">Title</h1>
  </div>
  <Link href="..." class="...">Action →</Link>
</div>
```

### Split Layout (Sidebar + Main)

```html
<div class="grid gap-5 xl:grid-cols-[260px_1fr]">
  <aside>...</aside>
  <main>...</main>
</div>
```

### Grid Patterns

- **2 cols**: `grid grid-cols-2 gap-3 md:gap-4`
- **3 cols**: `grid grid-cols-3 gap-4`
- **4 cols**: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4`

## Dark Mode (Default)

- All colors use dark theme by default
- No separate light mode CSS needed (currently dark-only)
- Background: `#0f172a` (slate-950)
- Surface: `#1e293b` (slate-900)
- Text: `#ffffff` (white)

## Responsive Breakpoints

- **Mobile**: < 640px (no prefix)
- **Tablet**: ≥ 640px (`sm:`)
- **Desktop**: ≥ 768px (`md:`)
- **Wide**: ≥ 1024px (`lg:`)
- **Extra Wide**: ≥ 1280px (`xl:`)

## Status Indicators

| State   | Background      | Text           | Usage               |
| ------- | --------------- | -------------- | ------------------- |
| Success | `bg-success/10` | `text-success` | Completed, achieved |
| Warning | `bg-warning/10` | `text-warning` | Caution, gap        |
| Danger  | `bg-danger/10`  | `text-danger`  | Error, at-risk      |
| Info    | `bg-accent/10`  | `text-accent`  | Highlight, focus    |

## Common Patterns

### Section Title

```tsx
<p className="text-xs uppercase tracking-widest text-foreground/40">Label</p>
<h2 className="mt-1 text-xl font-semibold">Title</h2>
```

### Empty State

```tsx
<div className="border-line flex flex-col items-center justify-center rounded-2xl border border-dashed py-12 text-center">
  <p className="text-foreground/40 text-sm">No data available</p>
</div>
```

### Loading State

```tsx
<div className="space-y-3">
  {[1, 2, 3].map((i) => (
    <Skeleton key={i} className="h-12 rounded-xl" />
  ))}
</div>
```

### Macro Colors (Nutrition)

- **Protein**: `text-success` / `bg-success/10`
- **Carbs**: `text-warning` / `bg-warning/10`
- **Fat**: `text-danger` / `bg-danger/10`
- **Kcal**: `text-accent` / `bg-accent/10`

---

**Last Updated**: 2026-05-09  
**Version**: 1.0  
**Maintainer**: CARRIX Tech
