# 🧩 Component Adoption Guide — Reusable Components

## Overview

Este documento describe todos los componentes reutilizables disponibles en NEXUM y cómo usarlos correctamente.

**Goals:**

- Reducir duplicación de código
- Asegurar consistencia visual
- Facilitar mantenimiento
- Escalar fácilmente

**Location:** `src/components/`

---

## 1. ViewModeToggle Component

### Purpose

Permitir al usuario cambiar entre vista de tabla (grid) y lista (cards).

### Files

- `src/components/ui/view-mode-toggle.tsx` ✅ (Ready)

### Props

```typescript
interface ViewModeToggleProps {
  value: 'table' | 'list' // Current mode
  onChange: (mode: 'table' | 'list') => void // Callback on change
  storageKey?: string // Optional: localStorage key for persistence
}
```

### Usage Example

```tsx
import { ViewModeToggle } from '@/components/ui/view-mode-toggle'

export function AthletesPage() {
  const [viewMode, setViewMode] = useState<'table' | 'list'>('table')

  return (
    <div className="space-y-6">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Atletas</h1>
        <ViewModeToggle value={viewMode} onChange={setViewMode} storageKey="athletes-view-mode" />
      </div>

      {/* Conditional rendering */}
      {viewMode === 'table' ? (
        <AthletesTable athletes={athletes} />
      ) : (
        <AthletesList athletes={athletes} />
      )}
    </div>
  )
}
```

### Features

- ✅ Persists to localStorage automatically
- ✅ Two buttons: "📊 Tabla" and "📋 Lista"
- ✅ Visual feedback (active button highlighted)
- ✅ Hydration-safe for SSR

### Already Implemented In

- `/coach/athletes/page.tsx` ✅
- `/coach/team/page.tsx` ✅
- `/coach/service-plans/page.tsx` ✅

### Add to New Pages

```tsx
// 1. Import
import { ViewModeToggle } from '@/components/ui/view-mode-toggle'

// 2. Add state
const [viewMode, setViewMode] = useState<'table' | 'list'>('table')

// 3. Add toggle to header
;<ViewModeToggle value={viewMode} onChange={setViewMode} storageKey="page-name-view" />

// 4. Render conditionally
{
  viewMode === 'table' ? <TableView /> : <ListView />
}
```

---

## 2. DataTable Component

### Purpose

Generic reusable table component with striped rows, hover effects, and column customization.

### Files

- `src/components/ui/data-table.tsx` ✅ (Ready)

### Type Definitions

```typescript
interface Column<T> {
  key: keyof T
  header: string
  render?: (value: T[keyof T], item: T) => React.ReactNode // Custom render
  className?: string // Custom column styling
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (item: T) => void
  emptyMessage?: string
  striped?: boolean // Default: true
}
```

### Usage Example

```tsx
import { DataTable } from '@/components/ui/data-table'

export function AthletesTable({ athletes }: { athletes: Athlete[] }) {
  return (
    <DataTable<Athlete>
      data={athletes}
      columns={[
        {
          key: 'fullName',
          header: 'Atleta',
          render: (name, athlete) => (
            <Link href={`/coach/athletes/${athlete.id}`} className="text-accent hover:underline">
              {name}
            </Link>
          ),
        },
        {
          key: 'goal',
          header: 'Objetivo',
          render: (goal) => (
            <span className="bg-accent/10 text-accent rounded-full px-2.5 py-1 text-xs font-medium">
              {goal === 'volumen'
                ? 'Volumen'
                : goal === 'definicion'
                  ? 'Definición'
                  : 'Mantenimiento'}
            </span>
          ),
        },
        {
          key: 'phaseLabel',
          header: 'Fase',
        },
        {
          key: 'id',
          header: 'Acciones',
          render: (id) => (
            <button onClick={() => handleEdit(id)} className="text-accent text-sm hover:underline">
              Editar
            </button>
          ),
        },
      ]}
      onRowClick={(athlete) => console.log('Clicked:', athlete.id)}
      emptyMessage="No hay atletas disponibles"
    />
  )
}
```

