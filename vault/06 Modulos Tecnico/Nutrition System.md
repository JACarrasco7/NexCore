# 🍎 Sistema de Nutrición (Nutrition System)

**Versión**: 1.0
**Fecha**: 14 de mayo de 2026
**Enfoque**: Planes de nutrición, macros, comidas, auditoría, templates

---

## 🎯 Propósito

Sistema completo de gestión nutricional: planes personalizados por atleta, definición de macros, comidas, registro de alimentos, tracking de macros, y reutilización de templates por el coach.

---

## 🗄️ Modelos del Sistema

### 1. NutritionPlan (Plan de Nutrición)

```prisma
model NutritionPlan {
  id         String    @id @default(cuid())
  athleteId  String
  coachId    String
  title      String          // "Plan Volumen 2500 kcal", "Cutting 2000 kcal", etc.
  phase      String    @default("Activo") // Fase del plan
  
  // Macros objetivo
  kcalTarget Int       @default(0)
  proteinG   Int       @default(0)
  carbsG     Int       @default(0)
  fatG       Int       @default(0)
  
  // Notas
  notes      String?   @db.Text // Instrucciones del coach
  
  // Estado
  isActive   Boolean   @default(true)
  deletedAt  DateTime?
  createdAt  DateTime  @default(now())
  
  athlete    Athlete   @relation(...)
  coach      Coach     @relation(...)
  meals      Meal[]
  
  @@index([athleteId, isActive])
  @@index([coachId, createdAt])
}
```

**Ciclo de vida**:
- Nuevo → isActive=true (plan activo)
- Coach cambia a otro → isActive=false
- Fin de fase → deletedAt=now (soft delete)

---

### 2. Meal (Comida)

```prisma
model Meal {
  id     String @id @default(cuid())
  planId String
  name   String        // "Desayuno", "Almuerzo", "Snack Pre-entreno", etc.
  time   String @default("") // "7:00 AM", "12:30 PM", etc.
  order  Int    @default(0)  // Orden en el plan (Desayuno=0, Almuerzo=1, etc.)
  
  plan   NutritionPlan @relation(...)
  foods  MealFood[]    // Alimentos en esta comida
}
```

**Estructura**: Plan → 4-6 Meals → Múltiples Foods

---

### 3. MealFood (Alimento en Comida)

```prisma
model MealFood {
  id       String @id @default(cuid())
  mealId   String
  
  // Alimento
  food     String        // "Pollo pechuga", "Arroz blanco", "Huevo", etc.
  quantity Float  @default(0) // Cantidad
  unit     String @default("g") // "g", "mL", "unidad", "taza", etc.
  
  // Macros (calculados o manuales)
  kcal     Int?
  proteinG Float?
  carbsG   Float?
  fatG     Float?
  
  order    Int    @default(0) // Orden dentro de la comida
  
  meal     Meal   @relation(...)
}
```

**Ejemplo**:
```json
{
  "food": "Pechuga de pollo",
  "quantity": 200,
  "unit": "g",
  "kcal": 331,
  "proteinG": 62,
  "carbsG": 0,
  "fatG": 7
}
```

---

### 4. NutritionTemplate (Template Reutilizable)

```prisma
model NutritionTemplate {
  id        String   @id @default(cuid())
  coachId   String
  name      String        // "Macro bajas - Cutting", "High carb - Volumen", etc.
  
  // Array de comidas serializado como JSON
  meals     Json          // MealDraft[] serializado
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  coach     Coach    @relation(...)
}
```

**Estructura JSON de meals**:
```json
{
  "meals": [
    {
      "name": "Desayuno",
      "time": "7:00 AM",
      "foods": [
        { "food": "Huevo (3)", "quantity": 3, "unit": "unidad", "kcal": 155 },
        { "food": "Pan integral", "quantity": 50, "unit": "g", "kcal": 135 }
      ]
    }
  ]
}
```

---

### 5. NutritionLog (Auditoría de Cambios)

```prisma
model NutritionLog {
  id              String   @id @default(cuid())
  athleteId       String
  
  // Tipo de cambio
  changeType      String   // "plan_created", "plan_updated", "meal_added", etc.
  
  // Datos del cambio
  planId          String?
  mealId          String?
  before          Json?    // Estado anterior (si aplica)
  after           Json?    // Estado nuevo (si aplica)
  reason          String?  @db.Text // Por qué cambió
  
  // Auditoría
  changedByUserId String?  // Quién hizo el cambio (coach o atleta)
  createdAt       DateTime @default(now())
  
  athlete         Athlete  @relation(...)
}
```

---

## 🔌 API Endpoints

### Nutrition Plans

#### POST /api/athletes/[id]/nutrition-plans
Coach crea plan de nutrición para atleta

