# Deploy Demo — Vercel + TiDB Cloud (serverless gratis)

Guía paso a paso para crear un cluster en TiDB Cloud, conectar con Prisma y desplegar en Vercel.

---

## ✅ Ya hecho por Copilot

- [x] `vercel.json` — build config para Vercel
- [x] Código pusheado a `JACarrasco7/NexCore` (rama `fix/branch-protection-workflow`)
- [x] `llm-proxy/` — proxy de failover con 10 APIs (corre local, no en Vercel)
- [x] `AUTH_SECRET` generado (abajo)

---

## 🔑 Paso 1: TiDB Cloud — Crear cluster serverless (5-10 min)

1. Entra a https://tidbcloud.com y crea una cuenta (puedes usar GitHub).
2. Crea un **Project** y dentro de él selecciona **Create Cluster**.
   - Elige **Serverless** (tier gratuito) o el plan que prefieras.
   - Selecciona proveedor de nube y región (ej. `us-east-1`) y pon nombre `nexcore`.
3. Espera a que el cluster esté `Running` (tarda unos minutos).
4. En la página del cluster → **Connect** → copia la **connection string** para MySQL.
   - Ejemplo de `DATABASE_URL` (prisma compatible):

```
mysql://<USER>:<PASSWORD>@<HOST>:<PORT>/<DATABASE>?sslaccept=strict
```

5. Seguridad / allowlist:
   - Para desarrollo local añade tu IP pública actual a la lista de acceso (Security / IP Whitelist).
   - Si vas a desplegar en Vercel: o bien añades las IPs de Vercel (si tienes control), o temporalmente permite acceso desde cualquier IP (`0.0.0.0/0`) y restringe por credenciales. Nota: `0.0.0.0/0` reduce seguridad.

6. Si TiDB Cloud ofrece un certificado CA para conexión TLS, descárgalo (opcional) y úsalo con `sslcert=./cert.pem` en la cadena si lo necesitas.

---

## 🔑 Paso 2: Probar localmente y crear tablas (3-7 min)

En **PowerShell** (desde tu PC):

```powershell
cd C:\laragon\www\app_fitness

# Pega aquí la connection string que copiaste de TiDB Cloud
$env:DATABASE_URL = "mysql://USER:PASSWORD@HOST:PORT/DATABASE?sslaccept=strict"

# Generar cliente Prisma
npx prisma generate

# Si tienes migrations (recomendado en producción):
npx prisma migrate deploy

# Alternativa (empujar esquema directamente):
npx prisma db push

# (Opcional) Ejecutar seeds si están configurados
npx prisma db seed
```

Notas:

- Si tu proyecto contiene migraciones en `prisma/migrations`, usa `npx prisma migrate deploy` para aplicar las migraciones en orden.
- `prisma db push` aplica el esquema directamente (útil para pruebas rápidas pero no recomendado para producción con historial de migraciones).

---

## 🔑 Paso 3: Configurar variables de entorno en Vercel

En el dashboard de Vercel → Settings → Environment Variables, añade las siguientes variables:

| Variable       | Ejemplo / Descripción                                             |
| -------------- | ----------------------------------------------------------------- |
| `DATABASE_URL` | La connection string MySQL copiada de TiDB Cloud (formato arriba) |
| `AUTH_SECRET`  | Cadena segura base64 (ver comando abajo)                          |
| `NEXTAUTH_URL` | `https://TU-PROYECTO.vercel.app` (se actualiza tras deploy)       |

Opcionales (si usas email, R2, etc): `RESEND_API_KEY`, `EMAIL_FROM`, `R2_*`.

---

## 🔑 Paso 4: Deploy en Vercel (5 min)

1. Entra a https://vercel.com → conecta tu cuenta GitHub.
2. Importa el repo `JACarrasco7/NexCore` y configura el proyecto.
   - Build Command: `npx prisma generate && next build`
   - Install Command: `npm install --legacy-peer-deps`
3. Pega las Environment Variables (ver Paso 3).
4. Deploy: espera 2-3 min.
5. Tras el primer deploy, actualiza `NEXTAUTH_URL` con el dominio final que Vercel entrega y redeploy.

---

## 🔧 Comandos útiles

- Obtener IP pública (PowerShell):

```powershell
(Invoke-RestMethod -Uri https://ifconfig.me).Trim()
```

- Generar `AUTH_SECRET` (local):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

- Prisma: generar cliente y aplicar migraciones (ejemplo):

```bash
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

---

## ⚠️ Notas y seguridad

- Vercel no siempre tiene IPs estáticas; para producción considera un proveedor con IP fija o una conexión privada/VPC si necesitas restringir origen.
- Mantén el `DATABASE_URL` privado en Vercel y no lo subas a git.
- Si usas `0.0.0.0/0` en la whitelist, asegúrate de tener contraseñas fuertes y rotación de credenciales.

---

## 🚀 Probar el proxy LLM (local, no en Vercel)

El proxy de failover NO se despliega en Vercel — corre solo en tu PC:

```powershell
node C:\laragon\www\app_fitness\llm-proxy\server.js
# → http://localhost:3000 con 10 APIs en cascada
```

---

## 📋 Resumen: lo que tienes que hacer tú

1. Crear cuenta en TiDB Cloud → crear Project → crear cluster serverless → copiar connection string
2. Añadir tu IP pública en la whitelist para pruebas locales (y considerar opciones para Vercel)
3. En local: `npx prisma generate` + `npx prisma migrate deploy` (o `db push`) + `npx prisma db seed`
4. En Vercel: crear proyecto, añadir `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL` → Deploy
5. Actualizar `NEXTAUTH_URL` tras primer deploy y redeploy

**Tiempo total estimado: ~15-25 min. Coste: plan serverless gratuito de TiDB Cloud.**
