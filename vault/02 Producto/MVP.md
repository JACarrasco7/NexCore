# MVP

## Nucleo del producto

1. Onboarding guiado del atleta.
2. Rutina interactiva en vivo.
3. Check-in semanal.
4. Dashboard del coach.

## Que si entra

- Ficha inicial, historial y restricciones.
- Fotos, videos de movilidad e inventario de maquinaria.
- Registro de series, reps, carga, RIR y descanso.
- Resumen automatico del check-in.
- Cola de revision y semaforos operativos.

## Que no entra de inicio

- Comunidad tipo feed.
- Marketplace.
- Multiples verticales deportivas.
- Biometria experimental como dependencia central.

## App Móvil (Capacitor)

### Módulos implementados

- **Cámara**: grabación con metadatos (ejercicio, atleta, timestamp)
- **Editor**: anotaciones (líneas, texto) sobre video
- **Pose detection**: MediaPipe para calcular ángulos y ROM
- **RIR Tracker**: registro manual y automático de repeticiones
- **Sync**: sincronización offline con backend
- **Export PDF**: reporte de métricas por video

### Roadmap móvil

- Overlay de guía en tiempo real (cuadrícula, ángulos)
- Detección automática de repeticiones (contar ciclos)
- Exportar video anotado (merge canvas + video)
- Notificaciones push para recordatorios
