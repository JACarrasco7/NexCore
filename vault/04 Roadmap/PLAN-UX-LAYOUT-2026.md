# PLAN UX/LAYOUT 2026 — Rediseño “sin scroll inútil”

> Objetivo: que cualquier pantalla del coach y del atleta muestre **información útil arriba** sin scroll, con distribución horizontal, navegación intuitiva y aside contextual por pestaña.
> Alcance: front + back (ajustes API si es necesario para alimentar nuevos paneles).
> No incluir: cambios de modelo de negocio ni de roles. Mantener auth y ownership tal cual.

---

## 0. Principios de diseño

1. **Above the fold primero**: el primer viewport debe responder “¿qué pasa con este atleta hoy?”.
2. **Horizontal antes que vertical**: usar 2-3 columnas en desktop ≥1280 antes de apilar.
3. **Aside contextual por pestaña**: la columna izquierda cambia su contenido según la tab activa (no es solo header).
4. **Densidad equilibrada**: paddings consistentes (`p-4 / p-5`), `space-y-4` por defecto, `space-y-5` solo entre secciones grandes.
5. **Scroll local, no global**: listas largas (sesiones, check-ins, documentos) con `max-h` + scroll interno.
6. **Cero overflow horizontal**: ya hay `overflow-x: clip` global, pero seguir auditando contenedores con `min-w-0` en columnas flex/grid.
7. **Tabs jerárquicas**: tabs principales (nivel 1) y subtabs (nivel 2) con estilos distintos para no confundir.
8. **Cargas perezosas**: cada tab/subtab carga sus datos solo cuando se activa.

---

## 1. Auditoría inicial (read-only)

Antes de tocar nada, listar y revisar:

- `src/app/coach/athletes/[id]/page.tsx`
- `src/app/coach/page.tsx` (dashboard coach)
- `src/app/coach/athletes/page.tsx` (lista atletas)
- `src/app/coach/nutrition/page.tsx`
- `src/app/coach/messages/page.tsx`
- `src/app/coach/wall/page.tsx`
- `src/app/coach/service-plans/page.tsx`
- `src/app/coach/posing-lab/page.tsx`
- `src/app/coach/import-lab/page.tsx`
- `src/app/athlete/page.tsx` y subrutas (`plan`, `nutrition`, `training-log`, `daily-log`, `check-in`, `wall`, `gym-machines`, `progress`)
- `src/components/app-shell.tsx`
- `src/components/section-intro.tsx`
- `src/components/stat-card.tsx`
- `src/components/coach/athlete-context-panel.tsx`
- `src/app/api/athletes/[id]/overview/route.ts`
- `src/app/api/athletes/[id]/training-stats/route.ts`
- `src/app/api/coach/today/route.ts`
- `src/app/api/coach/inbox/route.ts`

Entregable: tabla en este mismo MD con:

- Ruta
- Densidad actual (alta/media/baja)
- Problemas detectados (scroll excesivo, overflow, info útil tarde, jerarquía pobre)
- Acción propuesta

---

## 2. Sistema de layout reutilizable

Crear primitivas reutilizables para estandarizar todas las pantallas.

### 2.1 `PageShell`
- Contenedor base `mx-auto w-full max-w-[1480px] px-6 md:px-10 lg:px-12 py-6`.
- Slot `header` opcional (titulo + acciones globales).
- Slot `aside` opcional (sticky en xl).
- Slot `main`.

### 2.2 `SplitLayout`
- Variante `aside-left` (default): `xl:grid-cols-[340px_minmax(0,1fr)]`.
- Variante `aside-right`.
- Variante `wide-aside`: `xl:grid-cols-[420px_minmax(0,1fr)]` para vistas con mucho contexto.
- `aside` aplica `xl:sticky xl:top-24 self-start`.

### 2.3 `TabsBar`
- Componente accesible (rol `tablist`), keyboard nav.
- Variante `primary` (pill grande) y `secondary` (subtab).
- Muestra badge opcional por tab.

### 2.4 `SectionCard`
- `rounded-2xl border border-line bg-surface-strong`.
- Slots: `title`, `description`, `actions`, `children`.
- Densidad por prop: `compact | default | comfortable`.

