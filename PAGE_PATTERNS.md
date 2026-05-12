# 📄 Page Patterns & Layout Standardization

## Overview

Este documento estandariza las estructuras de layout comunes utilizadas en todas las páginas de NEXUM.

**Goals:**

- Asegurar consistencia visual en toda la app
- Facilitar creación de nuevas páginas
- Mantener responsive design
- Mejorar UX

---

## 1. Standard Page Container

### Base Pattern

```tsx
export default function PageName() {
  return (
    <main className="mx-auto w-full max-w-[1480px] px-6 py-6 md:px-10 lg:px-12">
      {/* Page content here */}
    </main>
  )
}
```

### Spacing Breakdown

- **Container:** `max-w-[1480px]` (desktop max-width)
- **Padding:**
  - Mobile: `px-6` (24px), `py-6` (24px)
  - Tablet: `md:px-10` (40px)
  - Desktop: `lg:px-12` (48px)

---

## 2. Page Header Pattern

### With Title + Actions

```tsx
<section className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
  <div>
    <p className="text-foreground/70 text-sm font-medium">Eyebrow</p>
    <h1 className="text-2xl font-bold">Page Title</h1>
  </div>
  <div className="flex gap-2">
    <button className="...">Action 1</button>
    <button className="...">Action 2</button>
  </div>
</section>
```

**Usage:**

- Eyebrow: Small contextual text (e.g., "Semana 1", "Equipo A")
- Title: Main page heading
- Actions: Primary buttons (Create, Export, etc.)

### Mobile Responsive Notes

- Stack vertically on mobile (flex-col)
- Actions full-width on mobile (stack below title)
- Side-by-side on desktop (md:flex-row)

---

## 3. Content Section Pattern

### Single Section

```tsx
<section className="space-y-4">
  <h2 className="text-foreground text-lg font-semibold">Section Title</h2>
  <div className="border-line bg-surface-strong rounded-2xl border p-6">{/* Content */}</div>
</section>
```

### Multiple Sections with Gaps

```tsx
<section className="space-y-8">
  {/* Section 1 */}
  <section className="space-y-4">
    <h2 className="text-lg font-semibold">Overview</h2>
    <div className="border-line bg-surface-strong rounded-2xl border p-6">{/* Content */}</div>
  </section>

  {/* Section 2 */}
  <section className="space-y-4">
    <h2 className="text-lg font-semibold">Details</h2>
    <div className="border-line bg-surface-strong rounded-2xl border p-6">{/* Content */}</div>
  </section>
</section>
```

**Gap Values:**

- `space-y-4`: 16px gap (within sections)
- `space-y-6`: 24px gap (between related content)
- `space-y-8`: 32px gap (between major sections)

---

## 4. Two-Column Layout

### Desktop Side-by-Side, Mobile Stacked

```tsx
<section className="grid grid-cols-1 gap-6 md:grid-cols-3">
  {/* Sidebar (1 column on mobile, 1/3 on desktop) */}
  <aside className="space-y-4">
    <div className="border-line bg-surface-strong rounded-2xl border p-6">Sidebar content</div>
  </aside>

  {/* Main content (full width on mobile, 2/3 on desktop) */}
  <main className="space-y-4 md:col-span-2">
    <div className="border-line bg-surface-strong rounded-2xl border p-6">Main content</div>
  </main>
</section>
```

### Layout Variants

#### 25% - 75% Split

```tsx
<div className="grid grid-cols-1 gap-6 md:grid-cols-4">
  <aside className="md:col-span-1">...</aside>
  <main className="md:col-span-3">...</main>
</div>
```

#### 33% - 67% Split

```tsx
<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
  <aside className="md:col-span-1">...</aside>
  <main className="md:col-span-2">...</main>
</div>
```

#### 50% - 50% Split

```tsx
<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
  <section>...</section>
  <section>...</section>
</div>
```

---

## 5. Grid Card Layout

### 1-Column (Default)

```tsx
<section className="space-y-4">
  {/* List of cards, one per row */}
  {items.map((item) => (
    <div key={item.id} className="border-line bg-surface-strong rounded-2xl border p-6">
      {/* Card content */}
    </div>
  ))}
</section>
```

