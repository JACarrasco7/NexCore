# Deploy Demo — Vercel + PlanetScale ($0/mes)

> Todo lo automatizable ya está hecho. Solo quedan pasos manuales con autenticación web.

---

## ✅ Ya hecho por Copilot

- [x] `vercel.json` — build config para Vercel
- [x] Código pusheado a `JACarrasco7/ApexCoachOS` (rama `fix/branch-protection-workflow`)
- [x] `llm-proxy/` — proxy de failover con 10 APIs (corre local, no en Vercel)
- [x] `AUTH_SECRET` generado (abajo)

---

## 🔑 Paso 1: PlanetScale — Crear BD (5 min, manual)

1. Ve a **[planetscale.com](https://planetscale.com)** → **Sign up** (GitHub)
2. **New Database** → nombre: `apexcoach` → región: `us-east-1` → plan: **Free**
3. Una vez creada, ve a la pestaña **"Connect"**
4. Selecciona **"Prisma"** como framework
5. Copia el `DATABASE_URL`. Será algo como:

```
mysql://xxx:pscale_pw_xxx@aws.connect.psdb.cloud/apexcoach?sslaccept=strict
```

---

## 🔑 Paso 2: Crear tablas (3 min, manual)

En **PowerShell** (desde tu PC, no en Vercel):

```powershell
cd c:\laragon\www\app_fitness

# Pega el DATABASE_URL de PlanetScale
$env:DATABASE_URL = "mysql://xxx:pscale_pw_xxx@aws.connect.psdb.cloud/apexcoach?sslaccept=strict"

# Crear todas las tablas
npx prisma db push

# (Opcional) Datos de prueba
npx prisma db seed
```

Si `prisma db push` falla con error de FK:

```powershell
# Plan B: generar schema SQL y ejecutarlo manualmente
npx prisma migrate dev --name init --create-only
# Luego en PlanetScale dashboard → Console → pegar el SQL de la migración
```

---

## 🔑 Paso 3: Vercel — Deploy (5 min, manual)

1. Ve a **[vercel.com](https://vercel.com)** → **Sign up** (GitHub)
2. **Add New → Project**
3. Importa `JACarrasco7/ApexCoachOS`
4. En **Build & Development Settings**:
   - Framework: Next.js (auto)
   - Build Command: `npx prisma generate && next build`
   - Install Command: `npm install --legacy-peer-deps`

5. **Environment Variables** (copia y pega):

| Variable       | Valor                                                                         |
| -------------- | ----------------------------------------------------------------------------- |
| `DATABASE_URL` | `mysql://xxx:pscale_pw_xxx@aws.connect.psdb.cloud/apexcoach?sslaccept=strict` |
| `AUTH_SECRET`  | `P3P90iP6gRtEzEdgiBsQm1bBDhePyWAQnvle8OJSugY=`                                |
| `NEXTAUTH_URL` | `https://TU-PROYECTO.vercel.app` (Vercel te lo da al hacer deploy)            |

**Opcionales para demo** (dejar vacíos y la app funciona igual):

| Variable         | Para qué                     |
| ---------------- | ---------------------------- |
| `RESEND_API_KEY` | Email (recuperación, verify) |
| `EMAIL_FROM`     | Remitente emails             |

6. **Deploy** → espera 2-3 min

---

## 🔧 Paso 4: Actualizar NEXTAUTH_URL

Tras el primer deploy, Vercel te da un dominio tipo `apexcoach-xxx.vercel.app`.

1. Vercel → Settings → Environment Variables
2. Edita `NEXTAUTH_URL` → `https://apexcoach-xxx.vercel.app`
3. **Redeploy**

---

## ⚠️ Limitaciones demo gratuita

| Recurso                     | Límite                           | Solución                                               |
| --------------------------- | -------------------------------- | ------------------------------------------------------ |
| Uploads (`/public/uploads`) | No persiste en Vercel            | Configurar R2 (gratis 10GB) — vars `R2_*` ya en código |
| PlanetScale free            | 1B rows/mes, 1 DB, 1 branch      | OK para demo                                           |
| Vercel free                 | 100 GB bandwidth, 6000 min build | OK para demo                                           |
| Cold start                  | 1-3s sin tráfico                 | Normal en plan gratis                                  |

---

## 🚀 Probar el proxy LLM (local, no en Vercel)

El proxy de failover NO se despliega en Vercel — corre solo en tu PC:

```powershell
node c:\laragon\www\app_fitness\llm-proxy\server.js
# → http://localhost:3000 con 10 APIs en cascada
```

---

## 📋 Resumen: lo que tienes que hacer tú

1. Crear cuenta en PlanetScale → crear BD → copiar `DATABASE_URL`
2. Ejecutar `npx prisma db push` desde tu PC contra PlanetScale
3. Crear cuenta en Vercel → importar repo → pegar 3 env vars → Deploy
4. Actualizar `NEXTAUTH_URL` con el dominio de Vercel → Redeploy

**Tiempo total: ~15 min. Coste: $0/mes.**
