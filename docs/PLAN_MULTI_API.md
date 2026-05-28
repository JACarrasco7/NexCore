# Plan: Integración Multi-API con Failover Automático en VS Code

> **Objetivo:** usar GitHub Copilot como principal + respaldo automático con APIs gratuitas (7 proveedores, 16 modelos) mediante failover cuando se agote la cuota de cada una.

---

## 1. Panorama General

```
┌─────────────────────────────────────────────────┐
│                  VS Code                         │
│  ┌──────────┐  ┌─────────────────────────────┐  │
│  │ Copilot  │  │  Continue / Cline            │  │
│  │ (Microsoft│  │  ┌───────────────────────┐  │  │
│  │  ilimitado│  │  │   LLM Proxy Local     │  │  │
│  │  con sub) │  │  │   localhost:3000      │  │  │
│  └──────────┘  │  │                        │  │  │
│                │  │  Prioridad:             │  │  │
│                │  │  1. Groq (rápido)       │  │  │
│                │  │  2. Gemini (2 modelos)  │  │  │
│                │  │  3. DeepSeek (3 mod.)   │  │  │
│                │  │  4. Together (2 mod.)   │  │  │
│                │  │  5. Cerebras (2 mod.)   │  │  │
│                │  │  6. NVIDIA (1 mod.)     │  │  │
│                │  │  7. Poolside (1 mod.)   │  │  │
│                │  └───────────────────────┘  │  │
│                └─────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Dos herramientas, dos propósitos:**
| Herramienta | Rol | Límite |
|---|---|---|
| **GitHub Copilot** | Programación diaria (completado, chat inline) | Ilimitado (suscripción) |
| **Continue/Cline → Proxy** | Tareas pesadas, modelos específicos, fallback | Hasta agotar cuota gratuita de cada API |

---

## 2. Inventario de APIs y Modelos

### 2.1 Groq (prioridad 1 — más rápido, más generoso)

| Modelo                                      | Cuota gratuita aprox |
| ------------------------------------------- | -------------------- |
| `llama-3.3-70b-versatile`                   | ~30 req/min, ~7k/día |
| `deepseek-r1-distill-llama-70b`             | misma cuota          |
| `qwen-2.5-coder-32b`                        | misma cuota          |
| `meta-llama/Llama-4-Scout-17B-16E-Instruct` | misma cuota          |

### 2.2 Google Gemini (prioridad 2)

| Modelo                           | Cuota gratuita aprox      |
| -------------------------------- | ------------------------- |
| `gemini-2.5-flash-preview-04-17` | 1.5k req/día              |
| `gemini-2.5-pro-exp-03-25`       | 50 req/día (experimental) |

### 2.3 DeepSeek (prioridad 3)

| Modelo                     | Cuota                    |
| -------------------------- | ------------------------ |
| `deepseek-chat` (free key) | ~50 req/día              |
| `deepseek-chat` (paid key) | sin límite, pago por uso |
| `deepseek-reasoner`        | ~50 req/día              |

### 2.4 Together AI (prioridad 4)

| Modelo                                              | Cuota gratuita aprox |
| --------------------------------------------------- | -------------------- |
| `meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8` | ~100 req/día         |
| `deepseek-ai/DeepSeek-V3`                           | ~100 req/día         |

### 2.5 Cerebras (prioridad 5)

| Modelo                           | Cuota gratuita aprox |
| -------------------------------- | -------------------- |
| `llama-3.3-70b`                  | ~100 req/día         |
| `llama-4-scout-17b-16e-instruct` | ~100 req/día         |

### 2.6 NVIDIA (prioridad 6)

| Modelo                        | Cuota gratuita aprox |
| ----------------------------- | -------------------- |
| `meta/llama-3.3-70b-instruct` | ~100 req/día         |

### 2.7 Poolside / Laguna (prioridad 7)

| Modelo     | Cuota gratuita aprox |
| ---------- | -------------------- |
| `poolside` | ~50 req/día          |

---

## 3. Arquitectura del Proxy de Failover

### 3.1 Lógica

```
Petición entrante (OpenAI-compatible)
        │
        ▼