### 2-Column Grid

```tsx
<section className="grid grid-cols-1 gap-6 md:grid-cols-2">
  {items.map((item) => (
    <div key={item.id} className="border-line bg-surface-strong rounded-2xl border p-6">
      {/* Card content */}
    </div>
  ))}
</section>
```

### 3-Column Grid

```tsx
<section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
  {items.map((item) => (
    <div key={item.id} className="border-line bg-surface-strong rounded-2xl border p-6">
      {/* Card content */}
    </div>
  ))}
</section>
```

### 4-Column Grid (Dashboard)

```tsx
<section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
  {items.map((item) => (
    <div key={item.id} className="border-line bg-surface-strong rounded-2xl border p-6">
      {/* Card content */}
    </div>
  ))}
</section>
```

**Responsive Breakpoints:**

- **Mobile (< 640px):** 1 column
- **Tablet (640px - 1024px):** 2 columns (md:)
- **Desktop (1024px+):** 3-4 columns (lg:)

---

## 6. List/Table Container

### With Header & Controls

```tsx
<section className="space-y-4">
  {/* Header with filters */}
  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <input
      type="text"
      placeholder="Buscar..."
      className="border-line bg-surface-strong rounded-2xl border px-4 py-2.5 text-sm"
    />
    <select className="border-line bg-surface-strong rounded-2xl border px-4 py-2.5 text-sm">
      <option>Filtrar...</option>
    </select>
  </div>

  {/* Table/List */}
  <div className="border-line bg-surface-strong overflow-hidden rounded-2xl border">
    <table className="w-full">{/* Table content */}</table>
  </div>

  {/* Pagination */}
  <div className="flex items-center justify-center gap-2">{/* Pagination controls */}</div>
</section>
```

---

## 7. Form Layout

### Single-Column Form

```tsx
<form className="flex flex-col gap-6">
  <div className="flex flex-col gap-2">
    <label className="text-foreground/70 text-sm font-medium">Label</label>
    <input type="text" className="..." />
  </div>

  <div className="flex flex-col gap-2">
    <label className="text-foreground/70 text-sm font-medium">Label</label>
    <textarea className="..." />
  </div>

  <div className="border-line flex gap-3 border-t pt-4">
    <button className="border-line rounded-2xl border px-6 py-2.5 text-sm font-medium">
      Cancelar
    </button>
    <button className="bg-accent rounded-2xl px-6 py-2.5 text-sm font-medium text-white">
      Guardar
    </button>
  </div>
</form>
```

### Two-Column Form

```tsx
<form className="flex flex-col gap-6">
  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
    <div className="flex flex-col gap-2">
      <label className="text-foreground/70 text-sm font-medium">First Name</label>
      <input type="text" className="..." />
    </div>

    <div className="flex flex-col gap-2">
      <label className="text-foreground/70 text-sm font-medium">Last Name</label>
      <input type="text" className="..." />
    </div>
  </div>

  <div className="flex flex-col gap-2">
    <label className="text-foreground/70 text-sm font-medium">Email</label>
    <input type="email" className="..." />
  </div>

  <div className="border-line flex gap-3 border-t pt-4">
    <button className="border-line rounded-2xl border px-6 py-2.5">Cancelar</button>
    <button className="bg-accent rounded-2xl px-6 py-2.5 text-white">Guardar</button>
  </div>
</form>
```

---

## 8. Empty State Pattern

```tsx
<div className="border-line bg-surface-strong rounded-2xl border p-12">
  <div className="flex flex-col items-center justify-center gap-4 text-center">
    {/* Icon/Emoji */}
    <div className="text-5xl">📭</div>

    {/* Title */}
    <h3 className="text-lg font-medium">No hay datos</h3>

    {/* Description */}
    <p className="text-foreground/70 max-w-xs text-sm">
      Crea tu primer elemento para empezar o importa datos existentes.
    </p>

    {/* Action */}
    <button className="bg-accent mt-4 rounded-2xl px-6 py-2.5 text-sm font-medium text-white">
      Crear ahora
    </button>
  </div>
</div>
```

