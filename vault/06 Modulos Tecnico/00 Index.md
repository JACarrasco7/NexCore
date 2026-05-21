# 📚 Documentación Técnica por Módulo

**Última actualización**: 14 de mayo de 2026
**Versión**: Post-Billing System (v1.0)

---

## 📑 Estructura de Documentación

Documentación modular del sistema NEXUM para reutilización en sesiones futuras de IA.

### 🏦 **Módulo de Facturación (Billing System)**
- **Archivo**: [[Billing System.md]]
- **Contenido**: Modelos de datos, enums, endpoints, validaciones
- **Casos de uso**: Coach paga a APP, Atleta paga a Coach, Facturas automáticas

### 👥 **Módulo de Atletas (Athlete)**
- **Archivo**: [[Athlete Module.md]]
- **Contenido**: Modelo Athlete, relaciones, endpoints, consentimientos
- **Casos de uso**: Perfil atleta, subscripciones, métricas

### 🏋️ **Módulo de Coach**
- **Archivo**: [[Coach Module.md]]
- **Contenido**: Modelo Coach, gestión de atletas, equipos
- **Casos de uso**: Gestión de equipos, invitaciones, subscripciones

### 💪 **Módulo de Entrenamientos (Training)**
- **Archivo**: [[Training System.md]]
- **Contenido**: Planes, sesiones, ejercicios, ejercicios prescritos, registros
- **Casos de uso**: Crear planes, asignar ejercicios, registrar entrenamientos

### 🍎 **Módulo de Nutrición (Nutrition)**
- **Archivo**: [[Nutrition System.md]]
- **Contenido**: Planes de nutrición, comidas, plantillas reutilizables
- **Casos de uso**: Macros, comidas, auditoría de alimentos

### 🗄️ **Base de Datos (Schema Reference)**
- **Archivo**: [[Database Schema.md]]
- **Contenido**: Listado completo de modelos, enums, relaciones
- **Casos de uso**: Consulta rápida de estructura

### 🔌 **API Endpoints (REST Reference)**
- **Archivo**: [[API Endpoints.md]]
- **Contenido**: Todos los endpoints, métodos, validaciones, ejemplos
- **Casos de uso**: Integración frontend, testing, documentación

### 🔐 **Autenticación y Autorización (Auth & RBAC)**
- **Archivo**: [[Auth & Roles.md]]
- **Contenido**: NextAuth.js v5, roles, permisos, RBAC
- **Casos de uso**: Validación de acceso, roles COACH/ATHLETE/ADMIN

### 📊 **Módulo de Dashboard y Métricas**
- **Archivo**: [[Dashboard & Metrics.md]]
- **Contenido**: CheckIn, DailyLog, SessionLog, BodyMeasurement
- **Casos de uso**: Tracking atleta, visualización de progreso

---

## 🎯 Cómo Usar Esta Documentación

1. **Para nuevas sesiones**: Abre el archivo del módulo relevante
2. **Para debugging**: Consulta [[Database Schema.md]] para entender relaciones
3. **Para desarrollo**: Usa [[API Endpoints.md]] como referencia de contratos
4. **Para onboarding de IA**: Proporciona los archivos relevantes al inicio

---

## 🔄 Convenciones del Proyecto

- **Base de datos**: MySQL via Prisma
- **Framework**: Next.js 16 con App Router
- **Autenticación**: NextAuth.js v5 + JWT
- **Zona horaria**: Europe/Madrid (UTC+2 verano, UTC+1 invierno)
- **Moneda**: EUR
- **Idioma**: es-ES
- **Payment**: Stripe (integración en progreso)

---

## 📋 Enums Principales

| Enum | Valores | Uso |
|------|---------|-----|
| `Role` | COACH, ATHLETE, ADMIN | Rol global del usuario |
| `TeamRole` | ADMIN, MEMBER | Rol dentro del equipo |
| `Goal` | VOLUMEN, DEFINICION, FUERZA | Objetivo atleta |
| `CoachSubscriptionStatus` | TRIAL, ACTIVE, INACTIVE, SUSPENDED, EXPIRED, CANCELLED | Estado suscripción coach→APP |
| `AthleteSubscriptionStatus` | TRIAL, ACTIVE, INACTIVE, CANCELED | Estado suscripción atleta→coach |
| `InvoiceStatus` | DRAFT, SENT, PAID, OVERDUE, CANCELED | Estado factura |

---

## ✅ Status del Sistema

- ✅ Modelos de facturación implementados
- ✅ 10 endpoints de facturación funcionales
- ✅ Generación automática de facturas
- ✅ Validación de maxAthletes
- ⏳ Stripe webhook integration
- ⏳ Trial expiry automation
- ⏳ Frontend UI for billing
