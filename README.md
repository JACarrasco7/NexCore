# Apex Coach OS

MVP inicial para una plataforma boutique de gestion coach-atleta orientada a preparadores premium. La primera version arranca con una base web en Next.js para validar el flujo central antes de entrar en automatizaciones mas complejas.

## Estado actual

La implementacion actual incluye:

- Home de producto orientada al caso de uso boutique.
- Vista inicial de dashboard coach.
- Vista inicial de rutina viva.
- Vista inicial de check-in semanal.
- Vista inicial de onboarding del atleta.
- Vault markdown preparado para Obsidian en la carpeta `vault`.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- App Router

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

## Rutas actuales

- `/`
- `/coach`
- `/coach/import-lab`
- `/athlete/onboarding`
- `/athlete/training-log`
- `/athlete/check-in`

## Documentacion y memoria

La carpeta `vault` esta pensada como vault de Obsidian para documentar producto, negocio, IA, roadmap y validacion sin mezclarlo todo en un unico archivo gigante.

## Siguiente foco

1. Extraer componentes reutilizables y estado mock para el flujo coach-atleta.
2. Definir modelo de datos base para atletas, sesiones, check-ins y alertas.
3. Implementar importacion de planes y persistencia real.
