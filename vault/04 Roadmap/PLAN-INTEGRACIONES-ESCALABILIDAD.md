# Plan integraciones, escalabilidad y mejoras

> Documento operativo para implementar con un agente (ChatGPT 5.5 mini / Copilot).
> Cada sección termina con un bloque **TASK** auto-contenido y verificable.
>
> 🆓 **Restricción dura: TODO debe ser gratis (free tier indefinido o open source self-host).**
> Si una opción solo es free trial → marcada como ❌.

---

## ⭐ DECISIÓN ESTRATÉGICA: Free → €20-50/mes → escala

> Análisis honesto, categoría por categoría. Tres fases claras:
>
> - **FASE 0 — Pruebas (mes 1-3, 0€)**: free tier real sin caducidad.
> - **FASE 1 — Validación (mes 4-12, €20-50/mes)**: cuando hay usuarios reales pero ingresos modestos.
> - **FASE 2 — Escala (€100+/mes)**: cuando monetizas y necesitas SLA.
>
> **Criterio FASE 0**: si el servicio se pausa, se borra o exige tarjeta → fuera.

---

### 🏠 HOSTING — análisis honesto

| Servicio             | Free real               | Caveat duro                                   | Paid €20-50         | ¿Cuándo pasar a paid?                         |
| -------------------- | ----------------------- | --------------------------------------------- | ------------------- | --------------------------------------------- |
| **Vercel Hobby**     | Ilimitado, no caduca    | ❌ Prohíbe uso comercial. 4.5MB body. 1 cron. | **Pro $20** (€19)   | Cuando monetices o necesites >1 cron / equipo |
| **Cloudflare Pages** | Ilimitado, comercial OK | Requiere OpenNext adapter (curva)             | **Workers Paid $5** | Casi nunca, escala enorme gratis              |
| **Fly.io**           | 3 VMs 256MB always-on   | Tarjeta obligatoria desde 2024 ⚠️             | $5-15 por VM extra  | Si necesitas always-on real con DB cerca      |
| **Railway**          | ❌ $5 trial             | Sin free real                                 | $5+/mes             | No usar en FASE 0                             |
| **Render**           | Web duerme 15min        | DB borra a 90 días                            | Web $7 + DB $7      | No competitivo                                |

**🥇 Recomendación FASE 0**: Vercel Hobby (DX inmejorable, no monetizas aún → ok).
**🥇 Recomendación FASE 1 (€19/mes)**: Vercel Pro. Justifica el precio solo en DX + previews + analytics + comercial OK.
**Alternativa FASE 1 (€0)**: Cloudflare Pages — si toleras la curva, ahorras los €19 indefinidamente.

---

### 🗄️ BASE DE DATOS — análisis honesto

| Servicio                   | Free real               | Caveat duro                          | Paid €20-50                            | ¿Cuándo pasar?                       |
| -------------------------- | ----------------------- | ------------------------------------ | -------------------------------------- | ------------------------------------ |
| **CockroachDB Serverless** | 10GB, no caduca         | Postgres-compat (no 100%)            | Standard $0.20/RU pay-as-you-go        | Cuando supere 50M RUs/mes            |
| **Neon**                   | 0.5GB, 190h compute/mes | Autosuspend 5min (cold start ~500ms) | **Launch $19** (10GB, sin autosuspend) | Cuando cold start moleste a usuarios |
| **Turso**                  | 9GB, 500 DBs            | SQLite ≠ Postgres → cambio engine    | **Starter $29** (24GB)                 | Si abrazas SQLite edge-first         |
| **Supabase**               | 500MB, 50k MAU          | ⚠️ Pausa a 7 días sin tráfico        | **Pro $25** (8GB + Storage + Realtime) | Si quieres bundle DB+Storage+Auth    |
| **Cloudflare D1**          | 5GB, 25M reads/día      | Solo Workers/Pages                   | Workers Paid $5 incluye                | Si vas all-in en CF                  |

**🥇 FASE 0 pruebas remotas**: **CockroachDB Serverless** (10GB sin caducidad, sin pausa, Postgres-compatible).
**🥇 FASE 1 producción (€19-25/mes)**: **Neon Launch ($19)** — mejor DX para Next.js, branching por PR. Si necesitas Storage+Realtime gratis bundled → **Supabase Pro ($25)**.
**Dev local siempre**: MySQL Laragon (cero cambios actuales).

⚠️ Migración MySQL→Postgres es inevitable si quieres free decente. Hazla una sola vez en FASE F.

---

### 📦 STORAGE — análisis honesto

| Servicio              | Free real                   | Caveat                           | Paid €20-50                    | ¿Cuándo?                              |
| --------------------- | --------------------------- | -------------------------------- | ------------------------------ | ------------------------------------- |
| **Cloudflare R2**     | 10GB, 1M ops, **egress $0** | Tarjeta obligatoria              | $0.015/GB extra (50GB ≈ $0.60) | Casi nunca, R2 es absurdamente barato |
| **Backblaze B2**      | 10GB, egress gratis vía CF  | Sin frontend integrado           | $0.006/GB (50GB ≈ $0.30)       | Alternativa idéntica a R2             |
| **UploadThing**       | 2GB                         | Insuficiente para fotos progreso | $10/mes 100GB                  | Si quieres cero config                |
| **Supabase Storage**  | 1GB                         | Bundled con Supabase Pro         | Incluido en Pro $25            | Si ya pagas Supabase                  |
| **Cloudflare Images** | 100k transforms/mes         | Solo imágenes                    | $5/mes 100k storage            | Si quieres thumbnails automáticos     |

**🥇 FASE 0 y FASE 1**: **Cloudflare R2**. Imbatible. €0 → €1-2/mes incluso a 100GB.
No hay razón para cambiar nunca.

---

### ⚡ CACHÉ / KV — análisis honesto

| Servicio          | Free real                 | Caveat                                    | Paid €20-50                                       | ¿Cuándo?                                       |
| ----------------- | ------------------------- | ----------------------------------------- | ------------------------------------------------- | ---------------------------------------------- |
| **Upstash Redis** | 10k cmds/día, 256MB       | Suficiente para rate-limit + caché ligera | **Pay-as-you-go $0.20/100k cmds** (~$5-10 típico) | Cuando superes 10k/día (≈100 usuarios activos) |
| **Vercel KV**     | 30k cmds/mes              | Mismo backend Upstash                     | Incluido en Vercel Pro $20                        | Si pagas Vercel                                |
| **Cloudflare KV** | 100k reads/día, 1k writes | Solo Workers                              | Workers Paid $5 incluye                           | Si vas a CF                                    |

**🥇 FASE 0 y FASE 1**: **Upstash Redis** PAYG. Probablemente €0-5/mes incluso con tráfico real.

---

### 📧 EMAIL — análisis honesto

| Servicio       | Free real         | Caveat duro                        | Paid €20-50                  | ¿Cuándo?                           |
| -------------- | ----------------- | ---------------------------------- | ---------------------------- | ---------------------------------- |
| **Resend**     | 3k/mes, 100/día   | Dominio verificado obligatorio     | **$20/mes 50k emails**       | Cuando superes 100/día             |
| **Brevo**      | 300/día (~9k/mes) | Branding en footer free            | **$25/mes 20k sin branding** | Si necesitas más volumen diario    |
| **Mailersend** | 3k/mes            | Trial 30 días con más              | $28/mes 50k                  | Alternativa a Resend               |
| **AWS SES**    | 62k/mes desde EC2 | Setup complejo, reputación a curar | $0.10/1k (~$5/mes 50k)       | Si quieres lo más barato escalando |

**🥇 FASE 0**: **Resend free** (ya integrado, 3k/mes sobra para validar).
**🥇 FASE 1 (€19/mes)**: **Resend Pro $20** — DX limpia, react-email, webhooks. No cambies si funciona.
**Para volumen extremo (>500k/mes)**: SES.

---

### 🔔 PUSH / NOTIFICACIONES — análisis honesto

| Servicio                | Free real                   | Caveat                             | Paid €20-50                      | ¿Cuándo?                     |
| ----------------------- | --------------------------- | ---------------------------------- | -------------------------------- | ---------------------------- |
| **OneSignal**           | Push web/móvil ilimitado    | Branding sutil, in-app limitado    | **Growth $9/mes** quita branding | Cuando quites branding       |
| **Web Push API nativa** | Ilimitado, cero terceros    | Tú gestionas suscripciones + VAPID | €0 siempre                       | Si quieres cero dependencias |
| **Novu**                | 30k eventos/mes orquestador | Self-host opción                   | **Business $250** ⚠️ caro        | Solo enterprise              |
| **Knock**               | 10k notif/mes               | Workflows visuales                 | $99/mes ❌ fuera presupuesto     | No                           |

**🥇 FASE 0 y FASE 1**: **OneSignal free** + **Web Push nativo** para fallback. Probablemente nunca pagues.

