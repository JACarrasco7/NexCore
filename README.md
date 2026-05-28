# NEXUM

CARRIX Techinicial para una plataforma boutique de gestion coach-atleta orientada a preparadores premium. La primera version arranca con una base web en Next.js para validar el flujo central antes de entrar en automatizaciones mas complejas.

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
npm run sync      # Build + Capacitor sync (para móvil)
npm run android   # Abrir Android Studio
npm run test      # Vitest unit tests
npm run test:e2e  # Playwright E2E
```

## Rutas actuales

- `/` - Home
- `/coach` - Dashboard coach
- `/coach/import-lab` - Importación de planes
- `/athlete/onboarding` - Onboarding atleta
- `/athlete/training-log` - Registro de entrenamientos
- `/athlete/check-in` - Check-in semanal
- `/videos` - Lista de videos (web)
- `/videos/[id]` - Detalle de video + editor + RIR + export PDF
- `/mobile` - Interfaz móvil (Capacitor)

## App Móvil (Capacitor)

- Cámara integrada con `@capacitor/camera`
- Editor de video con anotaciones (Fabric.js)
- Detección de pose con MediaPipe
- Registro RIR manual y automático
- Sync offline con backend vía `/api/sync`

## Documentacion y memoria

La carpeta `vault` esta pensada como vault de Obsidian para documentar producto, negocio, IA, roadmap y validacion sin mezclarlo todo en un unico archivo gigante.

## Siguiente foco

1. Extraer componentes reutilizables y estado mock para el flujo coach-atleta.
2. Definir modelo de datos base para atletas, sesiones, check-ins y alertas.
3. Implementar importacion de planes y persistencia real.