┌───────────────────┐
│ Intentar Provider 1│──✅──▶ devolver respuesta
└──────┬────────────┘
       │ ❌ (cuota / error)
       ▼
┌───────────────────┐
│ Intentar Provider 2│──✅──▶ devolver respuesta
└──────┬────────────┘
       │ ❌
       ▼
      ...
       │
       ▼
┌───────────────────┐
│ Provider N         │
└──────┬────────────┘
       │ ❌
       ▼
  502 All exhausted
```

### 3.2 Detección de cuota agotada

El proxy interpreta como "cuota agotada → saltar al siguiente" estos casos:

| Señal              | Qué busca                                       |
| ------------------ | ----------------------------------------------- |
| HTTP 429           | Rate limit / too many requests                  |
| HTTP 402           | Payment required / billing                      |
| HTTP 403 + mensaje | "quota", "billing", "exhausted", "insufficient" |
| HTTP 5xx           | Fallo del servidor (opcional, configurable)     |

### 3.3 Mapeo de modelos por proveedor

El proxy expone nombres genéricos y los traduce al modelo real de cada proveedor:

| Nombre genérico | Groq                      | Gemini             | DeepSeek            | Together           | Cerebras        | NVIDIA          | Poolside   |
| --------------- | ------------------------- | ------------------ | ------------------- | ------------------ | --------------- | --------------- | ---------- |
| `auto`          | `llama-3.3-70b-versatile` | `gemini-2.5-flash` | `deepseek-chat`     | `llama-4-maverick` | `llama-3.3-70b` | `llama-3.3-70b` | `poolside` |
| `coder`         | `qwen-2.5-coder-32b`      | —                  | `deepseek-chat`     | `deepseek-v3`      | —               | —               | —          |
| `reasoner`      | `deepseek-r1-distill-70b` | `gemini-2.5-pro`   | `deepseek-reasoner` | —                  | —               | —               | —          |

---

## 4. Implementación

### 4.1 Requisitos previos

- Node.js ≥ 20 instalado
- Claves API guardadas en variables de entorno (nunca en el código)

### 4.2 Estructura de archivos

```
llm-proxy/
├── package.json
├── server.js          # Proxy principal
├── providers.js       # Definición de proveedores
├── .env.example       # Plantilla de variables
└── README.md
```

### 4.3 Configuración de variables de entorno (.env)

```env
# Groq
GROQ_API_KEY=gsk_xxx

# Google Gemini
GEMINI_API_KEY=AIza_xxx

# DeepSeek (2 keys: free + paid)
DEEPSEEK_FREE_KEY=sk-xxx
DEEPSEEK_PAID_KEY=sk-xxx

# Together AI
TOGETHER_API_KEY=tgp_v1_xxx

# Cerebras
CEREBRAS_API_KEY=csk-xxx

# NVIDIA
NVIDIA_API_KEY=nvapi-xxx

# Poolside
POOLSIDE_API_KEY=sky_xxx
```

### 4.4 Instalación

```powershell
mkdir llm-proxy
cd llm-proxy
npm init -y
npm install express axios dotenv
```

### 4.5 Código del proxy

#### `server.js`

```js
require('dotenv').config()
const express = require('express')
const { getProviders } = require('./providers')

const app = express()
app.use(express.json({ limit: '10mb' }))

const PORT = process.env.PORT || 3000
const PROVIDERS = getProviders()

// ── Detección de cuota agotada ──
function isQuotaExhausted(err) {
  const r = err?.response
  if (!r) return false
  if (r.status === 429 || r.status === 402) return true
  const msg = JSON.stringify(r.data || '').toLowerCase()
  return /quota|billing|exhausted|insufficient|rate.limit|too.many/i.test(msg)
}

function isServerError(err) {
  return err?.response?.status >= 500
}