---

### 📊 ANALYTICS — análisis honesto

| Servicio             | Free real                     | Caveat             | Paid €20-50                        | ¿Cuándo?                            |
| -------------------- | ----------------------------- | ------------------ | ---------------------------------- | ----------------------------------- |
| **PostHog Cloud**    | 1M events + 5k recordings/mes | Sobra para validar | **Pay-as-you-go ~$0-50** según uso | Solo si superas 1M events           |
| **Vercel Analytics** | 2.5k events/mes Hobby         | Limitado           | Incluido en Pro $20                | Si pagas Vercel                     |
| **Plausible Cloud**  | ❌ trial 30 días              | Self-host gratis   | **$9/mes 10k pageviews**           | Si quieres simplicidad GDPR         |
| **Umami self-host**  | Gratis en Vercel+Neon         | Mantenimiento tuyo | €0                                 | Si toleras self-host                |
| **Mixpanel**         | 20M events/mes                | Generoso           | $25/mes Growth                     | Solo si necesitas funnels avanzados |

**🥇 FASE 0 y FASE 1**: **PostHog free** (analytics + flags + recordings + A/B en uno). Imbatible. Probablemente €0 hasta 1M events/mes.

---

### 🛡️ SEGURIDAD / ANTI-BOT — análisis honesto

| Servicio                 | Free real                      | Caveat                         | Paid €20-50              | ¿Cuándo?                     |
| ------------------------ | ------------------------------ | ------------------------------ | ------------------------ | ---------------------------- |
| **Cloudflare Turnstile** | Ilimitado, sin caducidad       | Solo CAPTCHA                   | €0 siempre               | Nunca                        |
| **Arcjet**               | 5k req/mes                     | Bot+rate-limit+email todo en 1 | **Pro $25/mes 100k req** | Si quieres consolidar 3 SDKs |
| **Cloudflare WAF**       | Reglas básicas en plan free CF | Avanzado solo Pro              | CF Pro $20/mes dominio   | Si recibes ataques reales    |
| **HIBP API**             | Ilimitado free                 | Solo passwords comprometidas   | €0 siempre               | Nunca                        |

**🥇 FASE 0 y FASE 1**: **Turnstile + HIBP + rate-limit propio (Upstash)**. €0.
Considera **Arcjet $25** solo si te cansas de mantener 3 integraciones separadas.

---

### 🔍 OBSERVABILIDAD — análisis honesto

| Servicio             | Free real                              | Caveat duro               | Paid €20-50                  | ¿Cuándo?                                          |
| -------------------- | -------------------------------------- | ------------------------- | ---------------------------- | ------------------------------------------------- |
| **Sentry Developer** | 5k errores, 10k traces, 50 replays/mes | Generoso para CARRIX Tech | **Team $26/mes 50k errores** | Cuando superes 5k errores (señal de bugs en prod) |
| **GlitchTip Cloud**  | 1k events/mes                          | Compatible Sentry SDK     | $5/mes 100k                  | Alternativa cheap a Sentry                        |
| **BetterStack Logs** | 1GB, 3 días retención                  | Retención corta           | **$25/mes 30GB, 30 días**    | Cuando necesites búsqueda histórica               |
| **Axiom**            | 0.5GB/día, 30 días                     | Generoso retención        | $25/mes 1GB/día              | Si Vercel-native te importa                       |
| **Highlight.io**     | 500 sessions replay/mes                | Full-stack alternativa    | $50/mes                      | Solo si Sentry no basta                           |

**🥇 FASE 0**: **Sentry Developer free** + **Axiom free** (logs).
**🥇 FASE 1 (€25/mes)**: **Sentry Team $26** cuando superes 5k errores. Logs siguen en Axiom free.

---

### ⚙️ JOBS / COLAS / CRON — análisis honesto

| Servicio                    | Free real                   | Caveat                         | Paid €20-50                 | ¿Cuándo?               |
| --------------------------- | --------------------------- | ------------------------------ | --------------------------- | ---------------------- |
| **Inngest**                 | 50k step runs/mes           | Generoso, retries+cron+fan-out | **Basic $20/mes 200k runs** | Cuando superes 50k     |
| **Trigger.dev**             | 5k runs/mes                 | OSS self-host opción           | $20/mes 25k                 | Alternativa a Inngest  |
| **Upstash QStash**          | 500 msgs/día (~15k/mes)     | HTTP simple                    | $1/100k msgs PAYG           | Para jobs simples      |
| **GitHub Actions schedule** | Ilimitado en repos públicos | 2k min/mes en privados         | €0 si público               | Crons sin contexto app |
| **Vercel Cron**             | 1 job Hobby                 | Limitado                       | Ilimitado en Pro $20        | Si pagas Vercel        |

**🥇 FASE 0**: **Inngest free** (50k sobra) + **GitHub Actions** para crons fijos.
**🥇 FASE 1**: igual. Probablemente €0 hasta tener miles de usuarios.

---

### 💳 PAGOS — análisis honesto

| Servicio          | Coste fijo | % transacción   | IVA EU                | ¿Cuándo?                                |
| ----------------- | ---------- | --------------- | --------------------- | --------------------------------------- |
| **Stripe**        | $0         | 1.5% EU + €0.25 | ❌ Tú gestionas IVA   | Si tienes asesor o eres autónomo simple |
| **Lemon Squeezy** | $0         | 5% + 50¢        | ✅ Merchant of Record | Recomendado España SaaS                 |
| **Paddle**        | $0         | 5% + 50¢        | ✅ MoR                | Alternativa a LS                        |
| **Polar**         | $0         | 4% + 40¢        | ✅ MoR (vía Stripe)   | Cripto-friendly, OSS                    |

**🥇 Recomendación España**: **Lemon Squeezy** o **Paddle** — el 5% extra (vs Stripe 1.5%) **vale la pena** porque te ahorra gestionar IVA OSS, registros UE, etc. A menos que tu asesor lo gestione barato.

---

## 🎯 STACKS RECOMENDADOS — 3 fases

### FASE 0 — Validación (mes 1-3, **€0/mes**)

```
Hosting:        Vercel Hobby (no monetizas aún → OK)
DB local:       MySQL Laragon
DB remota:      CockroachDB Serverless (10GB free, no pausa)
Storage:        Cloudflare R2 (10GB free, egress $0)
Caché:          Upstash Redis free
Email:          Resend free (3k/mes)
Push:           OneSignal free
Analytics:      PostHog free
Security:       Cloudflare Turnstile + HIBP
Observability:  Sentry Developer + Axiom free
Jobs:           Inngest free + GH Actions schedule
Pagos:          ❌ no aplica aún
TOTAL:          €0/mes
```

### FASE 1 — Validación con usuarios reales (mes 4-12, **€20-45/mes**)

```
Hosting:        Vercel Pro $20  (→ €19) — comercial OK + previews + 1 dominio
DB:             Neon Launch $19 (→ €18) — sin autosuspend, 10GB
Storage:        Cloudflare R2 PAYG (~€1)
Caché:          Upstash PAYG (~€2)
Email:          Resend free aún (sigue gratis hasta 3k/mes)
Push:           OneSignal free
Analytics:      PostHog free
Security:       Turnstile + HIBP (gratis)
Observability:  Sentry Developer free aún
Jobs:           Inngest free aún
Pagos:          Lemon Squeezy (0€ fijo, 5% por venta)
TOTAL:          ~€40/mes
```

**Alternativa FASE 1 ultra-barata (~€20/mes)** si toleras curva técnica:

```
Hosting:        Cloudflare Pages (€0, comercial OK, requiere OpenNext)
DB:             Neon Launch $19 (€18)
Resto:          igual a FASE 1
TOTAL:          ~€20/mes
```

### FASE 2 — Escala (>1k usuarios activos, **€100-200/mes**)

```
Hosting:        Vercel Pro $20 + más bandwidth (~€40)
DB:             Neon Scale $69 (€65) o Supabase Pro $25 + addons
Storage:        R2 PAYG (~€5-10)
Caché:          Upstash PAYG (~€10)
Email:          Resend Pro $20 (50k emails)
Push:           OneSignal Growth $9 (sin branding)
Analytics:      PostHog PAYG (~€20-50)
Security:       Arcjet Pro $25 (consolidar)
Observability:  Sentry Team $26
Jobs:           Inngest Basic $20
Pagos:          Lemon Squeezy (5% por venta)
TOTAL:          ~€150-200/mes (sin contar % pagos)
```

---

## 📊 Comparativa total: gasto acumulado primeros 12 meses

| Mes             | Stack FASE 0 | Stack FASE 1 normal | Stack FASE 1 ultra |
| --------------- | ------------ | ------------------- | ------------------ |
| 1-3             | €0           | €0                  | €0                 |
| 4-6             | —            | €120 (3×€40)        | €60 (3×€20)        |
| 7-12            | —            | €240 (6×€40)        | €120 (6×€20)       |
| **Total año 1** | **€0**       | **~€360**           | **~€180**          |