### 2.5 `EmptyState`
- Compacto por defecto (`py-6` no `py-14`).
- Slots: icono, título, descripción, acción.

### 2.6 `ScrollList`
- Wrapper con `max-h` configurable y `overflow-y-auto pr-1`.
- Footer opcional con “mostrar más” / contador.

Ubicación propuesta: `src/components/layout/`.

---

## 3. Detalle de atleta (coach) — vista ancla

Ya migrada a 2 columnas. Refinar con **aside dinámico** según tab.

### 3.1 Aside dinámico

| Tab activa | Aside muestra |
|---|---|
| Resumen | Identidad + KPIs + acciones rápidas (registro/nutri/mensaje) |
| Estadísticas | KPIs + selector de rango (7/30/90/all) + leyenda zonas (MEV/MAV/MRV) |
| Check-ins | KPIs + filtro estado (todos / sin respuesta) + atajo “responder último” |
| Entrenamiento | Plan activo (mini card) + atajos a editar/duplicar/imprimir |
| Contexto | Resumen de restricciones + atajo “editar contexto” + “ver maquinaria” (read-only) |
| Nutrición | Plan activo (mini card) + macros target + atajo crear plan |
| Documentos | Filtros por categoría + acción subir documento |

### 3.2 Main por tab

- **Resumen**: 1 fila alertas, 1 fila último check-in + plan, mini gráfico tendencia, sesiones recientes con scroll local.
- **Estadísticas**: subtabs ya existen (Composición / Adherencia / Entrenamiento / Volumen / Nutrición). Mantener.
- **Check-ins**: lista con `ScrollList` y editor en panel lateral derecho expandible (no más modales obstaculizando).
- **Entrenamiento**: lista de planes en tabla compacta + drawer detalle (en vez de modal full).
- **Contexto**: 2 columnas internas (restricciones + maquinaria read-only).
- **Nutrición**: cards horizontales + drawer detalle.
- **Documentos**: grid 3 col en xl, 2 en lg, 1 en sm.

### 3.3 Cambios concretos

- Pasar modales `TrainingPlanModal`, `NutritionPlanModal`, `AddMeasurementModal`, sheet de adherencia → a un `Drawer` reutilizable lateral derecho (sin tapar pantalla completa).
- Sticky para tabs principales y subtabs (offset corregido).

---

## 4. Otras pantallas — patrón aside contextual

Aplicar el mismo patrón `SplitLayout` con aside contextual.

### 4.1 Dashboard coach (`/coach`)
- Aside: filtros (rango fechas, segmento atletas) + atajos crear plan / añadir atleta / muro.
- Main: KPIs en grid 4 col, fila de alertas (atletas en riesgo), inbox preview.

### 4.2 Lista atletas (`/coach/athletes`)
- Aside: filtros por fase, objetivo, adherencia, estado check-in.
- Main: tabla compacta con sparkline por atleta + acción rápida “abrir”.
- Eliminar tarjetas grandes verticales si existen.

### 4.3 Nutrición coach (`/coach/nutrition`)
- Aside: lista de plantillas + buscador alimento.
- Main: editor de plan en columnas (comidas | macros agregados | preview).

### 4.4 Mensajes (`/coach/messages`)
- 3 columnas reales: lista contactos | hilo | metadata atleta (KPIs).
- Hilo con scroll interno, no de página.

### 4.5 Service plans / Posing lab / Import lab
- Aside con pasos del wizard si aplica.
- Main con preview en vivo.

### 4.6 Atleta — `/athlete`
- Aside fija: avatar, fase, próximo check-in, racha.
- Main con tabs propias: Hoy / Plan / Nutrición / Progreso.
- “Hoy” muestra: workout planeado, registro nutrición rápido, último mensaje del coach.

### 4.7 Atleta — `gym-machines`
- Aside con filtros (grupo muscular) + botón añadir.
- Main grid 2-3 col.

---

## 5. App-shell global

- Reducir altura del header para ganar pixels arriba (`py-3`).
- Nav desktop: si supera ancho → colapsar “…” en lugar de desbordar.
- Subnav opcional debajo del header en pantallas que tengan tabs principales (compartir componente `TabsBar`).
- Footer: ocultar en pantallas saturadas (vistas “workspace”) o reducir a 1 línea.