### Features

- ✅ Type-safe with generics
- ✅ Striped rows (alternating bg)
- ✅ Hover states
- ✅ Custom render functions per column
- ✅ Empty state handling
- ✅ Row click handlers

### Output HTML

```html
<table className="w-full">
  <thead>
    <tr className="text-sm font-medium text-foreground/70">
      <th>Atleta</th>
      <th>Objetivo</th>
      <!-- etc -->
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-line hover:bg-surface-strong">
      <!-- Striped: every 2nd row has bg-surface-strong -->
      <td>...</td>
    </tr>
  </tbody>
</table>
```

### Already Implemented In

- `/coach/athletes/page.tsx` (TABLE view) ✅

---

## 3. DataList Component

### Purpose

Generic reusable list (card-based) component for non-table data display.

### Files

- `src/components/ui/data-list.tsx` ✅ (Ready)

### Type Definitions

```typescript
interface ListItem<T> {
  id: string
  title: string
  subtitle?: string
  icon?: React.ReactNode
  metadata?: string // Secondary info (e.g., "5 sesiones")
  badge?: { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }
  actions?: Array<{
    icon: React.ReactNode
    label: string
    onClick: (item: T) => void
  }>
}

interface DataListProps<T> {
  data: T[]
  renderItem: (item: T) => ListItem<T>
  onItemClick?: (item: T) => void
  emptyMessage?: string
}
```

### Usage Example

```tsx
import { DataList } from '@/components/ui/data-list'

export function AthletesList({ athletes }: { athletes: Athlete[] }) {
  return (
    <DataList<Athlete>
      data={athletes}
      renderItem={(athlete) => ({
        id: athlete.id,
        title: athlete.fullName,
        subtitle: athlete.phone || athlete.contactEmail,
        icon: '👤',
        metadata: `${athlete.phaseLabel} • ${athlete.goal}`,
        badge: {
          label: athlete.goal === 'volumen' ? 'Volumen' : 'Definición',
          variant: athlete.goal === 'volumen' ? 'success' : 'warning',
        },
        actions: [
          {
            icon: '✏️',
            label: 'Editar',
            onClick: (a) => router.push(`/coach/athletes/${a.id}`),
          },
          {
            icon: '📊',
            label: 'Estadísticas',
            onClick: (a) => setSelectedAthlete(a.id),
          },
        ],
      })}
      onItemClick={(athlete) => router.push(`/coach/athletes/${athlete.id}`)}
      emptyMessage="No hay atletas disponibles"
    />
  )
}
```

### Features

- ✅ Card-based layout
- ✅ Icon, title, subtitle, metadata
- ✅ Optional badge with variants
- ✅ Action buttons per item
- ✅ Click handlers
- ✅ Responsive grid

### Output HTML

```html
<div className="grid grid-cols-1 gap-4">
  <!-- For each item: -->
  <div
    className="flex items-center gap-4 rounded-2xl border border-line bg-surface-strong p-4 hover:bg-surface-strong/80 cursor-pointer"
  >
    <span className="text-2xl">👤</span>
    <div className="flex-1">
      <h3 className="font-medium">Title</h3>
      <p className="text-sm text-foreground/50">Subtitle</p>
      <p className="text-xs text-foreground/70">Metadata</p>
    </div>
    <span className="px-2.5 py-1 rounded-full text-xs font-medium">Badge</span>
    <div className="flex gap-2">
      <!-- Actions -->
    </div>
  </div>
</div>
```

### Already Implemented In

- `/coach/athletes/page.tsx` (LIST view) ✅
- `/coach/team/page.tsx` (LIST view) ✅

---

## 4. Navigation Components

### 4.1 app-shell.tsx (Main Layout)