// ── POST /v1/chat/completions ──
app.post('/v1/chat/completions', async (req, res) => {
  const { model = 'auto', messages, stream, ...rest } = req.body
  const startTime = Date.now()

  for (const provider of PROVIDERS) {
    const providerModel = provider.modelMap[model] || provider.defaultModel
    if (!providerModel) continue

    try {
      console.log(`[proxy] → ${provider.name} (${providerModel})`)

      const axios = require('axios')
      const payload = {
        ...rest,
        model: providerModel,
        messages,
        stream: false, // proxy siempre devuelve no-stream
      }

      const response = await axios.post(`${provider.baseUrl}/chat/completions`, payload, {
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      })

      const elapsed = Date.now() - startTime
      console.log(`[proxy] ✅ ${provider.name} → ${elapsed}ms`)

      return res.json({
        ...response.data,
        _proxy: { provider: provider.name, model: providerModel, elapsed },
      })
    } catch (err) {
      if (isQuotaExhausted(err)) {
        console.warn(`[proxy] ⚠️ ${provider.name} cuota agotada, siguiente...`)
        continue
      }
      if (isServerError(err)) {
        console.warn(`[proxy] ⚠️ ${provider.name} error ${err.response.status}, siguiente...`)
        continue
      }
      // Error no recuperable → devolver tal cual
      const status = err.response?.status || 500
      return res.status(status).json(err.response?.data || { error: String(err) })
    }
  }

  console.error('[proxy] ❌ Todos los proveedores fallaron')
  res.status(502).json({
    error: 'Todos los proveedores agotaron su cuota o fallaron.',
    tried: PROVIDERS.map((p) => p.name),
  })
})

// ── GET /health ──
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    providers: PROVIDERS.map((p) => ({ name: p.name, models: Object.keys(p.modelMap) })),
  })
})

// ── GET / ──
app.get('/', (req, res) => {
  res.json({
    proxy: 'LLM Failover Proxy',
    endpoint: 'POST /v1/chat/completions',
    models: ['auto', 'coder', 'reasoner'],
    providers: PROVIDERS.map((p) => p.name),
  })
})

