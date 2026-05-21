# Arquitectura — Plan Maestro

Plan exhaustivo de **reorganización, optimización y corrección** de CARRIX Tech. Pensado para ejecutarse en fases sin romper lo existente.

## Contenido

1. [[01 Mapa de Modulos]] — Dominios y entidades
2. [[02 Flujos Funcionales]] — Flujos coach/atleta por módulo
3. [[03 Modelo de Datos]] — Entidades, relaciones, fuente de verdad
4. [[04 Reglas de Negocio]] — Qué va en backend vs frontend
5. [[05 APIs y Arquitectura Tecnica]] — Capas, endpoints, paquetes
6. [[06 Frontend y UX]] — Páginas, componentes, estados
7. [[07 Automatizacion LLM]] — Prompts internos para Haiku/Sonnet
8. [[08 Plan de Refactor]] — **Pasos concretos de programación**, ordenados

## Principios rectores

- **Una responsabilidad por endpoint, página y módulo.**
- **Fuente de verdad única** por entidad. Resto son proyecciones/lecturas.
- **Validación en tres capas**: Zod (entrada API) → reglas dominio (servicio) → BD (constraints).
- **No duplicar lógica** entre frontend y backend. Frontend valida UX, backend valida integridad.
- **Versionar planes, no editarlos destructivamente**.
- **Soft delete** + `deletedAt` en entidades críticas.
- **Cada API devuelve el mismo shape**: `{ items, nextCursor, total? }` para listas, entidad pura para detalle.

## Estado actual (resumen)

- Stack: Next.js 16 App Router, Prisma/MySQL, NextAuth v5, Zod, Tailwind.
- Auth y multi-tenant (Team) ya implementados con `requireTeamMembership` y `assertAthleteAccess`.
- Parsing JSON unificado con `parseJsonOrError` (~100 endpoints).
- Inconsistencia principal: shape de listas (array vs `{ items }`) y duplicación de lógica de carga en frontend.
- Sin versionado de planes ni snapshot histórico.

## Cómo usar este plan

- Lee [[01 Mapa de Modulos]] para entender el sistema.
- Salta a [[08 Plan de Refactor]] para acciones inmediatas con código.
- Cada sección referencia las demás con `[[wikilinks]]`.