---

## 9. Loading State Pattern

```tsx
<div className="border-line bg-surface-strong rounded-2xl border p-12">
  <div className="flex flex-col items-center justify-center gap-4">
    <div className="border-line border-t-accent h-8 w-8 animate-spin rounded-full border-4" />
    <p className="text-foreground/70 text-sm">Cargando...</p>
  </div>
</div>
```

---

## 10. Error State Pattern

```tsx
<div className="rounded-2xl border border-red-600/30 bg-red-900/10 p-6">
  <div className="flex gap-4">
    <div className="text-xl">⚠️</div>
    <div>
      <h3 className="font-medium text-red-400">Error</h3>
      <p className="mt-1 text-sm text-red-300/70">
        No se pudieron cargar los datos. Intenta nuevamente más tarde.
      </p>
    </div>
  </div>
</div>
```

---

## 11. Modal/Dialog Pattern

### Centered Modal

```tsx
<dialog className="border-line bg-surface-strong max-w-lg rounded-2xl border p-6 backdrop:bg-black/50">
  <h2 className="mb-2 text-lg font-semibold">Modal Title</h2>
  <p className="text-foreground/70 mb-6 text-sm">Modal content goes here.</p>

  <div className="flex gap-3">
    <button className="border-line rounded-2xl border px-6 py-2.5 text-sm font-medium">
      Cancel
    </button>
    <button className="bg-accent rounded-2xl px-6 py-2.5 text-sm font-medium text-white">
      Confirm
    </button>
  </div>
</dialog>
```

---

## 12. Sidebar + Main Layout

### Navigation + Content

```tsx
<div className="flex min-h-screen gap-6">
  {/* Sidebar (fixed width) */}
  <aside className="border-line w-64 border-r p-6">
    <nav className="space-y-2">{/* Navigation items */}</nav>
  </aside>

  {/* Main content */}
  <main className="flex-1 px-6 py-6">{/* Page content */}</main>
</div>
```

**Note:** This pattern is handled by `<AppShell>` component in NEXUM.

---

## 13. Stat Card Pattern

### Info Cards (Dashboard)

```tsx
<section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
  {[
    { label: 'Atletas Activos', value: 12, icon: '👥' },
    { label: 'Sesiones Esta Semana', value: 48, icon: '🏋️' },
    { label: 'Promedio Adherencia', value: '92%', icon: '✅' },
    { label: 'Planes Activos', value: 8, icon: '📋' },
  ].map((stat, idx) => (
    <div key={idx} className="border-line bg-surface-strong rounded-2xl border p-6">
      <div className="flex items-center gap-4">
        <span className="text-3xl">{stat.icon}</span>
        <div>
          <p className="text-foreground/70 text-sm">{stat.label}</p>
          <p className="text-foreground text-2xl font-semibold">{stat.value}</p>
        </div>
      </div>
    </div>
  ))}
</section>
```

---

## 14. Tabs Pattern

### Tab Navigation

```tsx
const [activeTab, setActiveTab] = useState('overview')

;<div className="space-y-6">
  {/* Tab buttons */}
  <div className="border-line flex gap-4 border-b">
    {['overview', 'details', 'settings'].map((tab) => (
      <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        className={`border-b-2 pb-2 text-sm font-medium transition ${
          activeTab === tab
            ? 'border-accent text-accent'
            : 'text-foreground/70 hover:text-foreground border-transparent'
        }`}
      >
        {tab.charAt(0).toUpperCase() + tab.slice(1)}
      </button>
    ))}
  </div>

  {/* Tab content */}
  <div>
    {activeTab === 'overview' && <OverviewContent />}
    {activeTab === 'details' && <DetailsContent />}
    {activeTab === 'settings' && <SettingsContent />}
  </div>
</div>
```

---

## 15. Page Type Templates

### List Page (Athletes, Teams, etc.)