app.listen(PORT, () => {
  console.log(`\n🔁 LLM Failover Proxy → http://localhost:${PORT}`)
  console.log(`   Proveedores: ${PROVIDERS.map((p) => p.name).join(', ')}`)
  console.log(`   Endpoint: POST http://localhost:${PORT}/v1/chat/completions\n`)
})
```

#### `providers.js`

```js
function getProviders() {
  const providers = []

  // ── 1. Groq ──
  if (process.env.GROQ_API_KEY) {
    providers.push({
      name: 'groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
      defaultModel: 'llama-3.3-70b-versatile',
      modelMap: {
        auto: 'llama-3.3-70b-versatile',
        coder: 'qwen-2.5-coder-32b',
        reasoner: 'deepseek-r1-distill-llama-70b',
        scout: 'meta-llama/Llama-4-Scout-17B-16E-Instruct',
      },
    })
  }

  // ── 2. Gemini ──
  if (process.env.GEMINI_API_KEY) {
    providers.push({
      name: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKey: process.env.GEMINI_API_KEY,
      defaultModel: 'gemini-2.5-flash-preview-04-17',
      modelMap: {
        auto: 'gemini-2.5-flash-preview-04-17',
        reasoner: 'gemini-2.5-pro-exp-03-25',
      },
    })
  }

  // ── 3. DeepSeek (free key primero, paid después) ──
  if (process.env.DEEPSEEK_FREE_KEY) {
    providers.push({
      name: 'deepseek-free',
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: process.env.DEEPSEEK_FREE_KEY,
      defaultModel: 'deepseek-chat',
      modelMap: {
        auto: 'deepseek-chat',
        coder: 'deepseek-chat',
        reasoner: 'deepseek-reasoner',
      },
    })
  }

  // ── 4. DeepSeek (paid key — sin límite) ──
  if (process.env.DEEPSEEK_PAID_KEY) {
    providers.push({
      name: 'deepseek-paid',
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: process.env.DEEPSEEK_PAID_KEY,
      defaultModel: 'deepseek-chat',
      modelMap: {
        auto: 'deepseek-chat',
        coder: 'deepseek-chat',
        reasoner: 'deepseek-reasoner',
      },
    })
  }

  // ── 5. Together AI ──
  if (process.env.TOGETHER_API_KEY) {
    providers.push({
      name: 'together',
      baseUrl: 'https://api.together.xyz/v1',
      apiKey: process.env.TOGETHER_API_KEY,
      defaultModel: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
      modelMap: {
        auto: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
        coder: 'deepseek-ai/DeepSeek-V3',
        reasoner: 'deepseek-ai/DeepSeek-V3',
      },
    })
  }

  // ── 6. Cerebras ──
  if (process.env.CEREBRAS_API_KEY) {
    providers.push({
      name: 'cerebras',
      baseUrl: 'https://api.cerebras.ai/v1',
      apiKey: process.env.CEREBRAS_API_KEY,
      defaultModel: 'llama-3.3-70b',
      modelMap: {
        auto: 'llama-3.3-70b',
        scout: 'llama-4-scout-17b-16e-instruct',
      },
    })
  }

  // ── 7. NVIDIA ──
  if (process.env.NVIDIA_API_KEY) {
    providers.push({
      name: 'nvidia',
      baseUrl: 'https://integrate.api.nvidia.com/v1',
      apiKey: process.env.NVIDIA_API_KEY,
      defaultModel: 'meta/llama-3.3-70b-instruct',
      modelMap: {
        auto: 'meta/llama-3.3-70b-instruct',
      },
    })
  }

  // ── 8. Poolside ──
  if (process.env.POOLSIDE_API_KEY) {
    providers.push({
      name: 'poolside',
      baseUrl: 'https://api.poolside.dev/v1',
      apiKey: process.env.POOLSIDE_API_KEY,
      defaultModel: 'poolside',
      modelMap: {
        auto: 'poolside',
      },
    })
  }

  return providers
}

module.exports = { getProviders }
```

---

## 5. Integración en VS Code

### 5.1 Flujo de trabajo diario

```
Tarea de código
      │
      ├── Completado inline, chat rápido → GitHub Copilot (siempre disponible)
      │
      └── Tarea pesada, refactor grande, modelo específico
              │
              └── Continue / Cline → apunta a http://localhost:3000
                                      │
                                      └── Proxy failover automático entre 7 APIs
```

### 5.2 Opción A: Continue (recomendado para empezar)

En `~/.continue/config.yaml`:

```yaml
models:
  - title: Proxy Failover (auto)
    provider: openai
    model: auto
    apiBase: http://localhost:3000/v1
    apiKey: dummy
  - title: Proxy Failover (coder)
    provider: openai
    model: coder
    apiBase: http://localhost:3000/v1
    apiKey: dummy
  - title: Proxy Failover (reasoner)
    provider: openai
    model: reasoner
    apiBase: http://localhost:3000/v1
    apiKey: dummy
```

### 5.3 Opción B: Cline (si Continue no funciona)

En Cline → ⚙️ → API Provider:

- Provider: **OpenAI Compatible**
- Base URL: `http://localhost:3000/v1`
- API Key: `dummy` (el proxy usa sus propias claves)
- Model: `auto` (o `coder`, `reasoner`)

### 5.4 Arranque automático del proxy

Script PowerShell para iniciar todo junto:

```powershell
# start-llm-proxy.ps1
$env:GROQ_API_KEY = "gsk_xxx"
$env:GEMINI_API_KEY = "AIza_xxx"
$env:DEEPSEEK_FREE_KEY = "sk-xxx"
$env:DEEPSEEK_PAID_KEY = "sk-xxx"
$env:TOGETHER_API_KEY = "tgp_v1_xxx"
$env:CEREBRAS_API_KEY = "csk-xxx"
$env:NVIDIA_API_KEY = "nvapi-xxx"
$env:POOLSIDE_API_KEY = "sky_xxx"

node C:\laragon\www\app_fitness\llm-proxy\server.js
```