**Conclusión**: con €20-50/mes de presupuesto **vas sobrado** para 12 meses validando. Solo si llegas a producto real con cientos de usuarios pagando salta a FASE 2.

---

## 8. Catálogo completo por funcionalidad (TODO FREE / OSS)

> Leyenda: ✅ recomendado · ⚠️ con matices · ❌ no free real · 🔧 self-host

### 🏠 HOSTING

| Servicio             | Free | Notas                                                                                                         |
| -------------------- | ---- | ------------------------------------------------------------------------------------------------------------- |
| **Vercel Hobby**     | ✅   | Mejor DX Next.js. ⚠️ Prohíbe uso comercial en Hobby. Límite 4.5MB body.                                       |
| **Cloudflare Pages** | ✅✅ | Free ilimitado, **comercial permitido**, sin cold starts reales (Workers). Requiere `@opennextjs/cloudflare`. |
| **Fly.io**           | ✅   | 3 VMs 256MB always-on. Docker. Más curva.                                                                     |
| **Render**           | ⚠️   | Web service duerme a los 15min sin tráfico. Postgres free solo 90 días.                                       |
| **Railway**          | ❌   | Solo $5 trial, no free real.                                                                                  |
| **Netlify**          | ⚠️   | 100GB bw, pero Next.js soporte peor que Vercel/CF.                                                            |

**Combo recomendado CARRIX Tech(0€):**

```
Cloudflare Pages + R2 + Neon + Upstash + Sentry free
```

**Combo recomendado si priorizas DX (no comercial aún):**

```
Vercel Hobby + R2 + Neon + Upstash + Sentry free
```

---

### 🗄️ BASE DE DATOS

> **Criterio de evaluación**: free **sin límite de tiempo**, escalable pagando después, compatible con Prisma y el schema relacional actual.

#### Auditoría honesta — ¿qué es realmente gratis sin caducar?

| Servicio                   | Motor            | ¿Caduca?                   | Límite free real                                            | Escala pagando               | Veredicto                                       |
| -------------------------- | ---------------- | -------------------------- | ----------------------------------------------------------- | ---------------------------- | ----------------------------------------------- |
| **Neon**                   | Postgres         | No ⏱️                      | 0.5GB storage, 190h compute/mes (~6h/día), autosuspend 5min | Sí (Launch $19/mes)          | ✅ **Usar para pruebas**                        |
| **CockroachDB Serverless** | Postgres-compat. | No ⏱️                      | **10GB** storage, 50M RUs/mes (~mucho)                      | Sí (Standard desde $0.20/RU) | ✅✅ **Mejor opción gratis**                    |
| **Supabase**               | Postgres         | ⚠️ Pausa a 7 días inactivo | 500MB, 50k MAU                                              | Sí (Pro $25/mes)             | ⚠️ **Solo si sabes que tendrá tráfico regular** |
| **Turso**                  | SQLite (libSQL)  | No ⏱️                      | 9GB, 500 DBs, 1B reads/mes                                  | Sí (Starter $29/mes)         | ⚠️ **SQLite ≠ Postgres, cambio de engine**      |
| **Cloudflare D1**          | SQLite           | No ⏱️                      | 5GB, 25M reads/día                                          | Workers Paid $5/mes          | ⚠️ **Solo si vas all-in en CF Workers**         |
| **Render Postgres**        | Postgres         | ❌ Borra a 90 días         | 1GB                                                         | Sí                           | ❌ **No usar**                                  |
| **PlanetScale**            | MySQL            | ❌ Ya no free              | —                                                           | $39/mes mínimo               | ❌                                              |
| **Railway**                | MySQL/Postgres   | ❌ Solo $5 trial           | —                                                           | $5/mes mínimo                | ❌                                              |
| **ElephantSQL**            | Postgres         | ❌ Servicio cerrado        | —                                                           | —                            | ❌                                              |
| **Aiven**                  | Postgres/MySQL   | ❌ 30 días trial           | —                                                           | Caro                         | ❌                                              |
| **Laragon local**          | MySQL            | ✅ Local, gratis           | Disco local                                                 | —                            | ✅ **Dev local**                                |

#### 🥇 Recomendación definitiva (pruebas → producción)

**Fase pruebas (ahora, 0€)**:

- `local` → MySQL en Laragon (ya tienes, no cambiar nada).
- Cuando necesites deploy de prueba → **CockroachDB Serverless** (10GB gratis, no caduca, Postgres-compatible).

**Fase producción (cuando pagues)**:

- **Neon Pro** ($19/mes) → mejor DX, branching por entorno, ideal con Vercel.
- **Supabase Pro** ($25/mes) → si quieres también Storage + Realtime bundled.
- **PlanetScale Core** ($39/mes) → si vuelves a MySQL (pero más caro).
- **Railway** ($5+/mes) → si quieres MySQL sin migrar a Postgres.

#### Por qué CockroachDB Serverless es la mejor opción gratis real

- **10GB gratis** (vs 0.5GB de Neon) → no te quedas sin espacio en pruebas.
- **No caduca, no se pausa** → puedes dejarlo semanas sin tráfico sin perder datos.
- **Compatible Postgres** → Prisma funciona con cambio mínimo (driver `pg`).
- **Escala automático** → pagas solo lo que usas cuando monetizas.
- **Distribuido global** → sin configuración extra.

```bash
# Cambio mínimo en prisma/schema.prisma:
provider = "cockroachdb"   # o "postgresql" también funciona
# DATABASE_URL = "postgresql://user:pass@cluster.cockroachlabs.cloud:26257/db?sslmode=verify-full"
```

⚠️ **Diferencias con MySQL a auditar**: `autoincrement()` → `@default(gen_random_uuid())` para UUIDs o usar `BigSerial`. Tipos `Json` ok. `DateTime` ok. `Enum` ok.

**Prisma adapters disponibles:** `@prisma/adapter-neon`, `@prisma/adapter-d1`, `@prisma/adapter-turso`.
Driver estándar para CockroachDB: `npm i pg` (Prisma usa el driver `postgresql` nativo).

---

### 📦 STORAGE / ARCHIVOS

| Servicio              | Free | Notas                                                                     |
| --------------------- | ---- | ------------------------------------------------------------------------- |
| **Cloudflare R2**     | ✅✅ | 10GB, 1M ops clase A, **egress $0** (killer vs S3). S3-compatible API.    |
| **Supabase Storage**  | ✅   | 1GB free. Fácil si ya usas Supabase DB.                                   |
| **UploadThing**       | ✅   | 2GB free, SDK muy fácil para Next.js. Recomendado si quieres cero config. |
| **Backblaze B2**      | ✅   | 10GB free, $0.006/GB extra. Egress gratis via CF partner.                 |
| **ImageKit**          | ✅   | 20GB, transformaciones imagen gratis. CDN incluida.                       |
| **Cloudflare Images** | ✅   | 100k transforms/mes. Thumbnails automáticos.                              |
| **AWS S3**            | ❌   | Solo 12 meses free.                                                       |

**SDK recomendado (S3-compatible → funciona con R2 y B2):**

