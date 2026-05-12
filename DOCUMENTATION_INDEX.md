# 📖 Documentation Index — NEXUM Development

## Quick Navigation

### 🎯 Getting Started

1. **[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)** — Color palette, typography, spacing, components
2. **[API_INTEGRATION.md](./API_INTEGRATION.md)** — Backend API patterns and conventions
3. **[FORM_PATTERNS.md](./FORM_PATTERNS.md)** — Form input standardization
4. **[COMPONENT_ADOPTION.md](./COMPONENT_ADOPTION.md)** — Reusable components guide
5. **[PAGE_PATTERNS.md](./PAGE_PATTERNS.md)** — Page layout templates and responsive design

---

## 📊 Documentation Overview

### For Backend Developers

**Primary docs:** `API_INTEGRATION.md`

- ✅ API architecture patterns (route structure, HTTP methods)
- ✅ Authentication & authorization (RBAC, session management)
- ✅ Request/response format standards
- ✅ Common patterns (pagination, filtering, upsert, file upload, soft delete)
- ✅ Database patterns (transactions, N+1 avoidance)
- ✅ Notification integration
- ✅ Cron jobs and webhooks
- ✅ Complete endpoint reference
- ✅ Migration guide for new endpoints
- ✅ 80+ API endpoints documented

**Secondary docs:** `DESIGN_SYSTEM.md`

- Response format consistency
- Color codes and semantic meanings
- Status indicators (badges, colors)

---

### For Frontend Developers

**Primary docs:** `COMPONENT_ADOPTION.md`, `PAGE_PATTERNS.md`

- ✅ ViewModeToggle (table/list switching)
- ✅ DataTable (generic reusable table)
- ✅ DataList (generic reusable list)
- ✅ Navigation components (app-shell, user-menu)
- ✅ Layout patterns (containers, grids, forms)
- ✅ Page templates (list page, detail page)

**Secondary docs:** `FORM_PATTERNS.md`, `DESIGN_SYSTEM.md`

- Form input standardization
- Color tokens and spacing system
- Responsive breakpoints

---

### For UI/UX Designers

**Primary docs:** `DESIGN_SYSTEM.md`, `PAGE_PATTERNS.md`, `FORM_PATTERNS.md`

- ✅ Color palette (13 tokens)
- ✅ Typography (7 styles)
- ✅ Spacing system
- ✅ Component patterns
- ✅ Responsive design rules
- ✅ Layout templates

**Secondary docs:** `COMPONENT_ADOPTION.md`

- Component specifications and usage

---

### For Project Managers

**All docs** — Reference for feature scope and implementation complexity

---

## 🔑 Key Conventions by Topic

### Authentication & Authorization

**Doc:** `API_INTEGRATION.md` § 2

- All endpoints require NextAuth session
- Three roles: COACH, ADMIN, ATHLETE
- RBAC patterns: role check, coach-athlete relationship, team-based access
- Helper functions: `requireSession()`, `assertAthleteAccess()`, `assertCoachAccess()`

### API Response Format

**Doc:** `API_INTEGRATION.md` § 3

- Success: 200/201 with data
- Error: 400/401/403/404/422/500 with `{ error: "message" }`
- Validation error: 422 with `{ error, details }`
- Pagination: `{ items: [], nextCursor: "xxx" }`

### Form Inputs

**Doc:** `FORM_PATTERNS.md`

- Standard class: `rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm outline-none transition focus:border-accent`
- Label class: `text-sm font-medium text-foreground/70`
- Error state: Border turns red, error message below
- Textarea: Extra vertical padding (`py-3`), `resize-none`

### Page Layout

**Doc:** `PAGE_PATTERNS.md`

