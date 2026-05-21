# 02 — Flujos Funcionales por Módulo

Flujo paso a paso del usuario real. Identifica estados, puntos de fricción y duplicidades.

## Convención de estados

Estados estándar reutilizables:
- `DRAFT` — borrador, no visible para el atleta.
- `ACTIVE` — vigente; sólo uno activo por (atleta, tipo).
- `ARCHIVED` — histórico, no editable, visible en historial.
- `PENDING_REVIEW` — esperando aprobación (futuro).
- `SCHEDULED` — programado para fecha futura (futuro).

**Regla de oro**: las transiciones son explícitas (`activate`, `archive`, `duplicate`). No se cambia el estado por edición indirecta.

---

## Módulo: Training

### Flujo Coach — Crear y asignar plan
1. Navbar → "Crear plan de entrenamiento" → `/coach/plans/new`.
2. **Paso 1**: meta (título, semana, bloque). Validación local.
3. **Paso 2**: añadir sesiones; en cada sesión, buscar ejercicios (`ExerciseSearch`), añadir prescripción.
4. **Paso 3**: seleccionar atleta. Opción "guardar como plantilla".
5. POST `/api/plans` → crea `TrainingPlan` (estado `ACTIVE` por defecto si es el primero, sino `DRAFT`).
6. Redirect a `/coach/athletes/[id]` con toast confirmación.

### Flujo Coach — Editar plan vigente
- **Hoy**: PATCH `/api/plans/[id]` modifica destructivamente. ❌
- **Propuesta**: editar genera nueva versión (`version + 1`), versión anterior pasa a `ARCHIVED`. Se preserva historial de prescripciones para auditoría.

### Flujo Atleta — Ejecutar entrenamiento
1. `/athlete/plan` → carga plan activo.
2. Selecciona sesión → `/athlete/plan/session/[id]`.
3. Registra sets reales → POST `/api/session-logs`.
4. `SessionLog` queda inmutable, vinculado a `planId + sessionId + version` para historial.

### Estados Training
- `TrainingPlan.status`: `DRAFT | ACTIVE | ARCHIVED`.
- `SessionLog`: inmutable tras crear.

### Inconsistencias detectadas
- Plantillas (`PlanTemplate`) y planes activos comparten estructura pero rutas distintas → unificar service layer.
- `block` ya está a nivel plan (correcto).
- ❌ Falta `version` y `parentPlanId` en `TrainingPlan`.

---

## Módulo: Nutrition

### Flujo Coach — Crear plan
1. Navbar → "Crear plan nutricional" → `/coach/nutrition/new`.
2. Selecciona atleta → redirect `/coach/nutrition?athleteId=X&create=true`.
3. Editor: macros objetivo + comidas + alimentos (auto-calcular macros, import CSV, plantillas).
4. POST `/api/nutrition-plans`.

### Flujo Atleta — Registrar comida
1. `/athlete/nutrition` → ve plan activo + compliance.
2. `/athlete/nutrition/log` → añadir comida (búsqueda en `FoodCatalog`).
3. POST `/api/nutrition-logs`.

### Estados Nutrition
- Mismos que Training. Solo un `NutritionPlan` ACTIVE por atleta.

### Inconsistencias detectadas
- **3 fuentes de macros**: `NutritionPlan.kcalTarget`, `NutritionTarget`, suma de `Meal.foods`.
  - **Solución**: jerarquía clara → si existe `NutritionTarget` para el atleta → manda. Si no → `plan.kcalTarget`. La suma de meals es **informativa**.
- Editor "delete + recreate" en lugar de PATCH → perder histórico. Aplicar versionado igual que Training.

---

## Módulo: Athletes

### Flujo Coach — Onboarding atleta
1. `/coach/athletes` → "Añadir atleta".
2. Coach introduce datos básicos + email → POST `/api/athletes`.
3. Sistema crea `Athlete` con `userId=null` (invitación pendiente).
4. Atleta recibe email → completa registro → `User` se vincula a `Athlete`.