```bash
npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Flujo presigned URL** (ya descrito en §7.7): cliente sube directo al bucket, no pasa por Next.js.

---

### ⚡ CACHÉ / KV / REDIS

| Servicio                       | Free | Notas                                                            |
| ------------------------------ | ---- | ---------------------------------------------------------------- |
| **Upstash Redis**              | ✅✅ | 10k cmds/día, 256MB. REST API edge-safe. Ya integrado.           |
| **Upstash QStash**             | ✅   | 500 msgs/día. Cola HTTP serverless. Para jobs simples.           |
| **Cloudflare KV**              | ✅   | 100k reads/día, 1k writes/día, 1GB. Solo en Workers/Pages.       |
| **Vercel KV**                  | ✅   | Mismo backend Upstash, mejor DX si en Vercel. 30k cmds/mes free. |
| **Cloudflare Durable Objects** | ✅   | 1M req/mes. Estado persistente por objeto. Para realtime/locks.  |

**Usos concretos en esta app:**

- `rate:ip:*` → rate-limit login/register (ya hecho).
- `wger:exercise:*` → caché ejercicios Wger (TTL 24h).
- `otp:userId:*` → secreto pendiente TOTP (TTL 10min) en lugar de DB.
- `session:lock:*` → evitar doble submit en check-in.
- `coach:today:coachId` → caché dashboard coach (TTL 60s).

---

### 📧 EMAIL

| Servicio                     | Free | Notas                                                        |
| ---------------------------- | ---- | ------------------------------------------------------------ |
| **Resend**                   | ✅✅ | 3k emails/mes, 100/día. Dominio verificado. Ya integrado.    |
| **Brevo (ex-Sendinblue)**    | ✅   | 300 emails/día, sin límite mensual. Sin dominio obligatorio. |
| **Mailersend**               | ✅   | 3k emails/mes, templates drag & drop.                        |
| **Cloudflare Email Routing** | ✅   | Recibir emails en dominio propio y reenviar. Gratis.         |
| **SMTP2Go**                  | ✅   | 1k emails/mes free.                                          |

**Templates con React:**

```bash
npm i react-email @react-email/components
```

→ Crea `emails/plan-assigned.tsx`, `emails/checkin-reminder.tsx`, etc. Resend los renderiza.

---

### 🔔 NOTIFICACIONES / PUSH

| Servicio                   | Free | Notas                                                                         |
| -------------------------- | ---- | ----------------------------------------------------------------------------- |
| **OneSignal**              | ✅✅ | Push web + iOS + Android **ilimitado**. Ya hay webhook.                       |
| **Web Push API**           | ✅✅ | Nativo del navegador. Sin terceros. Requiere service worker.                  |
| **Notifee** (React Native) | ✅   | Si llegas a app nativa.                                                       |
| **Novu**                   | ✅   | 30k eventos/mes. Orquestador multi-canal (email+push+SMS+inapp). SDK Next.js. |
| **Knock**                  | ✅   | 10k notif/mes. Workflows visuales.                                            |

**Recomendación**: integrar **Novu** como orquestador. Define `templates` y él decide canal (push/email/inapp) según preferencias del usuario. Free 30k/mes.

```bash
npm i @novu/node @novu/notification-center
```

---

### 📊 ANALYTICS PRODUCTO

| Servicio                  | Free | Notas                                                        |
| ------------------------- | ---- | ------------------------------------------------------------ |
| **PostHog Cloud**         | ✅✅ | 1M events/mes, feature flags, A/B, funnels, recordings (5k). |
| **Vercel Analytics**      | ✅   | Core Web Vitals + visitors. Solo si en Vercel.               |
| **Vercel Speed Insights** | ✅   | Real User Metrics. Solo si en Vercel.                        |
| **Umami**                 | 🔧✅ | Self-host en Vercel + Neon. GDPR-compliant, sin cookies.     |
| **Plausible**             | 🔧✅ | Self-host solo. Pago si cloud.                               |
| **Mixpanel**              | ✅   | 20M events/mes free. Más potente que GA para producto.       |
| **Tinybird**              | ✅   | 1k rows/s ingest, real-time SQL. Para dashboards custom.     |

**Para esta app**: PostHog es suficiente (producto + flags + recordings en uno).

---

### 🛡️ SEGURIDAD / AUTH

| Servicio                   | Free | Notas                                                                      |
| -------------------------- | ---- | -------------------------------------------------------------------------- |
| **next-auth v5**           | ✅✅ | Ya integrado.                                                              |
| **Cloudflare Turnstile**   | ✅✅ | CAPTCHA invisible, ilimitado. Anti-bot en register/login.                  |
| **@simplewebauthn/server** | ✅✅ | Passkeys/WebAuthn OSS. Sin dependencias. Añadir como 2º factor.            |
| **HIBP API**               | ✅   | Have I Been Pwned. Comprobar passwords comprometidas en registro.          |
| **Arcjet**                 | ✅   | 10k req/mes. Shield anti-bot, rate-limit, email validation, todo en 1 SDK. |
| **next-secure-headers**    | ✅   | CSP, HSTS, etc. desde `next.config.ts`.                                    |
| **@t3-oss/env-nextjs**     | ✅   | Validar env vars con Zod en build time.                                    |

**Arcjet** merece atención: una sola integración reemplaza Turnstile + rate-limit manual + bot detection:

```bash
npm i arcjet
```

```ts
// middleware.ts
import arcjet, { shield, tokenBucket } from '@arcjet/next'
const aj = arcjet({ key: process.env.ARCJET_KEY, rules: [shield({ mode: 'LIVE' })] })
```

---

### 🔍 OBSERVABILIDAD / LOGS / ERRORES

| Servicio                  | Free | Notas                                                            |
| ------------------------- | ---- | ---------------------------------------------------------------- |
| **Sentry**                | ✅✅ | 5k errores, 10k traces, 50 replays/mes. SDK Next.js first-class. |
| **GlitchTip**             | 🔧✅ | Self-host compatible Sentry SDK. 1k events/mes cloud gratis.     |
| **Axiom**                 | ✅   | 0.5GB/día ingest, 30 días retención. Vercel integra nativo.      |
| **BetterStack (Logtail)** | ✅   | 1GB logs, 3 días retención free.                                 |
| **OpenTelemetry**         | ✅✅ | Estándar OSS. Next.js 16 soporta `instrumentation.ts` nativo.    |
| **Pino**                  | ✅✅ | Logger Node.js más rápido. `pino-pretty` en dev. JSON en prod.   |
| **Highlight.io**          | ✅   | 500 sessions replay/mes free. Alternativa Sentry full-stack.     |

**Setup mínimo recomendado:**

```bash
npm i @sentry/nextjs pino pino-pretty
```

`instrumentation.ts` en raíz activa OpenTelemetry automáticamente con Sentry.

---

### ⚙️ BACKGROUND JOBS / COLAS

| Servicio                    | Free | Notas                                                                  |
| --------------------------- | ---- | ---------------------------------------------------------------------- |
| **Inngest**                 | ✅✅ | 50k step runs/mes. Retries, fan-out, cron, durable steps. SDK Next.js. |
| **Trigger.dev**             | ✅   | 5k runs/mes. Similar Inngest, open source.                             |
| **Upstash QStash**          | ✅   | 500 msgs/día. Cola HTTP + cron. Más simple.                            |
| **GitHub Actions schedule** | ✅✅ | Cron ilimitado. Para `weekly-report`, `inactive-athlete`, etc.         |
| **Vercel Cron**             | ✅   | 1 job en Hobby, ilimitado en Pro.                                      |

**Recomendación**: Inngest para jobs complejos (retries, pasos encadenados). QStash para disparos simples HTTP. GH Actions para crons que no necesitan contexto de app.

---

### 💳 PAGOS

| Servicio          | Free | Notas                                                                  |
| ----------------- | ---- | ---------------------------------------------------------------------- |
| **Stripe**        | ✅   | $0 fijo. Solo % por transacción (~2.9%+30¢). Test mode ilimitado.      |
| **Lemon Squeezy** | ✅   | $0 fijo + 5%. Más simple para SaaS/licencias digitales. Maneja IVA EU. |
| **Paddle**        | ✅   | Merchant of Record (gestiona IVA global). 5% + 50¢.                    |

**Para España/EU**: Lemon Squeezy o Paddle son mejores por la gestión automática del IVA.

---

### 🧪 TESTING

| Herramienta                   | Free | Notas                                                    |
| ----------------------------- | ---- | -------------------------------------------------------- |
| **Vitest**                    | ✅✅ | Unit + integration. Rápido, compatible Jest.             |
| **Playwright**                | ✅✅ | E2E browser. GH Actions incluido.                        |
| **MSW (Mock Service Worker)** | ✅✅ | Mock API en tests y dev. Intercepta fetch.               |
| **@testing-library/react**    | ✅✅ | Render components en jsdom.                              |
| **Faker.js**                  | ✅   | Datos de test realistas.                                 |
| **Prisma client mock**        | ✅   | `jest-mock-extended` + tipo Prisma.                      |
| **Storybook**                 | ✅   | Catálogo de componentes UI. Chromatic free 5k snapshots. |

---

### 🎨 UI / COMPONENTES

| Paquete                            | Notas                                                               |
| ---------------------------------- | ------------------------------------------------------------------- |
| **shadcn/ui**                      | Copy-paste Radix+Tailwind. No instala paquete, controlas el código. |
| **Radix UI** (`@radix-ui/react-*`) | Primitivos accesibles (Dialog, Dropdown, Tabs, Tooltip…).           |
| **Sonner**                         | Toasts modernos. Sustituye el actual `ui/toast.tsx`.                |
| **Vaul**                           | Drawers tipo iOS. Para check-in rápido en móvil.                    |
| **cmdk**                           | Command palette ⌘K. Para coach: saltar atleta/plan/check-in.        |
| **Framer Motion**                  | Animaciones declarativas. Transiciones de ruta, acordeones.         |
| **Embla Carousel**                 | Carrusel ligero. Galería fotos progreso.                            |
| **React Day Picker**               | Calendario de sesiones.                                             |
| **Tiptap**                         | Editor rich-text para notas del coach.                              |
| **dnd kit** (`@dnd-kit/core`)      | Drag & drop para reordenar ejercicios en plan.                      |
| **Lucide React**                   | 1400+ iconos tree-shakeable.                                        |
| **class-variance-authority**       | Variantes de componentes tipadas.                                   |
| **tailwind-merge + clsx**          | Componer clases sin conflictos.                                     |

---

### 📱 PWA / MOBILE

| Paquete                       | Notas                                                        |
| ----------------------------- | ------------------------------------------------------------ |
| **@serwist/next**             | Service Worker + cache estrategias. Sucesor de `next-pwa`.   |
| **idb-keyval**                | IndexedDB sencillo. Cola offline de sesiones en gym.         |
| **browser-image-compression** | Comprimir fotos antes de subir. Ahorra R2 + velocidad.       |
| **@vercel/og**                | Imágenes OG dinámicas (perfil coach, share progreso atleta). |

---

### 🔗 INTEGRACIONES EXTERNAS

| Servicio / Paquete         | Free | Uso                                                                     |
| -------------------------- | ---- | ----------------------------------------------------------------------- |
| **Wger API**               | ✅✅ | Catálogo ejercicios. Ya integrado. Añadir caché Upstash.                |
| **Open Food Facts**        | ✅✅ | Catálogo nutrición sin coste. Alternativa a edamam.                     |
| **Cal.com embed**          | ✅   | Reservas coach-atleta embebidas. Free self-host o iframe embed.         |
| **Tally** / **Formbricks** | ✅   | Forms adicionales (feedback, encuestas check-in extra). Formbricks OSS. |
| **Resend Webhooks**        | ✅   | Recibir eventos de entrega email (rebotes, abiertos).                   |
| **Stripe Webhooks**        | ✅   | Confirmar pagos de planes de servicio.                                  |
| **Twilio**                 | ❌   | No free. Reemplazar por email + push para notificaciones.               |

---

### 🛠️ DX / CALIDAD DE CÓDIGO

| Herramienta                                | Notas                                                            |
| ------------------------------------------ | ---------------------------------------------------------------- |
| **Husky + lint-staged**                    | Git hooks: lint + format solo archivos modificados.              |
| **Prettier + prettier-plugin-tailwindcss** | Ordenar clases Tailwind automáticamente.                         |
| **@next/bundle-analyzer**                  | Visualizar qué ocupa el bundle client.                           |
| **zod-to-openapi**                         | Generar spec OpenAPI desde schemas Zod existentes.               |
| **tsx**                                    | Ya tienes. Runner TypeScript sin compilar.                       |
| **next-safe-action**                       | Server actions tipadas con Zod + middleware. Menos boilerplate.  |
| **server-only / client-only**              | Garantizar que un módulo no se filtre al bundle equivocado.      |
| **@t3-oss/env-nextjs**                     | Validar todas las env vars en build. Falla rápido si falta algo. |

---

## 0. Estado actual (auditoría rápida)

### Git / GitHub

- Repo: `https://github.com/JACarrasco7/Nexum`
- Ramas remotas: `main`, `develop` (apuntan al mismo commit `5eb7415`).
- Default branch remoto: **`main`** (NO se cambió a `develop`).
- Protección de `main`: **NO aplicada** (la llamada a la API GitHub quedó pendiente: faltaba `GITHUB_TOKEN`).
- Local: rama de trabajo `local` apunta a develop; hay 2 ficheros modificados sin commit:
  - `src/app/api/notifications/route.ts`
  - `src/app/api/notifications/mark-read/route.ts`
