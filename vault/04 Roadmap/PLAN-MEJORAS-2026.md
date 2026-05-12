# Plan de Mejoras — App Fitness 2026

> Auditoría completa + roadmap priorizado. Foco: UX del coach, información clara y rápida de entender, APIs faltantes.

---

## 0. Diagnóstico ejecutivo

| Aspecto                   | Hoy                        | Objetivo                 |
| ------------------------- | -------------------------- | ------------------------ |
| Arquitectura              | 8/10 sólida                | Mantener                 |
| Cobertura CARRIX Tech     | 7/10 (70% flujos)          | 95%                      |
| UX/Estilo                 | 6/10 inconsistente         | 9/10 sistema unificado   |
| APIs                      | 6.5/10 (falta CRUD planes) | 9/10 endpoints completos |
| Componentes reutilizables | 5/10                       | 9/10 design system       |
| Producción ready          | 4/10 (TODOs, mock data)    | 9/10                     |

**Veredicto:** base demo sólida, no producción. 2-3 sprints enfocados.

---

## 1. Bugs críticos a tapar (P0 — esta semana)

| #   | Bug                                                                      | Archivo                                              | Esfuerzo |
| --- | ------------------------------------------------------------------------ | ---------------------------------------------------- | -------- |
| 1   | Weight hardcodeado 75kg en cálculos RIR                                  | `src/app/athlete/training-log/page.tsx` (~L321 TODO) | S        |
| 2   | Stats del dashboard del coach son mock                                   | `src/app/coach/page.tsx`                             | M        |
| 3   | Delete actions sin confirmación (riesgo data loss)                       | global                                               | S        |
| 4   | `/athlete/[id]` sin protección de rol (cualquier athlete puede ver otro) | `src/app/athlete/[id]/page.tsx`                      | S        |
| 5   | Mobile: grid 4 col no responde en `coach/page` y athlete list            | varios                                               | S        |
| 6   | Coach signals usa tooltips falsos (info "escondida")                     | `coach/athletes/[id]`                                | S        |

---

## 2. Sistema de diseño — fundación obligatoria

Sin esto el resto se vuelve inconsistente. Crear primero.

### 2.1 Componentes base nuevos

| Componente               | Path                                   | Uso                                            |
| ------------------------ | -------------------------------------- | ---------------------------------------------- |
| `Modal`                  | `src/components/ui/modal.tsx`          | Reemplaza modales ad-hoc en cada página        |
| `ConfirmDialog`          | `src/components/ui/confirm-dialog.tsx` | Delete/acciones destructivas                   |
| `Toast` (con provider)   | `src/components/ui/toast.tsx`          | Feedback no bloqueante (guardado, error, etc.) |
| `EmptyState`             | `src/components/ui/empty-state.tsx`    | Listas vacías con CTA                          |
| `Skeleton`               | `src/components/ui/skeleton.tsx`       | Loading states                                 |
| `Pagination`             | `src/components/ui/pagination.tsx`     | Tablas largas                                  |
| `DataTable`              | `src/components/ui/data-table.tsx`     | Sortable/paginated genérico                    |
| `Dropdown`               | `src/components/ui/dropdown.tsx`       | Menús de acciones (3 puntos)                   |
| `Breadcrumb`             | `src/components/ui/breadcrumb.tsx`     | Navegación profunda                            |
| `Tabs`                   | `src/components/ui/tabs.tsx`           | Reemplaza el patrón TABS inline en cada página |
| `Tooltip` (Popover real) | `src/components/ui/tooltip.tsx`        | Floating UI / Radix                            |

### 2.2 Design tokens — consolidar

- Auditar `globals.css` y unificar variables de color
- Documentar paleta semántica: success / warning / danger / info
- Dejar de usar colores inline (`text-yellow-400`, etc.) → tokens (`text-warning`)
- Espaciados consistentes (no más mezclar `gap-3` y `gap-4` arbitrariamente)
- Tipografía: definir escala (display, h1-h4, body, caption)