```tsx
export default function ListPage() {
  const [viewMode, setViewMode] = useState<'table' | 'list'>('table')
  const [filters, setFilters] = useState({})
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  return (
    <main className="mx-auto w-full max-w-[1480px] px-6 py-6 md:px-10 lg:px-12">
      {/* Header */}
      <section className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-foreground/70 text-sm font-medium">Eyebrow</p>
          <h1 className="text-2xl font-bold">List Title</h1>
        </div>
        <div className="flex gap-2">
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
          <button className="bg-accent rounded-2xl px-6 py-2.5 text-sm font-medium text-white">
            Create
          </button>
        </div>
      </section>

      {/* Filters */}
      <section className="mb-6 flex gap-4">
        <input type="text" placeholder="Search..." className="..." />
        <select className="...">
          <option>Filter...</option>
        </select>
      </section>

      {/* Content */}
      {isLoading ? (
        <LoadingState />
      ) : data.length === 0 ? (
        <EmptyState />
      ) : viewMode === 'table' ? (
        <TableView data={data} />
      ) : (
        <ListView data={data} />
      )}
    </main>
  )
}
```

### Detail Page (Athlete Profile, Plan, etc.)

```tsx
export default function DetailPage({ id }: { id: string }) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)

  return (
    <main className="mx-auto w-full max-w-[1480px] px-6 py-6 md:px-10 lg:px-12">
      {/* Header */}
      <section className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-foreground/70 text-sm font-medium">
            <Link href="/path">← Back</Link>
          </p>
          <h1 className="text-2xl font-bold">{data?.title}</h1>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="border-line rounded-2xl border px-6 py-2.5 text-sm font-medium"
        >
          {isEditing ? 'Cancelar' : 'Editar'}
        </button>
      </section>

      {/* Two-column layout */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Sidebar */}
        <aside className="space-y-4">{/* Metadata, stats, etc */}</aside>

        {/* Main content */}
        <main className="space-y-6 md:col-span-2">
          {isLoading ? <LoadingState /> : <DetailContent data={data} editing={isEditing} />}
        </main>
      </section>
    </main>
  )
}
```

---

## 16. Mobile-First Responsive Guidelines

### Breakpoints

- **Mobile:** Default (< 640px)
- **Tablet:** `md:` (640px - 1024px)
- **Desktop:** `lg:` (1024px+)
- **Large Desktop:** `xl:` (1280px+)

### Best Practices

1. **Stack everything on mobile** — Use single column layouts
2. **Increase spacing on larger screens** — `md:gap-8` instead of `gap-4`
3. **Show/hide elements** — `hidden md:block` for desktop-only features
4. **Full-width inputs on mobile** — Stack 2-column forms to 1 column
5. **Adjust padding** — `px-6 md:px-10 lg:px-12`
6. **Test at actual breakpoints** — Don't assume dimensions

---

## 17. Color & Spacing Reference

### Color Tokens

```
bg-surface-strong   → #222428 (card backgrounds)
border-line         → #444856 (borders)
text-foreground     → #F5F5F5 (main text)
text-foreground/70  → #F5F5F5 70% (muted text)
text-foreground/50  → #F5F5F5 50% (secondary text)
text-accent         → #7c3aed (interactive elements)
```

### Spacing Scale

```
px-4   → 16px
px-6   → 24px
py-2.5 → 10px
py-3   → 12px
gap-2  → 8px
gap-4  → 16px
gap-6  → 24px
gap-8  → 32px
```

---

## 18. Page Patterns Checklist

When creating a new page, ensure:

- ✅ Max-width container (1480px)
- ✅ Proper padding (px-6 md:px-10 lg:px-12)
- ✅ Header with eyebrow + title
- ✅ Responsive layout (mobile first)
- ✅ Empty state handling
- ✅ Loading state
- ✅ Error state
- ✅ Consistent spacing (space-y-4, space-y-6, gap-6)
- ✅ Rounded-2xl containers
- ✅ border-line borders
- ✅ bg-surface-strong backgrounds
- ✅ Dark mode compatible (already default)
- ✅ Accessibility (labels, alt text, roles)

---

**Last Updated:** 9 de mayo 2026
**Version:** 1.0