- Recomendación de flujo simple:
  - `main` → producción (protegida, solo PR desde `develop`).
  - `develop` → integración (default branch para PRs).
  - `local` → tu rama de trabajo diario; rebases/merges contra `develop`.

### Stack actual (`package.json`)

- Next.js **16.2.4** (App Router + Turbopack), React **19.2.4**.
- Auth: `next-auth@5.0.0-beta.28` + `@auth/prisma-adapter`.
- DB: Prisma **5.22** + MySQL.
- 2FA TOTP propio (RFC6238 en `src/lib/totp.ts`), `qrcode`, `bcryptjs`.
- PDF/firmas: `pdf-lib`, `@signpdf/*`.
- Email/SMS: `resend`, `twilio`.
- Charts: `recharts`. Validación: `zod`.
- Rate-limit: `src/lib/rate-limit.ts` (Upstash REST con fallback in-memory).
- ⚠️ `otplib` sigue en `dependencies` pero **ya no se usa** (sustituido por `src/lib/totp.ts`). Eliminar.

### Cosas que faltan / huelen mal

- **Sin observabilidad**: no hay Sentry, no logs estructurados, no métricas.
- **Sin tests automatizados** (solo scripts ad-hoc en `scripts/`). Sin CI.
- **Sin caché**: las llamadas a Wger y stats de coach se recalculan cada request.
- **Sin colas**: notificaciones, emails y webhooks corren inline en route handlers.
- **Sin storage gestionado**: subidas en `public/uploads/` (no escala en Vercel/serverless).
- **Sin headers de seguridad** (CSP, HSTS, frame-ancestors) en `next.config.ts`.
- **Sin `.env.example`** versionado → onboarding frágil.
- **Sin Husky/lint-staged** → formato/lint inconsistente.
- **Ficheros temporales `temp-*.mjs` y `scripts/*.json/*.txt`** commiteados → ruido en repo.
- **`backupCodes` legacy** sigue en `User` además de la nueva tabla → consolidar.
- **Middleware** hace `getToken` en cada request a páginas → coste; falta `bypass` para assets estáticos adicionales (`/uploads`, `/api/webhooks/*` ya ok).

---

## 1. Decisión de stack: opiniones (TODO FREE)

### 1.0 Tabla resumen free-tier (mayo 2026)

| Servicio                       | Free tier                                                              | Veredicto                 |
| ------------------------------ | ---------------------------------------------------------------------- | ------------------------- |
| **Vercel Hobby**               | 100GB bw, cron sin límite, 1 cron job, no comercial                    | ✅ para dev/CARRIX Tech   |
| **Railway**                    | $5 trial → ❌ no es free real                                          | ❌                        |
| **Render**                     | Web service free 750h, **se duerme**, Postgres free 90 días            | ⚠️                        |
| **Fly.io**                     | 3 VMs shared 256MB, 3GB storage, always-on                             | ✅ alternativa solid      |
| **Cloudflare Pages + Workers** | 100k req/día Workers, ilimitado Pages, R2 10GB free                    | ✅✅ joya                 |
| **Neon (Postgres)**            | 0.5GB, autosuspend, branching                                          | ✅ mejor que MySQL gratis |
| **PlanetScale**                | ❌ ya no tiene free tier                                               | ❌                        |
| **Supabase free**              | 500MB DB, 1GB storage, 50k MAU, 2 proyectos pausados a 7 días inactivo | ✅ con cuidado            |
| **Upstash Redis free**         | 10k cmds/día, 256MB                                                    | ✅                        |
| **Sentry Developer**           | 5k errores/mes, 10k traces, 50 replays                                 | ✅                        |
| **Resend free**                | 3k emails/mes, 100/día, solo desde dominio verificado                  | ✅                        |
| **Twilio**                     | $15 trial → ❌                                                         | ❌ usar email/push        |
| **OneSignal free**             | Push ilimitado web/móvil                                               | ✅                        |
| **Cloudflare R2**              | 10GB storage, 1M class A ops/mes, **0$ egress**                        | ✅✅ mata a S3            |
| **UploadThing free**           | 2GB storage                                                            | ⚠️ corto                  |
| **PostHog Cloud free**         | 1M events/mes producto + 5k recordings                                 | ✅                        |
| **Plausible**                  | ❌ pago / self-host gratis                                             | ⚠️                        |
| **Umami self-host**            | Gratis en Vercel + Neon                                                | ✅ analytics simple       |
| **BetterStack Logs free**      | 1GB, 3 días retención                                                  | ✅                        |
| **Axiom free**                 | 0.5GB/día ingest, 30 días                                              | ✅                        |
| **Inngest free**               | 50k step runs/mes                                                      | ✅ jobs serverless        |
| **Trigger.dev free**           | 5k runs/mes                                                            | ✅                        |
| **Stripe**                     | 0$ fijo, % por venta                                                   | ✅ pay-as-you-earn        |

### 1.1 Supabase vs Neon vs seguir con MySQL

| Criterio             | Supabase                | Firebase            | Prisma + MySQL (actual) |
| -------------------- | ----------------------- | ------------------- | ----------------------- |
| Modelo               | Postgres relacional     | NoSQL (Firestore)   | Relacional              |
| Auth                 | Sí (con RLS)            | Sí                  | next-auth (ya hecho)    |
| Storage              | Sí (S3-like)            | Sí                  | No (filesystem)         |
| Realtime             | Sí (replicación lógica) | Sí                  | No (habría que añadir)  |
| Encaje con tu schema | **Alto** (es Postgres)  | Bajo (rehacer todo) | Ya funciona             |
| Vendor lock-in       | Bajo (es Postgres puro) | Alto                | Ninguno                 |

