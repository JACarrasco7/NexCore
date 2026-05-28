// ── Modelos REALES verificados contra cada API (26 mayo 2026) ──

function getProviders() {
  const providers = []

  // ── 1. Groq (rápido, generoso) ──
  if (process.env.GROQ_API_KEY) {
    providers.push({
      name: 'groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
      defaultModel: 'llama-3.3-70b-versatile',
      modelMap: {
        auto: 'llama-3.3-70b-versatile',
        coder: 'qwen/qwen3-32b',
        reasoner: 'qwen/qwen3-32b',
        big: 'qwen/qwen3-32b',
        fast: 'llama-3.1-8b-instant',
      },
    })
  }

  // ── 2. Gemini (1.5k req/día) ──
  if (process.env.GEMINI_API_KEY) {
    providers.push({
      name: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKey: process.env.GEMINI_API_KEY,
      defaultModel: 'models/gemini-2.5-flash',
      modelMap: {
        auto: 'models/gemini-2.5-flash',
        reasoner: 'models/gemini-2.5-pro',
        pro: 'models/gemini-3.1-pro-preview',
        fast: 'models/gemini-3.5-flash',
      },
    })
  }

  // ── 3. DeepSeek free ──
  // Modelos reales: deepseek-v4-flash, deepseek-v4-pro
  if (process.env.DEEPSEEK_FREE_KEY) {
    providers.push({
      name: 'deepseek-free',
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: process.env.DEEPSEEK_FREE_KEY,
      defaultModel: 'deepseek-v4-flash',
      modelMap: {
        auto: 'deepseek-v4-flash',
        coder: 'deepseek-v4-flash',
        reasoner: 'deepseek-v4-pro',
        pro: 'deepseek-v4-pro',
      },
    })
  }

  // ── 4. DeepSeek paid (sin límite, pago por uso) ──
  if (process.env.DEEPSEEK_PAID_KEY) {
    providers.push({
      name: 'deepseek-paid',
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: process.env.DEEPSEEK_PAID_KEY,
      defaultModel: 'deepseek-v4-flash',
      modelMap: {
        auto: 'deepseek-v4-flash',
        coder: 'deepseek-v4-flash',
        reasoner: 'deepseek-v4-pro',
        pro: 'deepseek-v4-pro',
      },
    })
  }

  // ── 5. Together AI ──
  if (process.env.TOGETHER_API_KEY) {
    providers.push({
      name: 'together',
      baseUrl: 'https://api.together.xyz/v1',
      apiKey: process.env.TOGETHER_API_KEY,
      defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      modelMap: {
        auto: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        coder: 'Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8',
        reasoner: 'deepseek-ai/DeepSeek-V4-Pro',
        pro: 'deepseek-ai/DeepSeek-V4-Pro',
      },
    })
  }

  // ── 6. Cerebras ──
  if (process.env.CEREBRAS_API_KEY) {
    providers.push({
      name: 'cerebras',
      baseUrl: 'https://api.cerebras.ai/v1',
      apiKey: process.env.CEREBRAS_API_KEY,
      defaultModel: 'llama3.1-8b',
      modelMap: {
        auto: 'llama3.1-8b',
        coder: 'qwen-3-235b-a22b-instruct-2507',
        reasoner: 'qwen-3-235b-a22b-instruct-2507',
        big: 'qwen-3-235b-a22b-instruct-2507',
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
        coder: 'deepseek-ai/deepseek-v4-pro',
        reasoner: 'deepseek-ai/deepseek-v4-pro',
        pro: 'deepseek-ai/deepseek-v4-pro',
        big: 'meta/llama-4-maverick-17b-128e-instruct',
      },
    })
  }

  // ── 8. Mistral (Francia) ──
  if (process.env.MISTRAL_API_KEY) {
    providers.push({
      name: 'mistral',
      baseUrl: 'https://api.mistral.ai/v1',
      apiKey: process.env.MISTRAL_API_KEY,
      defaultModel: 'ministral-8b-2512',
      modelMap: {
        auto: 'ministral-8b-2512',
        fast: 'ministral-3b-2512',
        coder: 'ministral-8b-2512',
        reasoner: 'mistral-medium-2604',
        big: 'mistral-medium-2604',
      },
    })
  }

  // ── 9. SambaNova (EEUU) ──
  if (process.env.SAMBANOVA_API_KEY) {
    providers.push({
      name: 'sambanova',
      baseUrl: 'https://api.sambanova.ai/v1',
      apiKey: process.env.SAMBANOVA_API_KEY,
      defaultModel: 'Meta-Llama-3.3-70B-Instruct',
      modelMap: {
        auto: 'Meta-Llama-3.3-70B-Instruct',
        coder: 'DeepSeek-V3.2',
        reasoner: 'DeepSeek-V3.2',
        pro: 'Llama-4-Maverick-17B-128E-Instruct',
        big: 'Llama-4-Maverick-17B-128E-Instruct',
      },
    })
  }

  // ── 10. Hyperbolic (EEUU) ──
  if (process.env.HYPERBOLIC_API_KEY) {
    providers.push({
      name: 'hyperbolic',
      baseUrl: 'https://api.hyperbolic.xyz/v1',
      apiKey: process.env.HYPERBOLIC_API_KEY,
      defaultModel: 'meta-llama/Llama-3.3-70B-Instruct',
      modelMap: {
        auto: 'meta-llama/Llama-3.3-70B-Instruct',
        coder: 'Qwen/Qwen3-Coder-480B-A35B-Instruct',
        reasoner: 'Qwen/Qwen3-Coder-480B-A35B-Instruct',
      },
    })
  }

  return providers
}

module.exports = { getProviders }