---

## 6. Backend / API — soportes nuevos

Solo lo necesario para alimentar el aside contextual sin n+1 fetches.

### 6.1 Endpoints a revisar

- `GET /api/athletes/[id]/overview`
  - Confirmar que devuelve: KPIs base, último check-in, plan activo (entrenamiento + nutrición), conteo documentos por categoría.
  - Añadir si falta: `nextCheckInDueAt`, `streakDays`, `restrictionsCount`.

- `GET /api/coach/today`
  - Añadir `atRiskAthletes[]` (criterios: adherencia <60%, sin check-in >10 días, sin sesiones 7 días).

- `GET /api/athletes/[id]/training-stats`
  - Aceptar `?range=7|30|90|all` para alinear con selector de aside.

- `GET /api/coach/inbox`
  - Devolver `unreadByAthleteId` para badge en aside de mensajes.

### 6.2 Reglas

- No romper contratos existentes. Añadir campos opcionales.
- Mantener `assertAthleteSelfAccess` y filtros por rol.
- Cachear KPIs simples por request (`React.cache` en server components donde aplique).

---

## 7. Accesibilidad y rendimiento

- `tablist` con `aria-selected`, `aria-controls`, navegación por teclado.
- Drawer con focus trap y `aria-modal`.
- `prefers-reduced-motion` para animaciones de subtabs.
- Lazy-load gráficos pesados (`next/dynamic`) por sub-sección de Estadísticas.
- Suspense boundaries por panel del aside cuando dependa de fetch propio.

---

## 8. Migración por fases

| Fase | Alcance | Riesgo |
|---|---|---|
| 1 | Crear primitivas (`PageShell`, `SplitLayout`, `TabsBar`, `SectionCard`, `EmptyState`, `ScrollList`, `Drawer`) | Bajo |
| 2 | Migrar detalle atleta (aside dinámico + drawers) | Medio |
| 3 | Migrar dashboard coach + lista atletas | Medio |
| 4 | Migrar mensajes (3 col) y nutrición coach | Medio-alto |
| 5 | Migrar vistas atleta (`/athlete`, `plan`, `nutrition`, `training-log`, `daily-log`) | Medio |
| 6 | Ajustes back: campos extra `overview`, `today`, `training-stats?range` | Bajo |
| 7 | Pulido a11y + lazy-load gráficos + auditoría final | Bajo |

Cada fase termina con `npx tsc --noEmit` + `npm run build` verdes.

---

## 9. Criterios de aceptación

- En desktop ≥1440 px, **toda vista principal** muestra info útil sin scroll inicial.
- Listas largas usan scroll local, no de página.
- Sin overflow horizontal en ninguna ruta.
- Tabs y subtabs accesibles por teclado.
- Aside contextual cambia según tab/subtab.
- Modales obstructivos sustituidos por drawers laterales donde aplique.
- `npm run build` sin warnings nuevos.

---

## 10. Preguntas a confirmar antes de implementar

1. ¿Aside fijo a 340 px o variable (320–420) según vista? ->  Fijo a 340 px  
2. ¿Drawer derecho universal para detalles, o mantener algunos modales (ej. confirmaciones)? Drawer para detalles / Modal para confirmaciones  
3. ¿Mostrar/ocultar footer en vistas “workspace” (detalle atleta, mensajes, nutrición editor)? Ocultar footer en workspace  
4. ¿Agregar selector de rango (7/30/90/all) en Estadísticas ahora o en fase posterior? Añádelo ahora  
5. ¿Migrar también las vistas del atleta en este ciclo o solo coach primero? Solo coach primero, luego atleta en fase posterior para no mezclar contextos 
6. ¿Permitir que el coach colapse el aside (botón → más espacio main)?  Sí, colapsable  
7. ¿Persistir la tab activa en URL (`?tab=stats&section=composicion`) para enlaces directos? Sí, 100%  

---

## 11. Fuera de alcance (explícito)

- Rediseño de identidad visual / paleta.
- Cambios de schema Prisma.
- Onboarding y registro.
- Print views (`/print`).
- Internacionalización.