**Body**:
```json
{
  "title": "Plan Volumen 2500 kcal",
  "phase": "Volumen - Fase 1",
  "kcalTarget": 2500,
  "proteinG": 200,
  "carbsG": 300,
  "fatG": 80,
  "notes": "Prioridad: proteína. Puede comer más si tiene hambre",
  "meals": [
    {
      "name": "Desayuno",
      "time": "7:00 AM",
      "foods": [
        {
          "food": "Huevo",
          "quantity": 3,
          "unit": "unidad",
          "kcal": 155,
          "proteinG": 13,
          "carbsG": 1,
          "fatG": 11
        }
      ]
    }
  ]
}
```

**Respuesta (201)**:
```json
{
  "id": "plan-123",
  "athleteId": "ath-456",
  "title": "Plan Volumen 2500 kcal",
  "isActive": true,
  "kcalTarget": 2500,
  "meals": [...]
}
```

---

#### GET /api/athletes/[id]/nutrition-plans
Atleta ve sus planes de nutrición (activos e históricos)

**Query params**:
- `active`: true/false para filtrar activos
- `limit`: Número de planes

**Respuesta (200)**:
```json
[
  {
    "id": "plan-123",
    "title": "Plan Volumen 2500 kcal",
    "isActive": true,
    "kcalTarget": 2500,
    "createdAt": "2026-05-01T10:00:00Z",
    "meals": [
      {
        "id": "meal-111",
        "name": "Desayuno",
        "time": "7:00 AM",
        "foods": [...]
      }
    ]
  }
]
```

---

#### GET /api/nutrition-plans/[id]
Obtiene plan completo con todas las comidas y alimentos

---

#### PUT /api/nutrition-plans/[id]
Coach actualiza plan

**Body**: Puede actualizar title, phase, macros, meals

---

#### PUT /api/nutrition-plans/[id]/activate
Activa este plan (desactiva otros del mismo atleta)

**Respuesta (200)**:
```json
{
  "id": "plan-123",
  "isActive": true
}
```

---

#### DELETE /api/nutrition-plans/[id]
Marca plan como eliminado (soft delete)

---

### Meals

#### POST /api/nutrition-plans/[planId]/meals
Coach añade comida al plan

**Body**:
```json
{
  "name": "Pre-entreno",
  "time": "12:00 PM",
  "foods": [
    {
      "food": "Banana",
      "quantity": 1,
      "unit": "unidad",
      "kcal": 105,
      "carbsG": 27
    }
  ]
}
```

---

#### PUT /api/meals/[id]
Coach actualiza comida

---

#### DELETE /api/meals/[id]
Elimina comida del plan

---

### Nutrition Templates

#### POST /api/coaches/[id]/nutrition-templates
Coach crea template reutilizable

**Body**:
```json
{
  "name": "Macro Bajas - Cutting 2000 kcal",
  "meals": [
    {
      "name": "Desayuno",
      "time": "7:00 AM",
      "foods": [...]
    }
  ]
}
```

---

#### GET /api/coaches/[id]/nutrition-templates
Coach ve sus templates

---

#### POST /api/athletes/[id]/nutrition-plans/from-template
Coach crea plan basado en template

**Body**:
```json
{
  "templateId": "template-123",
  "title": "Plan Cutting Juan - Semana 1"
}
```

**Respuesta (201)**: Plan creado con estructura del template

---

### Nutrition Logs (Auditoría)

#### GET /api/athletes/[id]/nutrition-logs
Coach ve historial de cambios en nutrición del atleta

**Respuesta (200)**:
```json
[
  {
    "id": "log-123",
    "changeType": "plan_created",
    "planId": "plan-456",
    "reason": "Nueva fase de volumen",
    "changedByUserId": "coach-789",
    "createdAt": "2026-05-01T10:00:00Z"
  }
]
```

---

## 🔄 Flujos de Negocio

### Flujo 1: Coach crea plan desde cero

```
1. Coach analiza necesidades del atleta
   - Peso, objetivo, experiencia, preferences

2. Coach crea template o plan nuevo
   - Define macros: 2500 kcal, 200g proteína, 300g carbs, 80g fat

3. Coach diseña comidas:
   - Desayuno: Huevo, pan, OJ
   - Almuerzo: Pollo, arroz, verdura
   - Pre-entreno: Banana, dátiles
   - Post-entreno: Whey, avena
   - Cena: Pescado, papa, brócoli
   - Snack: Yogur, granola

4. Coach asigna plan al atleta:
   → PUT /api/nutrition-plans/[id]/activate

5. Atleta comienza a seguir plan
```

### Flujo 2: Coach reutiliza template

```
1. Coach tiene template guardado: "Macro bajas - 2000 kcal"

2. Nuevo atleta necesita cutting plan

3. Coach crea plan desde template:
   → POST /api/athletes/[id]/nutrition-plans/from-template

4. Coach personaliza (opcional):
   - Ajusta cantidades según peso atleta
   - Cambia alimentos por preferencias
   - Actualiza macros

5. Plan está listo para el atleta
```