---

## 3. APIs faltantes (P0/P1)

### 3.1 Críticas (P0)

| Endpoint                                         | Método         | Función                           | Esfuerzo |
| ------------------------------------------------ | -------------- | --------------------------------- | -------- |
| `/api/plans/[id]`                                | PATCH/DELETE   | Editar/eliminar plan existente    | M        |
| `/api/plans/[id]/sessions/[sid]`                 | PATCH/DELETE   | Editar sesión individual del plan | M        |
| `/api/plans/[id]/sessions/[sid]/exercises/[eid]` | PATCH/DELETE   | Editar ejercicio individual       | M        |
| `/api/notifications`                             | GET/POST/PATCH | Sistema de notificaciones         | M        |
| `/api/notifications/mark-read`                   | POST           | Marcar leídas (bulk)              | S        |
| `/api/coach/today`                               | GET            | "Qué revisar HOY" — inbox real    | M        |

### 3.2 Importantes (P1)

| Endpoint                        | Método           | Función                                   | Esfuerzo |
| ------------------------------- | ---------------- | ----------------------------------------- | -------- |
| `/api/plans/templates`          | GET/POST         | Plantillas reutilizables (PPL, U/L, etc.) | M        |
| `/api/plans/assign-bulk`        | POST             | Asignar plan a N atletas                  | M        |
| `/api/progress-photos`          | GET/POST/DELETE  | Galería antes/después                     | M        |
| `/api/athletes/compare`         | POST `{ ids[] }` | Comparativa entre atletas                 | L        |
| `/api/exports/athlete/[id]/pdf` | GET              | Export PDF de progreso/plan               | L        |
| `/api/cron/check-in-reminders`  | POST (cron)      | Recordatorios automáticos                 | M        |
| `/api/cron/inactive-athletes`   | POST (cron)      | Detectar inactividad >7d                  | S        |
| `/api/nutrition-logs`           | GET/POST         | Atleta loguea lo que comió real           | M        |

### 3.3 Nice to have (P2)

- `/api/integrations/apple-health` — webhook
- `/api/integrations/garmin` — OAuth
- `/api/exercises/library` — biblioteca centralizada con vídeos demo

---

## 4. Cambios en Schema Prisma

Modelos nuevos a añadir:

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String   // destinatario
  type      NotificationType
  title     String
  body      String?
  link      String?  // URL al contexto
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
  user      User     @relation(...)
  @@index([userId, read, createdAt])
}

enum NotificationType {
  CHECK_IN_RESPONDED
  COACH_NOTE
  NEW_MESSAGE
  PR_ACHIEVED
  PLAN_ASSIGNED
  REMINDER_CHECK_IN
  ALERT_ADHERENCE_LOW
  ALERT_SLEEP_LOW
}

model ProgressPhoto {
  id          String   @id @default(cuid())
  athleteId   String
  url         String
  pose        String?  // front/back/side/relaxed/posed
  weekLabel   String?
  weightKg    Float?
  takenAt     DateTime @default(now())
  notes       String?  @db.Text
  athlete     Athlete  @relation(...)
  @@index([athleteId, takenAt])
}

model TrainingTemplate {
  id          String   @id @default(cuid())
  coachId     String
  name        String
  description String?  @db.Text
  splitType   String?  // PPL, U/L, FullBody, Bro
  payload     Json     // estructura del plan
  createdAt   DateTime @default(now())
  coach       Coach    @relation(...)
}

