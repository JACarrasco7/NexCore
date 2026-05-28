# Roadmap 6-12 meses

## Fase 1 ✅ Completada

- Onboarding (wizard 4 pasos).
- Rutina viva (training log con sets × {load, reps, RIR}).
- Check-in semanal (formulario + auto-resumen).
- Dashboard coach (estadísticas reales).

## Fase 2 ✅ Completada

- Importacion con IA (parser CSV/tabular, import-lab).
- Resumenes automaticos en check-in.
- Integraciones de salud base (Apple Health, Garmin, etc. — UI lista).
- Modelo de datos estable: 5 API routes, JSON persistence transitoria.

## Fase 2.5 ✅ Completada (2026-05)

- MySQL + Prisma 5 — base de datos real en Laragon.
- NextAuth.js v5 con Credentials provider + Prisma adapter.
- Roles: COACH / ATHLETE / ADMIN (enum en BD).
- Páginas /login y /register.
- Proxy (middleware Next.js 16) con protección de rutas por rol.
- API /api/register para crear usuarios con bcrypt.
- Build limpio: 16 rutas + proxy.

## Fase 3 — Siguiente

- Asociar sesión de usuario a atleta/coach en las páginas.
- Dashboard coach con datos del usuario autenticado (multi-coach).
- Perfil de usuario y settings.
- Stripe / pagos (suscripción coach).
- Posing, comunidad privada (opcional).
- Whitelabel.
- Automatizaciones avanzadas.

## Fase 3.5 — App Móvil (Capacitor)

- Integrar módulos móviles en web (reutilizar componentes)
- Overlay de guía en tiempo real (cuadrícula, ángulos)
- Detección automática de repeticiones
- Exportar video anotado
- Notificaciones push
- Publicar en Play Store / TestFlight
