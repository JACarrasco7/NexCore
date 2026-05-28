const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '.env') })
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
        stream: false,
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
        console.warn(`[proxy] ⚠️ ${provider.name} error ${err.response?.status}, siguiente...`)
        continue
      }
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

// ── GET /v1/models ──
app.get('/v1/models', (req, res) => {
  const models = []
  for (const p of PROVIDERS) {
    for (const [alias, realModel] of Object.entries(p.modelMap)) {
      models.push({
        id: alias,
        object: 'model',
        owned_by: p.name,
      })
    }
  }
  // Deducir duplicados por alias
  const unique = []
  const seen = new Set()
  for (const m of models) {
    if (!seen.has(m.id)) {
      seen.add(m.id)
      unique.push(m)
    }
  }
  res.json({ object: 'list', data: unique })
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
    models: ['auto', 'coder', 'reasoner', 'scout'],
    providers: PROVIDERS.map((p) => p.name),
  })
})

app.listen(PORT, () => {
  console.log(`\n🔁 LLM Failover Proxy → http://localhost:${PORT}`)
  console.log(`   Proveedores: ${PROVIDERS.map((p) => p.name).join(', ')}`)
  console.log(`   Endpoint: POST http://localhost:${PORT}/v1/chat/completions\n`)
})