### Flujo Atleta — Onboarding propio
1. Registro → `/onboarding` (athlete branch).
2. Selección de team/coach (si no asignado).
3. Completar `AthleteContextProfile` (objetivos, historial, máquinas).
4. Consents (GDPR, datos salud).

### Estados Athlete
- `Athlete.status`: `INVITED | ACTIVE | PAUSED | LEFT`.
- Al `LEFT`, planes pasan a `ARCHIVED`, `Subscription` se cancela.

### Inconsistencias detectadas
- Hay `Athlete.coachId` (legacy) y `TeamUserMembership` para coaches. Decidir:
  - **Opción A**: `Athlete.coachId` opcional, sólo si team usa modelo "coach asignado".
  - **Opción B**: eliminar `coachId`, atleta pertenece al team; cualquier miembro accede.
  - **Recomendado**: A (mantener legacy para teams pequeños 1-coach; UI muestra coach principal).

---

## Módulo: Coaches & Teams

### Flujo creación team
1. Coach se registra → crea team automáticamente (1 admin = él).
2. Invita otros coaches → `TeamUserMembership` role MEMBER.
3. Admin gestiona facturación, catálogos (goals/phases), settings.

### Inconsistencias detectadas
- Endpoint `/api/teams/coaches` mezcla listado + invitar + roles. Dividir: GET listado, POST invitar, PATCH cambiar rol.

---

## Módulo: Progress

### Flujo Atleta — Check-in semanal
1. Notificación `REMINDER_CHECK_IN` → `/athlete/check-in`.
2. Formulario (peso, sueño, energía, foto opcional).
3. POST `/api/check-ins`.
4. Coach recibe notificación `CHECK_IN_RESPONDED`.

### Flujo Coach — Revisar check-in
1. Dashboard atleta → ver últimos check-ins.
2. Añadir `coachNote` → PATCH `/api/check-ins/[id]`.
3. Atleta recibe notificación `COACH_NOTE`.

### Inconsistencias
- `DailyLog` vs `CheckIn` con campos solapados (`weightKg`). Convención: `DailyLog` es input rápido del atleta; `CheckIn` es estructurado con revisión del coach. **No duplicar** lógica de cálculo de tendencias entre ambos: usar `BodyMeasurement` como fuente para gráficas.

---

## Módulo: Communication

### Flujo Chat
- Atleta tiene 1 coach principal (o varios si team) → `FloatingChat`.
- Coach tiene N atletas → inbox con conversaciones.
- `Message` indexado por `(fromUserId, toUserId, createdAt)` para query eficiente.

### Flujo Notificaciones
- Generadas por triggers de dominio (no por frontend).
- Sistema de cola futura para batching (e.g. resumen diario).

### Inconsistencias
- `floating-chat.tsx` con ambas vistas en un componente. Separar.
- Polling de unread cada 15s → migrar a SSE/WebSocket cuando haya volumen.

---

## Módulo: Service Plans & Billing

### Flujo
1. Coach define `ServicePlan` ("3 meses asesoría", precio, frecuencia check-in).
2. Asigna a atleta → crea `Subscription` (start, end, autoRenew).
3. Sistema renueva o avisa fin de servicio.

### Inconsistencias
- "Plan" término ambiguo. Internamente `ServicePlan`; UI siempre "Plan de servicio" o "Suscripción".

---

## Resumen de fricciones UX a corregir

| Fricción | Solución |
|---|---|
| Crear plan: usuario no sabe si "Plan" = training, nutrition, service | Nombrar siempre con sufijo en UI |
| Editor de nutrición delete+recreate pierde histórico | Versionado |
| Inbox y vista atleta-coach mezclados en floating-chat | Componentes separados |
| Listas devuelven shapes distintos (array vs `{items}`) | Estandarizar [[05 APIs y Arquitectura Tecnica]] |
| Onboarding sin progreso visible | Stepper persistente |
| Notificaciones sin agrupar | Agrupar por tipo y entidad |