---

## 6. Orden de Failover (configurable)

El orden en `providers.js` determina la prioridad. Ajustable según prefieras:

| Prioridad | Proveedor     | Ventaja                            |
| --------- | ------------- | ---------------------------------- |
| 1         | Groq          | Más rápido, más generous free tier |
| 2         | Gemini        | Modelos Google, buen contexto      |
| 3         | DeepSeek free | Buen modelo, 50 req/día            |
| 4         | DeepSeek paid | Sin límite (pago por uso)          |
| 5         | Together      | Variedad de modelos                |
| 6         | Cerebras      | Rápido, modelos Llama              |
| 7         | NVIDIA        | Acceso a Llama 3.3                 |
| 8         | Poolside      | Especializado en código            |

---

## 7. Limitaciones y Consideraciones

### 7.1 Lo que SÍ se puede

- ✅ Usar Copilot para el día a día (ilimitado con suscripción)
- ✅ Usar Continue/Cline con el proxy para tareas que requieran modelos específicos
- ✅ Failover automático: si una API se agota, salta a la siguiente sin intervención manual
- ✅ Modelos genéricos (`auto`, `coder`, `reasoner`) que se traducen al mejor disponible

### 7.2 Lo que NO se puede

- ❌ Redirigir Copilot a tus APIs (es cerrado de Microsoft)
- ❌ Usar OpenRouter con keys gratuitas de otros providers (OpenRouter requiere su propia key de pago)
- ❌ Streaming en el proxy (se puede añadir, pero añade complejidad)
- ❌ Garantizar 100% compatibilidad OpenAI en todos los providers (Gemini requiere adaptación extra)

### 7.3 Riesgos

- **Latencia acumulada:** cada intento fallido suma ~1-3s
- **Seguridad:** las claves van en `.env` (añadir a `.gitignore`)
- **Compatibilidad Gemini:** la API de Gemini NO es 100% OpenAI-compatible; puede necesitar un adaptador específico en el proxy

---

## 8. Plan de Ejecución

| Fase | Tarea                                                                | Duración estimada |
| ---- | -------------------------------------------------------------------- | ----------------- |
| 1    | Crear `llm-proxy/` con `server.js` y `providers.js`                  | 15 min            |
| 2    | Configurar `.env` con las 8 claves                                   | 5 min             |
| 3    | Probar proxy: `curl POST /v1/chat/completions`                       | 5 min             |
| 4    | Configurar Continue con el proxy                                     | 10 min            |
| 5    | Si Continue falla → configurar Cline                                 | 10 min            |
| 6    | Probar failover: gastar cuota de Groq → verificar que salta a Gemini | 15 min            |
| 7    | Crear `start-llm-proxy.ps1` para arranque fácil                      | 5 min             |
| 8    | Documentar y ajustar prioridades según experiencia                   | —                 |

---

## 9. Comandos Rápidos

```powershell
# Iniciar proxy
cd C:\laragon\www\app_fitness\llm-proxy
node server.js

# Probar
curl http://localhost:3000/health

# Probar chat
curl -X POST http://localhost:3000/v1/chat/completions `
  -H "Content-Type: application/json" `
  -d '{"model":"auto","messages":[{"role":"user","content":"Hola, ¿qué modelo eres?"}]}'
```

---

## 10. Notas Finales

- **Copilot + Proxy = combinación ganadora.** Copilot para el 90% del trabajo, proxy para el 10% que necesita modelos específicos o cuando quieras probar alternativas gratuitas.
- **El proxy es agnóstico.** Funciona con cualquier cliente OpenAI-compatible (Continue, Cline, CLI tools, scripts propios).
- **Prioridad ajustable.** Si un día necesitas más DeepSeek que Groq, cambias el orden en `providers.js` y reinicias.
- **Sin coste adicional.** Solo DeepSeek paid consume saldo; el resto son tiers gratuitos.