#### Purpose

Main navigation layout with responsive sidebar, navbar, and user menu.

#### Props

```typescript
interface NavItem {
  label: string
  href: string
  icon?: React.ReactNode
}

interface NavGroup {
  title: string
  items: NavItem[]
}
```

#### Features

- ✅ Role-based navigation (COACH, ATHLETE, ADMIN)
- ✅ Dropdown groups (hover on desktop, accordion on mobile)
- ✅ Dark mode support
- ✅ Unread notification badge
- ✅ User profile menu
- ✅ Theme toggle

#### Usage

```tsx
import { AppShell } from '@/components/app-shell'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
```

#### Coach Navigation Structure

```
Atletas
  ├── Listado
  └── Importar
Equipos
  ├── Gestión
  └── Catálogo
Planes
  ├── Plantillas
  └── Entrenamiento
Nutrición
  ├── Planes
  └── Registro
Comunicación
  ├── Mensajes
  └── Wall
```

#### Athlete Navigation Structure

```
Mi Plan
Sesiones
Check-in
Nutrición
Progreso
Chat
```

### 4.2 user-menu.tsx (Profile Dropdown)

#### Purpose

User profile menu with role indicator and quick links.

#### Output

```
┌─────────────────────────┐
│  [Avatar] John Smith    │
│  coach@example.com      │
│  Coach (COACH icon)     │
├─────────────────────────┤
│  Perfil                 │
│  Configuración          │
│  Equipo                 │
├─────────────────────────┤
│  Cerrar sesión          │
└─────────────────────────┘
```

---

## 5. Layout & Container Components

### 5.1 Page Layout Pattern

**Standard page structure** (used across all pages):

```tsx
export default function PageName() {
  return (
    <main className="mx-auto w-full max-w-[1480px] px-6 py-6 md:px-10 lg:px-12">
      {/* Header with intro + actions */}
      <section className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-foreground/70 text-sm font-medium">Eyebrow</p>
          <h1 className="text-2xl font-bold">Page Title</h1>
        </div>
        <div className="flex gap-2">{/* Action buttons */}</div>
      </section>

      {/* Main content */}
      <section className="space-y-6">{/* Content */}</section>
    </main>
  )
}
```

### 5.2 Section Layout

```tsx
<section className="space-y-4">
  <h2 className="text-foreground text-lg font-semibold">Section Title</h2>
  <div className="border-line bg-surface-strong rounded-2xl border p-6">{/* Content */}</div>
</section>
```

### 5.3 Card Pattern

```tsx
<div className="border-line bg-surface-strong hover:border-accent/50 rounded-2xl border p-6 transition">
  <h3 className="mb-2 font-medium">Card Title</h3>
  <p className="text-foreground/70 text-sm">Card content...</p>
</div>
```

---

## 6. Status Badge Component

### Purpose

Display status indicators with consistent styling.

### Variants

```tsx
// Success
<span className="px-2.5 py-1 rounded-full bg-emerald-900/30 text-xs font-medium text-emerald-400">
  Activo
</span>

// Warning
<span className="px-2.5 py-1 rounded-full bg-amber-900/30 text-xs font-medium text-amber-400">
  Pendiente
</span>

// Danger
<span className="px-2.5 py-1 rounded-full bg-red-900/30 text-xs font-medium text-red-400">
  Inactivo
</span>

// Default (accent)
<span className="px-2.5 py-1 rounded-full bg-accent/10 text-xs font-medium text-accent">
  Volumen
</span>
```

---

## 7. Modal/Dialog Pattern

### Using Native Dialog (Recommended)

