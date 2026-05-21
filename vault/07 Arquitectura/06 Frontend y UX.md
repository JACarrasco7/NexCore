# 06 — Frontend, Páginas, Componentes y UX

## Principios

- **Páginas son orquestadores**, no contenedores de lógica de negocio.
- **Componentes son tontos por defecto**. Reciben datos y emiten eventos.
- **Hooks encapsulan estado/IO**.
- **Server Components** para datos estáticos/SEO; **Client Components** sólo donde hay interactividad.
- **Streaming + Suspense** para listados pesados.

## Estructura propuesta

```
src/
  app/
    (marketing)/         -- landing pública
    (auth)/login, register, onboarding
    coach/
      layout.tsx         -- shell coach
      page.tsx           -- dashboard
      athletes/...
      plans/...
      nutrition/...
      team/...
    athlete/
      layout.tsx         -- shell atleta
      page.tsx           -- dashboard
      plan/, nutrition/, progress/, profile/
  components/
    ui/                  -- primitives (Button, Input, Modal, Card)
    layout/              -- AppShell, Aside, Topbar
    domain/              -- componentes de negocio
      training/
        plan-form.tsx
        plan-list.tsx
        session-card.tsx
        exercise-search.tsx
      nutrition/
        plan-form.tsx
        meal-builder.tsx
        food-search.tsx
      athlete/
        athlete-card.tsx
        athlete-aside.tsx
      shared/
        stat-card.tsx
        sparkline.tsx
```

## Inventario actual y refactor sugerido

### `src/app/coach/nutrition/page.tsx` (~1200 líneas)
**Refactor**:
- Extraer `<NutritionPlanForm>` → `components/domain/nutrition/plan-form.tsx`.
- Extraer `<MealBuilder>` → `components/domain/nutrition/meal-builder.tsx`.
- Extraer `<NutritionTemplatesPanel>`.
- La página queda: carga datos + ensambla.

### `src/app/coach/plans/new/page.tsx`
**Refactor**:
- `<PlanWizardStep1Metadata>`, `<PlanWizardStep2Sessions>`, `<PlanWizardStep3Assign>`.
- Hook `usePlanWizard()` con state machine (`xstate` o reducer).

### `src/components/floating-chat.tsx`
**Refactor**:
- `<AthleteFloatingChat>` (vista simple) y `<CoachFloatingInbox>` (vista compleja con conversaciones).
- Hook `useChat(peerId)` para conexión + mensajes.

### `src/components/app-shell.tsx`
**OK**. Migrar a Server Component cuando sea estable (sin estado).

### `src/lib/store.ts`
**Refactor**:
- Dividir por dominio en `src/lib/hooks/`.
- Migrar a React Query (ver [[05 APIs y Arquitectura Tecnica]]).

## Patrón de páginas

```tsx
// src/app/coach/athletes/page.tsx
import { AthleteListSection } from '@/components/domain/athlete/athlete-list-section';

export default async function CoachAthletesPage() {
  // Server: chequeo de auth + datos iniciales
  const session = await requireSession();
  const initial = await athleteService.listByCoach(session.user.id);

  return (
    <AppShell>
      <AthleteListSection initialData={initial} />
    </AppShell>
  );
}
```

```tsx
// components/domain/athlete/athlete-list-section.tsx (Client)
'use client';
export function AthleteListSection({ initialData }) {
  const { data } = useAthletes({ initialData });
  return <AthleteList athletes={data.items} />;
}
```

## Sistema de diseño

### Primitivas (`components/ui/`)
- `Button` (variant: primary/secondary/ghost/danger).
- `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `RadioGroup`.
- `Modal`, `Sheet`, `Popover`, `Tooltip`.
- `Card`, `Badge`, `Alert`, `Toast`.
- `Tabs`, `Accordion`, `Dropdown`.

Mantener Tailwind + `cva` para variantes (`class-variance-authority`).

### Tokens
Definir en `globals.css` o `tailwind.config.ts`:
- Colores semánticos: `--color-primary`, `--color-success`, `--color-danger`, `--color-warning`.
- Spacing escala 4px.
- Radios: `--radius-sm`, `--radius`, `--radius-lg`.
- Sombras: `--shadow-sm/md/lg`.

### Modo oscuro
- Single source: `data-theme` en `<html>`.
- `ThemeProvider` lee localStorage + `prefers-color-scheme`.

## Estados visuales obligatorios

Cada componente de datos debe manejar:
1. **Loading** (skeleton).
2. **Empty** (mensaje + CTA).
3. **Error** (mensaje + retry).
4. **Success**.

Helper:

```tsx
// components/ui/data-view.tsx
export function DataView<T>({ query, empty, error, children }: {
  query: UseQueryResult<T>;
  empty?: ReactNode;
  error?: (e: Error) => ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (query.isLoading) return <Skeleton />;
  if (query.isError) return error?.(query.error) ?? <DefaultError onRetry={query.refetch} />;
  if (Array.isArray(query.data) && query.data.length === 0) return empty ?? <Empty />;
  return <>{children(query.data)}</>;
}
```

## Accesibilidad

- Todo input con `<label>` asociado.
- Modal con focus trap y `aria-modal`.
- Navegación teclado completa.
- Contraste WCAG AA (verificar tokens dark).

## Internacionalización (futuro)

- Preparar para `next-intl`: extraer strings a `messages/es.json`.
- No bloqueante ahora; planear post-MVP.

## Performance frontend

| Mejora | Acción |
|---|---|
| Imágenes optimizadas | `next/image` siempre, lazy por defecto |
| Code splitting | `dynamic(() => import(...))` para editores pesados (PlanForm, FoodSearch) |
| Memoización | `useMemo` en cálculos en listas largas (compliance, sparklines) |
| Virtualización | `@tanstack/react-virtual` en listas >100 (logs, atletas) |
| Bundle | analizar con `@next/bundle-analyzer`; targets: <250KB JS inicial |

## Telemetría UX

- `posthog-js` o `vercel/analytics` para tracking de pantallas + eventos clave (plan_created, checkin_submitted).
- Eventos definidos en `src/lib/analytics/events.ts`.

## Onboarding visual

Stepper persistente en `/onboarding`:
- Coach: verify email → datos → crear team → invitar atleta.
- Atleta: verify email → contexto → consents → ver plan.

Almacenar progreso en `User.onboardingStep` para retomar.

## Resumen — refactor frontend priorizado

1. **React Query** + migrar `store.ts`.
2. **Extraer componentes** de páginas gigantes (nutrition, plans/new, floating-chat).
3. **DataView helper** + estados visuales consistentes.
4. **Code splitting** en editores pesados.
5. **Tests** de componentes domain (Vitest + Testing Library).