**Problema actual**: MySQL en Laragon → para producción gratis hay 0 opciones decentes (PlanetScale ya no es free, Railway tampoco).

**Recomendación free-tier**:

- 🥇 **Migrar a Postgres + Neon** (free 0.5GB, branching para previews, scale-to-zero). Prisma soporta cambio de provider con cambios mínimos.
- 🥈 **Supabase** si quieres además Storage + Realtime gratis bundled (pero sus proyectos free se pausan a 7 días inactivos).
- 🥉 Mantener MySQL local en dev y deployar la DB también a Neon/Supabase (Postgres) en prod → 1 sola migración.

**Storage de archivos**:

- 🥇 **Cloudflare R2** (10GB free, **egress gratis** = clave para servir fotos sin coste).
- 🥈 Supabase Storage (1GB free, fácil con presigned URLs).
- ❌ AWS S3 free → solo 12 meses.

**Firebase**: descartar (vendor lock + no relacional).

### 1.2 Upstash (Redis serverless) — FREE

- ✅ Ya integrado en `rate-limit.ts`. Free 10k cmds/día.
- Casos: rate-limit, caché Wger, OTP efímero, idempotency webhooks, locks distribuidos.
- Alternativa free: **Cloudflare KV** (100k reads/día, 1k writes/día, 1GB) si vas a Workers.

### 1.3 Sentry — FREE Developer

- ✅ Imprescindible. 5k errores + 10k traces + 50 replays/mes gratis.
- Alternativa 100% free + self-host: **GlitchTip** (compatible con SDK de Sentry).
- Para logs estructurados gratis: **BetterStack** (1GB) o **Axiom** (0.5GB/día).

### 1.4 Hosting FREE comparativa

|             | Vercel Hobby      | Fly.io free     | Cloudflare Pages  | Render free          |
| ----------- | ----------------- | --------------- | ----------------- | -------------------- |
| Next.js DX  | 🥇 nativo         | Manual (Docker) | Vía OpenNext      | Manual               |
| Always-on   | Serverless (cold) | ✅ sí           | Workers (no cold) | ❌ duerme tras 15min |
| DB incluida | No                | No              | No (D1 free 5GB)  | Postgres 90 días     |
| Cron        | 1 job hobby       | crontab en VM   | Cron triggers ✅  | Sí                   |
| Body upload | 4.5MB ❌          | Sin límite ✅   | 100MB             | Sin límite           |
| Comercial   | ❌ no permitido   | ✅              | ✅                | ✅                   |

**Recomendación gratis para esta app**:

- 🥇 **Cloudflare Pages + Workers + D1/R2 + Neon** → 0€ real, sin cold starts, comercial OK, bypass del límite 4.5MB con R2 directo. Único pero: requiere `@opennextjs/cloudflare`.
- 🥈 **Vercel Hobby + Neon + R2** → DX inmejorable, pero Hobby prohíbe uso comercial (ojo si monetizas).
- 🥉 **Fly.io + Neon + R2** → Docker, always-on real. Curva más alta.

**Decisión sugerida MVP**: Vercel Hobby + Neon + R2 mientras es pre-revenue. Cuando monetices → Cloudflare Pages o Fly.

### 1.5 Otras integraciones FREE recomendadas

- **PostHog Cloud free** → analytics producto + feature flags + A/B + recordings (1M events/mes).
- **Resend free** → 3k emails/mes (ya está). Templates con `react-email`.
- **OneSignal free** → push web + móvil ilimitado.
- **Cloudflare R2** → uploads, 0$ egress.
- **Inngest free** (50k runs) o **Trigger.dev** (5k) → jobs/colas serverless con reintentos.
- **Stripe** → pay-as-you-earn cuando llegue el momento.
- **Cal.com self-host** o **embed free** → reservas con coach.
- **Tally / Formbricks** → forms gratis para feedback/check-in extra.
- **Vercel Cron** (Hobby: 1 job) o **GitHub Actions schedule** (gratis ilimitado) → recordatorios.

### 1.6 Skills/paquetes Next.js 16 que valen la pena

- **`next-safe-action`** → server actions tipadas con Zod, sin boilerplate.
- **`server-only` / `client-only`** → garantizar que un módulo no se filtre al bundle equivocado.
- **`use cache` directive (Next 16)** → caché granular nativa, sustituye `unstable_cache`.
- **`@vercel/og`** → generar imágenes OG dinámicas (perfil coach, share progreso).
- **`next-intl`** → i18n si vas a multi-idioma (ES/EN).
- **`next-themes`** → ya lo tienes, mantener.
- **`@tanstack/react-query`** → cache cliente para datos que invalidan (overview, today). Mejor que useEffect+fetch.
- **`swr`** → alternativa más ligera de react-query.
- **`zustand`** → state global cliente sin Redux (ej: drawer abierto, filtros).
- **`react-hook-form` + `@hookform/resolvers/zod`** → forms con validación tipada.
- **`shadcn/ui`** → componentes copy-paste basados en Radix + Tailwind. Encaja con tu stack actual.
- **`@radix-ui/react-*`** primitives → accesibilidad gratis (dialog, popover, tabs).
- **`sonner`** → toasts modernos, mejor que el actual.
- **`cmdk`** → command palette (⌘K) para coach (saltar a atleta, plan, etc.).
- **`vaul`** → drawers tipo iOS para móvil (check-in rápido).
- **`framer-motion`** → animaciones suaves entre rutas.
- **`lucide-react`** → iconos, tree-shakeable.
- **`date-fns`** o **`dayjs`** → fechas (recharts, check-ins). Evita moment.
- **`tailwind-merge` + `clsx`** → componer clases sin conflictos.
- **`class-variance-authority`** → variantes de componentes tipadas.
- **`react-day-picker`** → calendario para programación de sesiones.
- **`react-pdf` / `@react-pdf/renderer`** → generar PDFs de planes/contratos sin servidor.
- **`tiptap`** → editor rich-text para notas del coach.
- **`embla-carousel-react`** → carruseles (galería progreso).
- **`react-dropzone`** → upload con drag & drop.
- **`browser-image-compression`** → comprimir fotos antes de subir (ahorra R2).
- **`workbox-webpack-plugin` / `@serwist/next`** → PWA + offline (clave para atleta en gym sin cobertura).
- **`@vercel/analytics`** + **`@vercel/speed-insights`** → free, métricas Core Web Vitals.
- **`zod-to-openapi`** → generar docs API automáticamente desde tus schemas zod.

---

## 2. Paquetes / extensiones recomendadas (todos FREE/OSS)

### Dependencias a añadir — núcleo (FASE A-C)

```bash
# Observabilidad
npm i @sentry/nextjs
npm i pino pino-pretty
# Validación entorno
npm i @t3-oss/env-nextjs
# Headers seguridad
npm i next-secure-headers
# Upstash oficial
npm i @upstash/redis @upstash/ratelimit --legacy-peer-deps
# Vercel free
npm i @vercel/analytics @vercel/speed-insights
```

### Dependencias UI/DX (FASE D-E)

```bash
# Forms + state
npm i react-hook-form @hookform/resolvers zod
npm i @tanstack/react-query
npm i zustand
# UI
npm i sonner cmdk vaul lucide-react
npm i tailwind-merge clsx class-variance-authority
npm i framer-motion
npm i react-day-picker date-fns
# Server actions
npm i next-safe-action
# Email templates
npm i react-email @react-email/components
# Storage R2 (S3-compatible)
npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
# Imágenes
npm i browser-image-compression
# PWA offline
npm i @serwist/next serwist
# Rich text (notas coach)
npm i @tiptap/react @tiptap/starter-kit
# Analytics producto
npm i posthog-js posthog-node
```

### Dependencias DEV / Testing / Quality

```bash
npm i -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
npm i -D @playwright/test
npm i -D husky lint-staged prettier prettier-plugin-tailwindcss
npm i -D @next/bundle-analyzer
npm i -D tsx
```

### shadcn/ui (no es paquete, es CLI copy-paste)

```bash
npx shadcn@latest init
npx shadcn@latest add button input dialog dropdown-menu toast tabs card form select
```

### Dependencias a eliminar

```bash
npm uninstall otplib   # ya no se usa, reemplazado por src/lib/totp.ts
```

### Servicios free a dar de alta

| Servicio      | URL                 | Para qué                   |
| ------------- | ------------------- | -------------------------- |
| Neon          | neon.tech           | Postgres prod free         |
| Upstash       | upstash.com         | Redis (rate-limit + caché) |
| Cloudflare R2 | dash.cloudflare.com | Storage uploads            |
| Sentry        | sentry.io           | Errores                    |
| Resend        | resend.com          | Emails (ya tienes)         |
| OneSignal     | onesignal.com       | Push                       |
| PostHog       | posthog.com         | Analytics + feature flags  |
| Vercel        | vercel.com          | Hosting                    |