```tsx
import { useRef } from 'react'

export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="border-line bg-surface-strong max-w-sm rounded-2xl border p-6 backdrop:bg-black/50"
    >
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <p className="text-foreground/70 mb-6 text-sm">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="border-line hover:bg-surface-strong rounded-2xl border px-6 py-2.5 text-sm font-medium"
        >
          Cancelar
        </button>
        <button
          onClick={() => {
            onConfirm()
            dialogRef.current?.close()
          }}
          className="rounded-2xl bg-red-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-700"
        >
          Confirmar
        </button>
      </div>
    </dialog>
  )
}
```

---

## 8. Loading & Empty States

### Loading Spinner

```tsx
<div className="flex items-center justify-center py-12">
  <div className="border-line border-t-accent h-8 w-8 animate-spin rounded-full border-4" />
</div>
```

### Empty State

```tsx
<div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
  <div className="text-4xl">📭</div>
  <h3 className="text-lg font-medium">No hay datos</h3>
  <p className="text-foreground/70 text-sm">Crea tu primer elemento para empezar.</p>
  <button className="bg-accent rounded-2xl px-6 py-2.5 text-sm font-medium text-white">
    Crear ahora
  </button>
</div>
```

---

## 9. Toast Notifications

### Using React Toastify (if added)

```tsx
import { toast } from 'react-toastify'

// Success
toast.success('Cambios guardados correctamente')

// Error
toast.error('Error al guardar')

// Info
toast.info('Operación en progreso')
```

---

## 10. Component Checklist

When creating a new component, ensure:

- ✅ **Naming**: PascalCase, descriptive (e.g., `AthletesTable`, `UserMenu`)
- ✅ **Types**: Define interfaces for props and data
- ✅ **Props**: Use destructuring with default values
- ✅ **Styling**: Use Tailwind classes consistently
- ✅ **Accessibility**: Add `id`, `aria-label`, `role` attributes
- ✅ **Error Handling**: Handle edge cases (empty data, errors)
- ✅ **Documentation**: JSDoc comments for complex components
- ✅ **Export**: Named export in index file if in subdirectory

---

## 11. Recommended Component Directory Structure

```
src/components/
├── ui/
│   ├── index.ts                 # Export all
│   ├── view-mode-toggle.tsx     # ✅
│   ├── data-table.tsx           # ✅
│   ├── data-list.tsx            # ✅
│   ├── badge.tsx                # Status/badge component
│   ├── button.tsx               # Reusable button
│   ├── input.tsx                # Reusable input
│   ├── select.tsx               # Reusable select
│   └── modal.tsx                # Dialog/modal wrapper
├── app-shell.tsx                # ✅ Main layout
├── user-menu.tsx                # ✅ Profile dropdown
├── coach/
│   ├── athletes-table.tsx
│   ├── athletes-list.tsx
│   └── ...
├── athlete/
│   ├── plan-view.tsx
│   └── ...
└── layout/
    ├── page-header.tsx
    ├── footer.tsx
    └── ...
```

---

## 12. Component Usage Guidelines

### ✅ DO:

- Reuse DataTable for list displays
- Use ViewModeToggle for table/list switching
- Keep components under 300 lines
- Extract logic to custom hooks
- Use TypeScript for type safety
- Document complex props
- Test edge cases (empty data, errors)

### ❌ DON'T:

- Duplicate DataTable code
- Create inline styled divs (use components)
- Use any TypeScript types
- Skip error handling
- Create components for single use
- Forget responsive design
- Ignore accessibility

---

## 13. Future Components to Create

Priority list for next phase:

1. **FormField Component** — Wrapper for label + input + error + helper
2. **SelectField Component** — Select with icon and validation
3. **DateRangeInput** — Date range picker
4. **FileUpload** — File upload with preview
5. **Pagination** — Reusable pagination component
6. **Tabs Component** — Tabbed content switcher
7. **Breadcrumbs** — Navigation breadcrumbs
8. **Alert Component** — Inline alerts/notifications
9. **Skeleton Loaders** — Loading state placeholders
10. **Dropdown Menu** — Context menu component

---

**Last Updated:** 9 de mayo 2026
**Version:** 1.0