model NotificationSettings {
  id              String  @id @default(cuid())
  userId          String  @unique
  emailEnabled    Boolean @default(true)
  pushEnabled     Boolean @default(false)
  reminderCheckIn Boolean @default(true)
  alertsCoachNote Boolean @default(true)
  digestFrequency String  @default("daily") // daily/weekly/off
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  action    String   // PLAN_UPDATED, ATHLETE_DELETED, etc.
  entity    String   // Plan, Athlete, etc.
  entityId  String
  diff      Json?
  createdAt DateTime @default(now())
  @@index([entity, entityId])
}
```

**Migrations:** generar 5 migrations independientes para no bloquearse.

---

## 5. UX del coach — rediseño enfocado

### 5.1 Dashboard (`/coach`) — REESCRIBIR

**Hoy:** stats hardcodeados + lista plana de atletas.

**Objetivo:** "centro de mando" — lo primero que ve cada mañana.

**Layout propuesto (3 columnas en desktop):**

```
┌─ Saludo + KPIs equipo (atletas activos · MRR · adherencia media · alertas) ─┐
├──────────────────────────────────────────────────────────────────────────────┤
│ COL 1 (40%): TODAY              │ COL 2 (35%): WEEK           │ COL 3 (25%) │
│ ─ Check-ins por responder (N)   │ ─ Próximos 7 días           │ Top atletas │
│   · cards con preview           │   · sesiones programadas    │ (mejores    │
│   · botón "Responder" inline    │   · check-ins esperados     │  KPIs)      │
│ ─ Atletas en riesgo (alertas)   │ ─ Plan caduca esta semana   │             │
│ ─ Mensajes sin leer             │ ─ Renovaciones de servicio  │ Atletas en  │
│ ─ Nuevas medidas raras          │                             │ riesgo      │
└──────────────────────────────────────────────────────────────────────────────┘
                          ┌─ Listado completo de atletas (tabla) ─┐
                          │ Foto · Nombre · Estado · Adh · Última │
                          │ activ · Plan · Acciones (3 puntos)    │
                          └────────────────────────────────────────┘