### Extensiones VS Code recomendadas (`.vscode/extensions.json`)

- `prisma.prisma`
- `bradlc.vscode-tailwindcss`
- `esbenp.prettier-vscode`
- `dbaeumer.vscode-eslint`
- `eamodio.gitlens`
- `usernamehw.errorlens`
- `christian-kohler.path-intellisense`
- `formulahendry.auto-rename-tag`
- `streetsidesoftware.code-spell-checker` + `streetsidesoftware.code-spell-checker-spanish`
- `github.vscode-pull-request-github`
- `ms-azuretools.vscode-docker` (si dockerizamos)

---

## 3. Plan de implementación (orden sugerido)

### FASE A — Higiene del repo y CI (1-2 días)

**TASK A1 — Limpieza de repo**

- Mover `temp-*.mjs` y `scripts/*.json|*.txt|cookies*.txt` fuera del repo o añadir a `.gitignore`.
- Añadir `.gitignore` entries: `scripts/*.json`, `scripts/*.txt`, `scripts/cookies*.txt`, `.env*.local`, `playwright-report/`, `coverage/`.
- Crear `.env.example` con todas las claves (sin valores) leídas desde el código.
- Eliminar `otplib` de `package.json`.
- Verificar: `git status` limpio + `npm run lint` sin errores.

**TASK A2 — Husky + lint-staged + Prettier**

- `npx husky init`.
- `.husky/pre-commit` → `npx lint-staged`.
- `package.json` → `"lint-staged": { "*.{ts,tsx}": ["prettier --write", "eslint --fix"] }`.
- `.prettierrc` con `prettier-plugin-tailwindcss`.
- Verificar: hacer un commit toca solo los ficheros modificados.

**TASK A3 — GitHub Actions CI**

- Crear `.github/workflows/ci.yml`:
  - Triggers: PR a `develop` y `main`.
  - Jobs: install → lint → typecheck (`tsc --noEmit`) → test (vitest) → build (mock env).
  - Cache de `~/.npm` y `.next/cache`.
- Crear `.github/workflows/e2e.yml` (Playwright, opcional, sobre `develop`).
- Verificar: PR de prueba muestra checks verdes.

**TASK A4 — Branch protection y default branch**

- Cambiar default branch del repo a `develop` (Settings → General).
- Proteger `main`:
  - Require PR before merging (1 approval).
  - Require status checks: `ci/build`, `ci/test`.
  - Require linear history.
  - Include administrators.
- Proteger `develop` (más laxo): require status checks.
- Verificar vía API:
  ```powershell
  $h = @{ Authorization = "token $env:GITHUB_TOKEN"; Accept = "application/vnd.github+json" }
  Invoke-RestMethod -Headers $h "https://api.github.com/repos/JACarrasco7/Nexum" | Select default_branch
  Invoke-RestMethod -Headers $h "https://api.github.com/repos/JACarrasco7/Nexum/branches/main/protection"
  ```

### FASE B — Validación de entorno y seguridad (1 día)

**TASK B1 — Validar env con `@t3-oss/env-nextjs`**

- Crear `src/env.ts` con schema Zod para:
  - `DATABASE_URL`, `AUTH_SECRET`, `RESEND_API_KEY`, `TWILIO_*`, `UPSTASH_REDIS_REST_URL/TOKEN`, `SENTRY_DSN`, `NEXT_PUBLIC_*`.
- Importar `env` en lugar de `process.env` en el código nuevo.
- Verificar: arrancar dev sin variables falla con mensaje claro.

**TASK B2 — Headers de seguridad**

- En `next.config.ts` añadir `headers()` con:
  - `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
  - CSP estricto en producción (con `report-only` primero).
- Verificar: `curl -I https://app/...` muestra headers.

**TASK B3 — Consolidar backup codes**

- Migración Prisma para eliminar `User.backupCodes` (todos ya migrados a tabla `backup_codes`).
- Borrar branch legacy en `src/lib/backup-codes.ts`.
- Verificar: tests TOTP siguen pasando.

**TASK B4 — Rotar/limpiar `temp-*.mjs` y `scripts/*` con secretos**

- Buscar tokens/cookies commiteados → invalidar y purgar con `git filter-repo` si los hay.

### FASE C — Observabilidad (1 día)

**TASK C1 — Sentry**

- `npx @sentry/wizard@latest -i nextjs`.
- Configurar `sentry.{client,server,edge}.config.ts`.
- `tracesSampleRate: 0.1`, `profilesSampleRate: 0.1`.
- Filtrar PII (emails, tokens) con `beforeSend`.
- Crear `/api/_health` que devuelva `{ ok: true, version }`.
- Verificar: lanzar error en una ruta y verlo en Sentry.

**TASK C2 — Logging estructurado**

- Crear `src/lib/logger.ts` con Pino (transport `pino-pretty` solo en dev).
- Reemplazar `console.log/error` críticos por `logger.info/error` con contexto.
- Verificar: logs en formato JSON en producción.

### FASE D — Performance y escalabilidad (2-3 días)

**TASK D1 — Caché Wger con Upstash**

- Wrapper `src/lib/cache.ts` con `getOrSet(key, ttl, fetcher)` usando `@upstash/redis`.
- Aplicar a `/api/wger/exercise-info` y `/api/wger/exercise-muscles` (TTL 24h).
- Verificar: segunda request es <50ms.

**TASK D2 — Rate-limit con `@upstash/ratelimit`**

- Sustituir `src/lib/rate-limit.ts` por `@upstash/ratelimit` (algoritmo sliding window).
- Mantener fallback in-memory solo para dev.
- Verificar: 6ª request a `/api/auth/...` devuelve 429.

**TASK D3 — Storage de uploads → R2/Supabase Storage**

- Crear `src/lib/storage.ts` abstraído (driver `local` | `r2` | `supabase`).
- Subir desde el cliente con presigned URL (no pasar bytes por API route).
- Migrar `public/uploads/progress-photos` y `public/uploads/docs` a bucket.
- Verificar: subida de foto desde `athlete-photos-tab.tsx` aterriza en R2.

**TASK D4 — Notificaciones asíncronas**

- Opción ligera: tabla `NotificationDelivery` (ya existe) + cron `/api/cron/notifications/process-pending` (ya existe). Verificar que funciona end-to-end.
- Opción robusta: integrar **Inngest** o **Trigger.dev** para reintentos y dead-letter.
- Verificar: enviar 100 notificaciones no bloquea ninguna request.

**TASK D5 — Índices y queries**

- Revisar `prisma studio` o EXPLAIN sobre top 5 queries (coach today, athlete overview, training stats).
- Añadir índices compuestos donde falten (ya hay migración `perf_indexes_scalability`, validar cobertura).
- Verificar: queries críticas <100ms con dataset realista (seed-test-data.ts).

### FASE E — Testing (paralelo, continuo)

**TASK E1 — Vitest setup**

- `vitest.config.ts` con alias `@/` y `jsdom`.
- Tests unitarios para:
  - `src/lib/totp.ts` (vectores RFC6238 oficiales).
  - `src/lib/backup-codes.ts`.
  - `src/lib/rate-limit.ts` (mock Upstash).
  - `src/lib/validators/index.ts`.
- Verificar: `npm test` corre en CI.

**TASK E2 — Playwright E2E**

- Flujos críticos:
  - Registro → onboarding atleta.
  - Login + 2FA setup + 2FA verify.
  - Coach asigna plan → atleta lo ve → completa sesión.
  - Subir foto progreso.
- Run sobre dev server en CI con servicio MySQL en GH Actions.

### FASE F — Despliegue FREE (1 día)

**TASK F1 — Migrar de MySQL a Postgres (Neon)**

- Cambiar `provider = "postgresql"` en `prisma/schema.prisma`.
- Revisar tipos no portables (`Json` ok, `LongText` → `Text`, `tinyint` → `Boolean`).
- Generar nueva migración inicial Postgres en branch separada.
- Crear DB en Neon, copiar `DATABASE_URL` con `?sslmode=require`.
- Re-seed con `seed.ts`.
- Verificar: `prisma migrate deploy` en CI verde.

**TASK F2 — Setup Vercel + envs**

- `vercel.json` con `regions: ["fra1"]` (o más cerca del usuario).
- Env vars en proyecto: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `NEXTAUTH_URL`, `UPSTASH_*`, `R2_*`, `RESEND_API_KEY`, `SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`.
- Vercel Cron: 1 job → `/api/cron/notifications/process-pending` cada 5 min.
- Resto de crons → GitHub Actions schedule (gratis ilimitado).
- Verificar: deploy preview en PR + healthcheck `/api/_health` 200.