- Container: `mx-auto w-full max-w-[1480px] px-6 py-6 md:px-10 lg:px-12`
- Sections: `space-y-4` (within), `space-y-6`-`space-y-8` (between)
- Grid cards: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` with `gap-6`
- Forms: Single/two-column with `border-t border-line` separator for actions

### Components

**Doc:** `COMPONENT_ADOPTION.md`

- **ViewModeToggle:** Toggle between "table" and "list" views with localStorage persistence
- **DataTable:** Generic table with striped rows, custom render functions
- **DataList:** Card-based list with icon, title, subtitle, metadata, badge, actions
- **app-shell:** Main navigation with role-based dropdowns
- **user-menu:** Profile dropdown with role indicator

### Database Patterns

**Doc:** `API_INTEGRATION.md` § 7

- Always use transactions for batch operations
- Avoid N+1: use `include` instead of separate queries
- Use `distinct` for getting unique IDs
- Soft delete pattern: `deletedAt` field
- Audit logging: `logAudit()` and `auditMutation()`

---

## 📋 File Creation Checklist

When adding a new feature:

### Backend (New Endpoint)

1. ✅ Define Zod schema in `src/lib/validators.ts`
2. ✅ Create route file in `src/app/api/[domain]/route.ts`
3. ✅ Add authentication check (session)
4. ✅ Add RBAC check (role)
5. ✅ Validate input with schema
6. ✅ Execute DB operation (with transaction if needed)
7. ✅ Add audit logging if mutation
8. ✅ Send notification if relevant
9. ✅ Return consistent response format
10. ✅ Reference in `API_INTEGRATION.md` § 8

### Frontend (New Page)

1. ✅ Create page file in `src/app/[role]/[page]/page.tsx`
2. ✅ Use standard container pattern
3. ✅ Add header with eyebrow + title
4. ✅ Implement responsive grid/layout
5. ✅ Add empty state
6. ✅ Add loading state
7. ✅ Use ViewModeToggle if list (table/list)
8. ✅ Use DataTable or DataList component
9. ✅ Add form validation (Zod)
10. ✅ Follow `PAGE_PATTERNS.md` template

### Frontend (New Component)

1. ✅ Define TypeScript interfaces for props
2. ✅ Create in `src/components/ui/[name].tsx`
3. ✅ Add JSDoc comments
4. ✅ Use Tailwind classes from DESIGN_SYSTEM
5. ✅ Export from `src/components/ui/index.ts`
6. ✅ Add example in `COMPONENT_ADOPTION.md`
7. ✅ Keep under 300 lines
8. ✅ Handle edge cases (empty, error, loading)

### Database (Schema Change)

1. ✅ Update `prisma/schema.prisma`
2. ✅ Create migration: `npx prisma migrate dev --name description`
3. ✅ Test with seed data
4. ✅ Update API endpoints if needed
5. ✅ Update `API_INTEGRATION.md` endpoint reference

---

## 🚀 Common Tasks

### Add New Endpoint

**Reference:** `API_INTEGRATION.md` § 11

```typescript
// 1. Define schema
const bodySchema = z.object({
  /* ... */
})

// 2. Create route
export async function POST(request: Request) {
  // 3. Auth
  // 4. RBAC
  // 5. Validate
  // 6. Execute
  // 7. Audit
  // 8. Notify
  // 9. Return
}
```

### Add View Toggle to Page

**Reference:** `COMPONENT_ADOPTION.md` § 1

```tsx
// 1. Import
import { ViewModeToggle } from '@/components/ui/view-mode-toggle'

// 2. State
const [viewMode, setViewMode] = useState<'table' | 'list'>('table')

// 3. Add to header
;<ViewModeToggle value={viewMode} onChange={setViewMode} storageKey="page-view" />

// 4. Render conditionally
{
  viewMode === 'table' ? <Table /> : <List />
}
```

### Standardize Form Inputs

**Reference:** `FORM_PATTERNS.md` § 1

Use class: `rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm outline-none transition focus:border-accent`

Or use FormField wrapper component.

### Create New Page

**Reference:** `PAGE_PATTERNS.md` § 1-3

1. Use container: `mx-auto w-full max-w-[1480px] px-6 py-6 md:px-10 lg:px-12`
2. Add header section with eyebrow + title
3. Use grid for responsive layout
4. Add empty/loading states

---

## 📚 Complete Document Tree

```
DOCUMENTATION FILES:
├── DESIGN_SYSTEM.md (Color, Typography, Spacing, Component specs)
├── API_INTEGRATION.md (Backend patterns, 80+ endpoints, RBAC, DB patterns)
├── FORM_PATTERNS.md (Input standardization, all form elements)
├── COMPONENT_ADOPTION.md (Reusable components, usage examples)
├── PAGE_PATTERNS.md (Layout templates, responsive design)
└── DOCUMENTATION_INDEX.md (This file)