```

**Datos reales requieren:** `GET /api/coach/today` (nuevo endpoint).

### 5.2 Detalle atleta (`/coach/athletes/[id]`) — REORGANIZAR

**Hoy:** 3,700 líneas, scroll infinito, muy denso.

**Acciones:**

- Mantener la estructura de tabs (ya está) pero **mover el header sticky** al hacer scroll
- Tab "Estadísticas" → dividir en sub-tabs internos: `Composición` · `Estilo de vida` · `Entrenamiento` · `Volumen muscular` · `Nutrición` (los emojis 5 secciones actuales)
- Añadir tab nuevo: **`Fotos`** (galería de progreso)
- Añadir tab nuevo: **`Comparar`** (vs otro atleta del equipo)
- Botón "Exportar PDF" en el header
- "Resumen" tab: sin cambios mayores (ya quedó bien)

### 5.3 Lista de atletas (`/coach/athletes`)

**Hoy:** grid de cards.

**Mejoras:**

- Toggle vista grid/tabla
- Filtros: por objetivo, por estado, por fase, por adherencia
- Búsqueda por nombre
- Bulk actions: "Asignar plan" / "Enviar mensaje" / "Cambiar fase"
- Indicador visual de salud (verde/amarillo/rojo) más prominente

### 5.4 Mensajes (`/coach/messages`)

**Mejoras:**

- Indicador "escribiendo..." (tipo WhatsApp)
- Búsqueda en historial
- Responder con archivo (foto/PDF)
- Quick replies (templates)
- Marcar mensaje como "pendiente de responder"

### 5.5 Crear plan de entrenamiento — UI manual

**Hoy:** solo CSV import.

**Crear:** `/coach/plans/new` — wizard:

1. Datos del plan (nombre, fase, semanas)
2. Definir sesiones (drag & drop opcional)
3. Para cada sesión: ejercicios + sets/reps/RIR/descanso
4. Asignar a 1+ atletas
5. (Opcional) guardar como template

---

## 6. UX del atleta

### 6.1 Plan actual (`/athlete/plan`)

- Marcar sesión completa (checkbox)
- Ver vídeo demo del ejercicio (si existe)
- "Iniciar sesión" → lleva a `/athlete/training-log` precargado

### 6.2 Training log (`/athlete/training-log`)

- **Bug fix:** leer peso del athlete profile, no hardcodear
- Histórico del último set por ejercicio (placeholder con valores anteriores)
- Auto-sugerencia de carga (basado en RIR previo)
- Vídeo de técnica accesible desde el ejercicio

### 6.3 Check-in (`/athlete/check-in`)

- Ya tiene los campos físicos arreglados ✓
- **Faltante:** sección "Feedback de tu coach" mostrando coachNote del último check-in respondido
- Sugerencia: "última vez te pesabas 78.5 kg" como hint

### 6.4 Daily log (`/athlete/daily-log`)

- Sparkline más grande (h-32 mín)
- Indicador de "racha" (días consecutivos logueando)
- Quick log desde móvil (botones grandes)

### 6.5 Nutrition (`/athlete/nutrition`)

- Logging de comidas reales vs plan (compliance %)
- Foto de plato (`POST /api/nutrition-logs` con imagen)
- Cálculo automático calorías/macros si selecciona del catálogo

### 6.6 Fotos de progreso — NUEVO

- `/athlete/progress` — tab o página
- Subir foto (front/back/side/posed/relaxed)
- Comparativa lado a lado de 2 fechas
- Coach las ve en su detalle del atleta

---

## 7. Sistema de notificaciones (P0)

**Componentes:**

1. **Backend:** modelo `Notification` + API + emisor central
2. **In-app:** campana en el header con dropdown (badge con N sin leer)
3. **Email:** opcional vía Resend / SES
4. **Push web:** opcional vía service worker (PWA fase 2)

**Triggers automáticos:**

| Evento                             | Notifica a     | Tipo                  |
| ---------------------------------- | -------------- | --------------------- |
| Atleta hace check-in               | Coach          | `CHECK_IN_RESPONDED`  |
| Coach añade nota                   | Atleta         | `COACH_NOTE`          |
| Mensaje nuevo                      | Destinatario   | `NEW_MESSAGE`         |
| Atleta logra PR (e1RM > histórico) | Coach + Atleta | `PR_ACHIEVED`         |
| Plan asignado                      | Atleta         | `PLAN_ASSIGNED`       |
| 3 días sin check-in                | Atleta         | `REMINDER_CHECK_IN`   |
| Adherencia < 60%                   | Coach          | `ALERT_ADHERENCE_LOW` |
| Sueño < 6h promedio 7d             | Coach          | `ALERT_SLEEP_LOW`     |

**Settings:** página `/settings/notifications` para gestionar preferencias.

---

## 8. Cron jobs / tareas programadas

Usar Vercel Cron o `node-cron` si se hostea en VPS.

| Cron                 | Frecuencia              | Función                                       |
| -------------------- | ----------------------- | --------------------------------------------- |
| `check-in-reminders` | Diario 09:00            | Notificar a atletas con check-in pendiente    |
| `inactive-athletes`  | Diario 10:00            | Detectar inactividad >7 días, notificar coach |
| `weekly-digest`      | Lunes 08:00             | Email semanal al coach con resumen del equipo |
| `pr-detection`       | Tras cada `session-log` | Detectar PR y notificar                       |
| `plan-expiry-alert`  | Diario                  | Avisar planes que caducan en <7 días          |

---

## 9. Validaciones (Zod)

Crear `src/lib/validators/` con esquemas reusables:

- `checkInSchema` — adherencia 0-100, peso 30-250, sueño 0-14, pasos 0-50000
- `bodyMeasurementSchema` — todos los perímetros con rangos sanos
- `setLogSchema` — RIR 0-10, reps 0-50, peso 0-500
- `mealSchema` — kcal/macros con sanity checks

Aplicar en:

1. API routes (server-side, fuente de verdad)
2. React Hook Form (client-side, UX inmediata)

---

## 10. Performance & calidad

- **Loading states:** Suspense + Skeleton en cada `data fetching` page
- **Optimistic updates:** mutaciones (toggle read, react a post, etc.)
- **Lazy load:** code-split del detalle del atleta (3,700 líneas)
- **Image optimization:** `next/image` en todas las fotos (perfil, progreso)
- **DB indexes:** revisar queries de `coach/today` y añadir índices compuestos
- **Caching:** SWR o React Query para datos del coach (atletas, mensajes)

---

## 11. Mobile responsiveness

Auditoría rápida → fixes prioritarios:

- `coach/page` grid 4 col → `grid-cols-2 sm:grid-cols-4`
- `coach/athletes/[id]` tabs scroll horizontal en móvil ✓ ya está
- Modales fullscreen en móvil
- Chat: input fijo abajo (sticky)
- Logging diario: botones más grandes (44px mín)

---

## 12. Roadmap por sprints

### Sprint 1 — Fundación (1 semana)

- [x] Crear `Modal`, `Toast`, `EmptyState`, `Skeleton`, `ConfirmDialog`
- [x] Bug 1: weight hardcodeado en training-log
- [x] Bug 4: protección de rol en `/athlete/[id]`
- [ ] Bug 5: mobile responsiveness fix global
- [x] Migración Prisma: `Notification` + `NotificationSettings`
- [x] API `/api/notifications` CRUD básico
- [x] Toast provider en `layout.tsx`

### Sprint 2 — Coach inbox real (1 semana)

- [x] API `/api/coach/today` (agrega: check-ins pendientes, mensajes, alertas)
- [x] Reescribir `/coach/page.tsx` con dashboard real (3 cols)
- [ ] Componente `Tabs` reutilizable
- [x] Header del coach: campana de notificaciones con dropdown
- [x] Triggers de notificaciones en endpoints existentes (check-ins, messages, coach notes)

### Sprint 3 — CRUD planes completo (1 semana)

- [x] PATCH/DELETE `/api/plans/[id]`
- [x] PATCH/DELETE sesiones y ejercicios individuales
- [x] UI manual `/coach/plans/new` (wizard 3 pasos)
- [x] Migración: `TrainingTemplate`
- [x] API `/api/plans/templates` + `/api/plans/templates/[tid]`
- [x] "Guardar como template" desde wizard y desde plan existente (`/api/plans/[id]/save-as-template`)

### Sprint 4 — Fotos + PDF + crons (1 semana)

- [x] Migración: `ProgressPhoto`
- [x] API `/api/progress-photos` (GET lista, POST upload multipart, DELETE)
- [x] UI atleta: `/athlete/progress` — subir + galería + comparador 2 fotos
- [x] Componente `AthletePhotosTab` reutilizable para detalle del coach
- [x] Crons: `/api/cron/check-in-reminders`, `/api/cron/inactive-athletes` (protegidos por `CRON_SECRET`)
- [x] Página print-friendly `/coach/plans/[id]/print` (export PDF via window.print)

### Sprint 5 — Comparativa + nutrition logs (1 semana) ✅

- [x] API `/api/athletes/compare`
- [x] UI: dashboard comparativo (radar overlay, tablas)
- [x] Migración: `NutritionLog` (atleta loguea comidas reales)
- [x] UI atleta: nutrition logging con foto
- [x] Compliance % vs plan en detalle del coach

### Sprint 6 — Pulido + producción (1 semana) ✅

- [x] Validaciones Zod en TODAS las API routes
- [x] Skeletons en toda página con fetch
- [x] Optimistic updates en chat, notifications
- [x] Auditoría a11y (focus, contraste, aria-labels)
- [ ] Lighthouse > 90 en mobile
- [x] Migración: `AuditLog` + integración en mutations destructivas

### Sprint 7 — Dashboard modular atleta + widgets (fase 2) ✅

- [x] Nueva home `/athlete` como dashboard del atleta
- [x] Subtabs por dominio: resumen, entrenamiento, recuperación, nutrición, progreso
- [x] Widgets reordenables y ocultables con persistencia local
- [x] Widgets iniciales sobre datos reales: peso, sueño, pasos, check-ins, sesiones, nutrición
- [x] Persistencia server-side del layout por usuario
- [x] Presets editables por coach para cada atleta
- [x] Objetivos diarios de kcal, proteína, grasas y carbs con fallback al plan activo
- [x] API `GET/PATCH /api/nutrition-targets`
- [x] UI coach para fijar vista inicial y objetivos diarios del atleta

### Fases siguientes — Nutrición inteligente + dashboard editable

#### Fase 2 — Layout persistente y presets del coach ✅

- Tabla `DashboardLayout` para guardar orden, visibilidad y tab por widget
- Tabla `CoachDashboardPreset` para presets por atleta
- API `GET/PATCH /api/dashboard/layout`
- API `GET/PATCH /api/dashboard/preset`
- Coach puede fijar la vista inicial al entrar el atleta

#### Fase 3 — Nutrición dual: dieta fija + macros flexibles 🚧

- [x] Soporte nativo para dos modos: dieta fija y objetivos diarios de macros
- [x] Modelo `AthleteMacroTarget` para targets diarios: kcal, proteína, grasas, carbs
- [ ] Catálogo propio de alimentos con fuente externa solo para búsqueda/enriquecimiento
- [ ] Snapshot nutricional por log para no depender de cambios futuros de la API externa
- [ ] Integración prevista con APIs tipo FatSecret, USDA o Edamam, no depender del core de MyFitnessPal

#### Fase 4 — Gráficas avanzadas y vistas diferenciales ✅

- [x] Widgets Recharts AreaChart para tendencia de peso (7 días)
- [x] Widget AreaChart para tendencia de sueño (7 días)
- [x] Widget LineChart multi-eje: adherencia % + sueño h por check-in
- [x] Widget AreaChart + LineChart de macros diarios (kcal, prot, carbs, grasa)
- [x] Widget correlación sueño vs entrenamiento (ejes duales)
- [x] Nuevos widget keys: `adherence-trend`, `macro-trend`, `correlation-sleep-training`
- [x] DEFAULT_LAYOUT actualizado con los nuevos widgets en sus tabs naturales
- [x] Pulido visual `nutrition/page.tsx` → `SectionIntro`, `rounded-4xl`, `max-w-5xl`, `Skeleton`
- [x] Pulido visual `nutrition/log/page.tsx` → grid 2 cols, inputs `rounded-2xl`, botón accent, `rounded-4xl` cards

---

## 13. Backlog post-launch (P2)

- Integración Apple Health / Garmin / Polar (OAuth)
- Push notifications (PWA)
- Gamificación (badges, streaks, leaderboard interno)
- Modo "Peak Week" (carb cycling, posing schedule, water cut)
- Vídeos de técnica (biblioteca + asignar a ejercicios)
- Calendario visual semanal (drag & drop sesiones)
- Métricas de negocio para coach (MRR, churn, LTV, NPS)
- Stripe Billing integrado con `ServicePlan`
- Multi-coach (gimnasios) con roles
- White-label para gimnasios

---

## 14. Métricas de éxito

| Métrica                         | Hoy | Objetivo post-roadmap |
| ------------------------------- | --- | --------------------- |
| Tiempo del coach por atleta/día | ?   | <5 min para revisar   |
| % check-ins respondidos en 24h  | ?   | >80%                  |
| % atletas con check-in semanal  | ?   | >85%                  |
| Lighthouse mobile               | ?   | >90                   |
| Bugs P0 abiertos                | 6   | 0                     |
| TODOs en código                 | ?   | <5                    |
| Cobertura componentes UI        | 12  | 25+                   |

---

**Propietario:** Coach Apex
**Última revisión:** 4 mayo 2026
**Estado:** Sprint 5, 6 y 7 completados a nivel MVP. Pendiente: Lighthouse, catálogo alimentario enriquecido y gráficas/correlaciones avanzadas.