**TASK F3 — Pipeline de release**

- `develop` → deploy preview Vercel automático.
- Merge `develop` → `main` → deploy producción + tag `vX.Y.Z` vía GH Action.
- Workflow `release.yml` que cree GitHub Release con changelog auto (`conventional-changelog`).

---

## 7. Flujos nuevos (back + front)

### 7.1 Onboarding atleta (mejorado)

```
Front                            Back
─────                            ────
/register (form RHF+zod) ──POST─► /api/register
  └─ confirm email link ◄──────── Resend email (react-email template)
/auth/verify-email?token ──GET──► /api/auth/verify-email
/onboarding (multi-step)         server action: saveOnboardingStep(data)
  ├─ paso 1: perfil               ├─ Zod parse + Prisma upsert
  ├─ paso 2: objetivos             ├─ PostHog capture('onboarding_step_n')
  ├─ paso 3: foto progreso         └─ R2 presigned URL upload directo cliente
  └─ paso 4: 2FA opcional
→ /athlete (dashboard)           query react-query: GET /api/athletes/me/overview (cached use cache)
```

### 7.2 Login + 2FA (estado actual + mejoras)

```
/login → credentials → JWT { totpEnabled, totpVerified:false }
  ├─ middleware bloquea rutas protegidas si totpEnabled && !totpVerified
  ├─ /login?totp_required=1 → modal TOTP (componente totp-login-modal)
  └─ POST /api/2fa/validate → unstable_update → totpVerified:true
Mejoras pendientes:
  - Trusted device cookie (30 días) firmada con HMAC para saltar TOTP en device conocido.
  - Backup codes one-time consumption (ya hecho en tabla, falta UI de "used X/10").
  - WebAuthn/Passkeys como segundo factor opcional (lib `@simplewebauthn/server` + `/browser`, FREE OSS).
```

### 7.3 Plan de entrenamiento (coach → atleta)

```
Coach UI                        Server Action / API
────────                        ───────────────────
/coach/plans/new                createPlan(data)  [next-safe-action]
  ├─ form RHF + zod              ├─ Prisma createMany sessions+exercises
  ├─ drag-drop ejercicios        ├─ NotificationDelivery.enqueue(athleteId, 'plan_assigned')
  │   (dnd-kit, FREE)            └─ revalidatePath('/coach/plans')
  └─ preview PDF (@react-pdf)

Atleta UI
─────────
/athlete/plan                   GET /api/me/plan (use cache: 60s)
  ├─ tab "hoy"
  └─ tab "semana"
/athlete/training-log           server action logSession(sid, sets[])
  └─ optimistic update           ├─ Prisma SessionLog create + stats
  (react-query mutation)         ├─ revalidateTag(`athlete:${id}:stats`)
                                 └─ Inngest trigger 'session.completed'
                                       └─ recompute weekly volume
                                       └─ push notification a coach
```

### 7.4 Check-in semanal

```
/athlete/check-in (vaul drawer)
  ├─ form: peso, foto, sueño, ánimo, notas
  ├─ foto → comprime cliente (browser-image-compression) → R2 presigned
  ├─ submit → server action saveCheckIn()
  │     ├─ Prisma transaction: BodyMeasurement + ProgressPhoto + CheckIn
  │     ├─ Inngest event 'checkin.submitted'
  │     │     ├─ recompute trend (sparkline data)
  │     │     └─ notify coach (push + email digest)
  │     └─ revalidateTag(`coach:${coachId}:inbox`)
  └─ confetti + toast (sonner)
```

### 7.5 Chat / Wall (mejoras realtime)

**Sin coste**: usar **Server-Sent Events** (`/api/chat/stream`) sobre Vercel Edge runtime (free). Más simple que websockets y soportado nativo por Next.
Alternativa premium gratis: **Supabase Realtime** (free 200 conexiones concurrentes).

```
Flujo SSE:
Front EventSource('/api/chat/stream?room=X')
  └─ Edge route mantiene conexión
  └─ Upstash Redis pub/sub o polling Prisma cada 2s
  └─ React state actualiza mensajes en vivo
```

### 7.6 Notificaciones (multi-canal)

```
event (ej: 'plan_assigned')
  └─ NotificationQueue.enqueue(userId, type, payload)
        └─ Inngest job 'notify' (free 50k runs)
              ├─ DB: insert Notification row (campanita)
              ├─ Email: Resend (si user.prefs.email)
              ├─ Push: OneSignal (si user.subscribed)
              └─ NotificationDelivery: log + retry on fail
```

### 7.7 Subida de archivos (R2)

```
Front                                   Back
─────                                   ────
select file → comprimir (cliente)
  ↓
POST /api/uploads/presign {filename, mime, size}
                                 ──► validar (zod, max 10MB, mime allowlist)
                                     generar key: `progress/{userId}/{uuid}.webp`
                                     S3 presigned PUT URL (R2, expira 5min)
  ◄── { url, key }
PUT directo a R2 con el blob
  ↓
POST /api/progress-photos { key }
                                 ──► Prisma create ProgressPhoto { url: cdn/key }
                                     PostHog capture('photo_uploaded')
```

### 7.8 PWA + offline (atleta en gym sin cobertura)

- `@serwist/next` → service worker.
- Cachear: shell del app, último plan, último log de sesión.
- IndexedDB (vía `idb-keyval` FREE) para cola de sesiones offline.
- Al recuperar red → flush a `/api/session-logs` con idempotency key.
- Manifest + iconos → instalable en móvil sin App Store.

### 7.9 Background jobs (Inngest free)

```
Eventos disparados desde server actions / API routes:
  - user.registered → email bienvenida + asignar coach default
  - checkin.submitted → recompute trends + notify coach
  - session.completed → update streak + check achievement unlocks
  - plan.assigned → notify athlete (multi-canal)
  - photo.uploaded → generar thumbnail + WebP
  - weekly.report (cron domingo 20:00) → email digest a coach con todos sus atletas
  - inactive.athlete (cron diario) → si 7 días sin log → notify coach
```

---

## 4. Cosas que arreglar YA (quick wins)

1. ❌ `otplib` en `package.json` sin usar → eliminar.
2. ❌ Ficheros `temp-*.mjs` en raíz commiteados → mover a `scripts/dev/` o borrar.
3. ❌ `scripts/*.json|*.txt` con cookies/tokens → `.gitignore` + revocar tokens si hay.
4. ❌ `public/uploads/` con PDFs binarios commiteados → quitar del repo, no escala.
5. ❌ Default branch sigue siendo `main` sin protección → arreglar (TASK A4).
6. ❌ Cambios sin commitear en `notifications/route.ts` y `mark-read/route.ts` → revisar y commitear.
7. ⚠️ `middleware.ts` usa `(req as any).nextUrl` → tipar bien con `NextRequest`.
8. ⚠️ `setInterval` en `rate-limit.ts` → en serverless se ejecuta cada cold start, no aporta. Eliminar.
9. ⚠️ Falta `AUTH_TRUST_HOST=true` para producción detrás de proxy.

---

## 5. Resumen de respuestas a tus preguntas (FREE-only)

| Pregunta           | Veredicto                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| ¿Supabase?         | Solo Storage si no usas R2. DB → mejor **Neon** (no se pausa).                                                                  |
| ¿Firebase?         | No (vendor lock + no relacional).                                                                                               |
| ¿Upstash?          | Sí (ya integrado). Migrar a `@upstash/ratelimit` oficial.                                                                       |
| ¿Sentry?           | Sí, free Developer (5k errores/mes). Alternativa OSS: **GlitchTip**.                                                            |
| ¿Vercel o Railway? | **Railway no es free** (solo $5 trial). Usa **Vercel Hobby** (no comercial) o **Cloudflare Pages** (sin restricción comercial). |
| ¿DB en producción? | **Neon** (Postgres free, branching). Migrar de MySQL → Postgres en FASE F.                                                      |
| ¿Storage uploads?  | **Cloudflare R2** (10GB + 0$ egress).                                                                                           |
| ¿Push?             | **OneSignal free** ilimitado.                                                                                                   |
| ¿SMS?              | ❌ Twilio no es free. Sustituir por email + push.                                                                               |
| ¿Analytics?        | **PostHog free** (1M events) + Vercel Analytics free.                                                                           |
| ¿Git ya está?      | Casi. Faltan: protección `main`, default branch a `develop`, CI, commit pendiente.                                              |

---

## 6. Cómo usar este plan con el agente

Para cada **TASK X**:

1. Pega el bloque al agente con: _"Implementa TASK X del plan, sin tocar nada fuera del scope. Cuando termines, ejecuta el paso de verificación."_
2. Revisa el diff antes de commitear.
3. Commit con prefijo: `feat(taskA1): limpieza de repo` / `chore(taskC1): integrar sentry`.
4. PR contra `develop`. Merge cuando CI verde.
