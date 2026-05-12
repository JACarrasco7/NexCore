# Plan de coherencia visual: headers en Coach

## Contexto

Hoy conviven 3 patrones de encabezado:

- Header operativo simple (eyebrow + titulo + acciones)
- Header hero tipo tarjeta (SectionIntro)
- Header mixto con espaciados y jerarquia distinta segun pagina

Esto rompe continuidad visual aunque funcionalmente este correcto.

## Objetivo

Definir un sistema de 2 headers oficiales y migrar todas las vistas a esos 2 patrones.

## Sistema propuesto

- Header A (Operativo): para dashboards, listas, mensajes, nutricion, facturacion, team settings.
- Header B (Hero): para herramientas y flujos de trabajo (import-lab, compare, forms complejos).

Regla:

- Si la pagina abre tareas de gestion diaria, usar Header A.
- Si la pagina es una herramienta focal con contexto previo, usar Header B.

## Especificacion visual comun

Tokens compartidos para A y B:

- Max width: 1480px dentro de PageShell
- Ritmo vertical: gap base 24px
- Eyebrow: text-xs, tracking-widest, uppercase, foreground/40
- Titulo: semantica H1, peso bold
- Descripcion: text-sm a text-base, foreground/55-65
- Actions: alineadas derecha en desktop, wrap en mobile

## Componentes canonicos

- PageShell: contenedor global
- PageHeader: Header A
- SectionIntro: Header B
- AlertBanner: mensajes de estado de pagina

## Mapeo inicial de vistas

Header A:

- /coach
- /coach/athletes
- /coach/messages
- /coach/nutrition
- /coach/team/billing
- /coach/team/settings
- /coach/profile

Header B:

- /coach/import-lab
- /coach/compare
- /coach/plans/new
- /coach/service-plans (si se mantiene enfoque de landing de modulo)

## Plan de implementacion por fases

1. Auditoria final

- Revisar todas las rutas coach y etiquetar A/B
- Confirmar excepciones por negocio

2. Contrato de componentes

- Cerrar props definitivas de PageHeader y SectionIntro
- Definir variantes permitidas (solo 2)

## Estado actual

- Implementado `PageShell` en las principales páginas `coach`: `compare`, `service-plans`, `team`, `profile`, `import-lab`, `import-lab/nutrition`, `plans/new`, `settings`, `wall`.
- `Header A` ya está en uso en páginas operativas previas y `Header B` se mantiene en herramientas.
- Quedan excepciones de print y laboratorio especial que se pueden migrar en la siguiente fase.

3. Migracion lote 1 (alta frecuencia)

- coach, athletes, messages, nutrition
- Validar responsive desktop/tablet/mobile

4. Migracion lote 2 (team + perfiles)

- team billing, team settings, profile
- Unificar banners y espaciados

5. Migracion lote 3 (herramientas)

- import-lab, compare, plans/new, service-plans
- Ajustar SectionIntro a contrato visual final

6. QA visual

- Capturas before/after por ruta
- Checklist de consistencia tipografica, spacing, CTA y jerarquia

## Criterios de aceptacion

- Ninguna pagina coach usa un header fuera de A o B
- Todas las paginas usan PageShell
- No hay tokens legacy de texto (ej. text-text-\*)
- Misma jerarquia visual para eyebrow, title, description y acciones
- Mobile: acciones no rompen layout ni overflow

## Riesgos

- Algunas paginas mezclan header con filtros y tabs en el mismo bloque
- Hero en herramientas puede requerir excepciones de contenido lateral

Mitigacion:

- Mantener excepciones solo por variante documentada, no por pagina ad-hoc

## Backlog opcional

- Crear Storybook/galeria interna para Header A y Header B
- Test visual por snapshots para rutas criticas
- Linter de clases utilitarias para bloquear tokens legacy