### Flujo 3: Cambio de fase

```
1. Atleta termina fase de volumen (4 semanas)
   - Ganó 3kg, aumentó fuerza

2. Coach crea nuevo plan (cutting)
   - 2000 kcal, 180g proteína, 200g carbs

3. Coach activa nuevo plan:
   → PUT /api/nutrition-plans/[newId]/activate
   → Plan anterior se desactiva automáticamente

4. Sistema registra cambio:
   → NutritionLog: changeType="plan_created", reason="Cambio de fase"

5. Atleta ve nuevo plan en su lista
```

---

## 📊 Cálculos de Macros

### Ejemplo: Plan Volumen 2500 kcal

```
Objetivo: 2500 kcal / día

Distribución (típica):
- Proteína: 200g × 4 kcal/g = 800 kcal (32% del total)
- Carbs: 300g × 4 kcal/g = 1200 kcal (48% del total)
- Grasas: 80g × 9 kcal/g = 720 kcal (29% del total)
- TOTAL: 2720 kcal (ajustar alimentos ±5%)

Distribución por comida:
- Desayuno (20%): 500 kcal
- Almuerzo (35%): 875 kcal
- Pre-entreno (10%): 250 kcal
- Post-entreno (15%): 375 kcal
- Cena (20%): 500 kcal
```

---

## 🔐 Validaciones

| Validación | Tipo | Error |
|-----------|------|-------|
| Coach == Atleta.coach | Ownership | 403 Forbidden |
| kcalTarget > 0 | Business | 422 |
| Proteína + Carbs + Grasas ≈ kcal | Business | 422 |
| Plan debe tener ≥1 meal | Business | 422 |
| Meal debe tener ≥1 food | Business | 422 |
| Cantidad > 0 | Schema | 400 |
| Template debe tener meals | Schema | 400 |

---

## 📝 Notas de Implementación

- **Macros**: Calculados automáticamente basados en cantidad × composición
- **Decimales**: Proteína, carbs, grasas pueden ser decimales (67.5g proteína)
- **Soft delete**: Plans se marcan con deletedAt, no se eliminan
- **Active único**: Un atleta solo tiene 1 plan active (otros tienen isActive=false)
- **Calorías**: 1g proteína = 4 kcal, 1g carbs = 4 kcal, 1g grasa = 9 kcal
- **Templates**: Permiten que coaches reutilicen estructuras exactas sin recrear desde cero
- **Auditoría**: NutritionLog registra todos los cambios importantes (para compliance/feedback)

---

## 🎯 Casos de Uso Comunes

| Caso | Endpoint | Método |
|------|----------|--------|
| Ver plan actual | GET /api/athletes/[id]/nutrition-plans?active=true | GET |
| Crear plan nuevo | POST /api/athletes/[id]/nutrition-plans | POST |
| Cambiar de plan | PUT /api/nutrition-plans/[id]/activate | PUT |
| Crear template | POST /api/coaches/[id]/nutrition-templates | POST |
| Usar template | POST /api/athletes/[id]/nutrition-plans/from-template | POST |
| Ver histórico de cambios | GET /api/athletes/[id]/nutrition-logs | GET |
| Actualizar comidas | PUT /api/meals/[id] | PUT |
| Crear plan cutting | POST /api/athletes/[id]/nutrition-plans | POST |

---

## 🍽️ Ejemplo Completo: Plan del Día

```
LUNES - Plan Volumen 2500 kcal

DESAYUNO (7:00 AM) - 500 kcal
├── Huevo (3)           3 unidad    155 kcal | 13g prot | 1g carb | 11g fat
├── Pan integral        2 rebanada  270 kcal | 9g prot | 48g carb | 3g fat
├── Naranja            1 unidad      75 kcal | 1g prot | 19g carb | 0g fat
└── Totales            -            500 kcal | 23g | 68g | 14g

ALMUERZO (12:30 PM) - 875 kcal
├── Pechuga pollo      200g         331 kcal | 62g prot | 0g carb | 7g fat
├── Arroz blanco       150g         195 kcal | 4g prot | 43g carb | 0g fat
├── Brócoli            150g          51 kcal | 5g prot | 10g carb | 1g fat
├── Aceite de oliva    1 cucharada  298 kcal | 0g prot | 0g carb | 33g fat
└── Totales            -            875 kcal | 71g | 53g | 41g

[Continúa Pre-entreno, Post-entreno, Cena...]

DÍA TOTAL ≈ 2500 kcal | 200g prot | 300g carb | 80g fat
```

---

## 🔌 Integración con Otros Módulos

- **AthleteSubscription**: Atleta tiene acceso a planes si su subscripción está ACTIVE
- **CheckIn**: Puedo agregar adherencia nutricional (subjetiva) al check-in semanal
- **DailyLog**: Puedo registrar alimentos consumidos vs plan (future feature)
- **Notifications**: Recordatorios de comidas (future feature)