CODEBASE ORGANIZATION:
├── src/app/api/ (80+ endpoints following API_INTEGRATION patterns)
├── src/components/ (Components following COMPONENT_ADOPTION guide)
│   ├── ui/
│   │   ├── view-mode-toggle.tsx (Table/list toggle)
│   │   ├── data-table.tsx (Generic table)
│   │   └── data-list.tsx (Generic list)
│   ├── app-shell.tsx (Navigation)
│   ├── user-menu.tsx (Profile)
│   └── coach/, athlete/ (Role-specific components)
├── src/app/coach/, athlete/ (Pages following PAGE_PATTERNS)
├── src/lib/ (API patterns, validators, helpers)
└── prisma/ (Schema with ~25 migrations)
```

---

## 🎓 Learning Path

### New to the Project?

1. Read `DESIGN_SYSTEM.md` (10 min) — Understand visual language
2. Read `PAGE_PATTERNS.md` (15 min) — See layout structure
3. Read `FORM_PATTERNS.md` (10 min) — Learn form conventions
4. Explore `/coach/athletes/page.tsx` (5 min) — See example page

### Adding Backend Feature?

1. Review `API_INTEGRATION.md` (30 min) — Learn patterns
2. Look at similar endpoint in `src/app/api/` (5 min) — Reference implementation
3. Follow § 11 Migration Guide (10 min) — Build new endpoint
4. Reference § 8 for endpoint docs (5 min) — Update index

### Adding Frontend Feature?

1. Review `PAGE_PATTERNS.md` (20 min) — Understand layout
2. Review `COMPONENT_ADOPTION.md` (15 min) — See components
3. Look at similar page in `src/app/` (5 min) — Reference implementation
4. Follow PAGE_PATTERNS template (15 min) — Build new page

### Adding Components?

1. Review `COMPONENT_ADOPTION.md` (15 min) — See patterns
2. Review `FORM_PATTERNS.md` (10 min) — For form components
3. Look at existing components (5 min) — Reference structure
4. Build component (20 min) — Use checklist § 10

---

## 📞 Support & Questions

### By Topic

| Topic                  | Document           | Section |
| ---------------------- | ------------------ | ------- |
| API endpoint structure | API_INTEGRATION    | § 1     |
| Authentication         | API_INTEGRATION    | § 2     |
| Database queries       | API_INTEGRATION    | § 7     |
| Form inputs            | FORM_PATTERNS      | § 1-3   |
| Components             | COMPONENT_ADOPTION | § 1-7   |
| Page layout            | PAGE_PATTERNS      | § 1-5   |
| Responsive design      | PAGE_PATTERNS      | § 16    |
| Colors/spacing         | DESIGN_SYSTEM      | § 1-2   |

---

## ✅ Documentation Maintenance

This documentation is **living**. Update when:

- ✅ New patterns emerge (add to relevant doc)
- ✅ New endpoints added (update API_INTEGRATION.md)
- ✅ New components created (update COMPONENT_ADOPTION.md)
- ✅ Design system changes (update DESIGN_SYSTEM.md)
- ✅ Database schema changes (update API_INTEGRATION.md § 7)

**Last Review:** 9 de mayo 2026
**Next Review:** After next sprint or when team size grows

---

## 🎯 Implementation Status

### Backend (COMPLETE ✅)

- [x] Phase 1: Schema cleanup & migrations
- [x] Phase 2: 10 API endpoints refactored
- [x] Phase 3: 80+ endpoints documented
- [x] API_INTEGRATION.md (comprehensive guide)

### Frontend (Phase 3 - IN PROGRESS 🔄)

- [x] DESIGN_SYSTEM.md (complete)
- [x] ViewModeToggle component (3 pages using)
- [x] DataTable & DataList components
- [x] Navigation improvements (app-shell, user-menu)
- [x] FORM_PATTERNS.md (comprehensive guide)
- [x] COMPONENT_ADOPTION.md (comprehensive guide)
- [x] PAGE_PATTERNS.md (comprehensive guide)
- ⏳ Apply patterns to remaining pages
- ⏳ Create additional components

### Documentation (COMPLETE ✅)

- [x] API_INTEGRATION.md (450+ lines)
- [x] FORM_PATTERNS.md (500+ lines)
- [x] COMPONENT_ADOPTION.md (450+ lines)
- [x] PAGE_PATTERNS.md (450+ lines)
- [x] DESIGN_SYSTEM.md (130+ lines - pre-existing)

---

**Next Steps:**

1. Apply ViewModeToggle to remaining list pages (5+ pages)
2. Standardize all form inputs across app
3. Standardize all page layouts per PAGE_PATTERNS
4. Create additional reusable components
5. Add integration tests for API patterns
6. Performance audit (lazy loading, bundle size)

---

**Document Version:** 1.0
**Created:** 9 de mayo 2026
**Last Updated:** 9 de mayo 2026
**Status:** Production Ready ✅
