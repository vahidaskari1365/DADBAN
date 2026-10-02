// ============================================================
// کاتالوگ APIهای رایگان LLM — استخراج‌شده از مخزن awesome-free-llm-apis
// منبع: github.com/mnfst/awesome-free-llm-apis (آخرین به‌روزرسانی منبع: 2026-08-21)
// همه‌ی نقاط پایانی OpenAI SDK-سازگار هستند (مگر آنکه ذکر شده باشد).
// ============================================================

export interface FreeLlmModel {
  id: string;
  context: string;
  maxOutput: string;
  modality: string;
  rateLimit: string;
}

export interface FreeLlmProvider {
  name: string;
  flag: string;
  country: string;
  category: string;
  url: string;
  baseUrl: string;
  description: string;
  models: FreeLlmModel[];
}

export const FREE_LLM_UPDATED = "2026-08-21";

export const FREE_LLM_PROVIDERS: FreeLlmProvider[] = [
  {
    "name": "Aion Labs",
    "flag": "🇮🇱",
    "country": "IL",
    "category": "provider_api",
    "url": "https://www.aionlabs.ai/app/api-keys/",
    "baseUrl": "https://api.aionlabs.ai/v1",
    "description": "Permanent free tier, no credit card required. 15 RPM, 20K tokens/day. Specialized for roleplay and storytelling.",
    "models": [
      {
        "id": "aion-labs/aion-2.0",
        "context": "128K",
        "maxOutput": "32K",
        "modality": "Text (reasoning)",
        "rateLimit": "15 RPM, 20K TPD"
      },
      {
        "id": "aion-labs/aion-rp-llama-3.1-8b",
        "context": "32K",
        "maxOutput": "32K",
        "modality": "Text",
        "rateLimit": "15 RPM, 20K TPD"
      },
      {
        "id": "aion-labs/aion-3.0",
        "context": "128K",
        "maxOutput": "32K",
        "modality": "Text (reasoning)",
        "rateLimit": "15 RPM, 20K TPD"
      },
      {
        "id": "aion-labs/aion-3.0-mini",
        "context": "128K",
        "maxOutput": "32K",
        "modality": "Text (reasoning)",
        "rateLimit": "15 RPM, 20K TPD"
      }
    ]
  },
  {
    "name": "Cohere",
    "flag": "🇨🇦",
    "country": "CA",
    "category": "provider_api",
    "url": "https://dashboard.cohere.com/api-keys",
    "baseUrl": "https://api.cohere.com/v2",
    "description": "Free \"Trial\" API key, no credit card. 1,000 API calls/month. Non-commercial use only.",
    "models": [
      {
        "id": "command-a-plus-05-2026",
        "context": "128K",
        "maxOutput": "64K",
        "modality": "Text + Image",
        "rateLimit": "20 RPM"
      },
      {
        "id": "command-a-03-2025",
        "context": "256K",
        "maxOutput": "8K",
        "modality": "Text",
        "rateLimit": "20 RPM"
      },
      {
        "id": "command-r-plus-08-2024",
        "context": "128K",
        "maxOutput": "4K",
        "modality": "Text",
        "rateLimit": "20 RPM"
      },
      {
        "id": "command-r-08-2024",
        "context": "128K",
        "maxOutput": "4K",
        "modality": "Text",
        "rateLimit": "20 RPM"
      },
      {
        "id": "command-r7b-12-2024",
        "context": "128K",
        "maxOutput": "4K",
        "modality": "Text",
        "rateLimit": "20 RPM"
      },
      {
        "id": "command-a-reasoning-08-2025",
        "context": "256K",
        "maxOutput": "32K",
        "modality": "Text (reasoning)",
        "rateLimit": "20 RPM"
      },
      {
        "id": "command-a-translate-08-2025",
        "context": "8K",
        "maxOutput": "8K",
        "modality": "Text",
        "rateLimit": "20 RPM"
      },
      {
        "id": "command-a-vision-07-2025",
        "context": "128K",
        "maxOutput": "8K",
        "modality": "Text + Image",
        "rateLimit": "20 RPM"
      },
      {
        "id": "command-r7b-arabic-02-2025",
        "context": "128K",
        "maxOutput": "~4K",
        "modality": "Text",
        "rateLimit": "20 RPM"
      },
      {
        "id": "c4ai-aya-expanse-32b",
        "context": "128K",
        "maxOutput": "4K",
        "modality": "Text",
        "rateLimit": "20 RPM"
      },
      {
        "id": "c4ai-aya-vision-32b",
        "context": "16K",
        "maxOutput": "4K",
        "modality": "Text + Image",
        "rateLimit": "20 RPM"
      }
    ]
  },
  {
    "name": "Google Gemini",
    "flag": "🇺🇸",
    "country": "US",
    "category": "provider_api",
    "url": "https://aistudio.google.com/app/apikey",
    "baseUrl": "https://generativelanguage.googleapis.com/v1beta",
    "description": "Free tier, no credit card. Free-tier prompts may be used by Google to improve products.",
    "models": [
      {
        "id": "gemini-3.7-flash",
        "context": "1M",
        "maxOutput": "65K",
        "modality": "Text + Image + Audio + Video",
        "rateLimit": "—"
      },
      {
        "id": "gemini-3.6-flash",
        "context": "1M",
        "maxOutput": "65K",
        "modality": "Text + Image + Audio + Video",
        "rateLimit": "15 RPM, 1,500 RPD"
      },
      {
        "id": "gemini-3.5-flash",
        "context": "1M",
        "maxOutput": "65K",
        "modality": "Text + Image + Audio + Video",
        "rateLimit": "15 RPM, 1,500 RPD"
      },
      {
        "id": "gemini-3.5-flash-lite",
        "context": "1M",
        "maxOutput": "65K",
        "modality": "Text + Image + Audio + Video",
        "rateLimit": "30 RPM, 1,500 RPD"
      },
      {
        "id": "gemini-3.1-flash-lite",
        "context": "1M",
        "maxOutput": "65K",
        "modality": "Text + Image + Audio + Video",
        "rateLimit": "30 RPM, 1,500 RPD"
      },
      {
        "id": "gemini-2.5-flash",
        "context": "1M",
        "maxOutput": "65K",
        "modality": "Text + Image + Audio + Video",
        "rateLimit": "15 RPM, 1,500 RPD"
      },
      {
        "id": "gemini-2.5-flash-lite",
        "context": "1M",
        "maxOutput": "65K",
        "modality": "Text + Image + Audio + Video",
        "rateLimit": "30 RPM, 1,500 RPD"
      },
      {
        "id": "gemini-2.5-pro",
        "context": "1M",
        "maxOutput": "65K",
        "modality": "Text + Image + Audio + Video",
        "rateLimit": "5 RPM, 50 RPD"
      },
      {
        "id": "gemma-4-31b-it",
        "context": "256K",
        "maxOutput": "32K",
        "modality": "Text",
        "rateLimit": "—"
      },
      {
        "id": "gemma-4-26b-a4b-it",
        "context": "256K",
        "maxOutput": "32K",
        "modality": "Text",
        "rateLimit": "—"
      }
    ]
  },
  {
    "name": "Mistral AI",
    "flag": "🇫🇷",
    "country": "FR",
    "category": "provider_api",
    "url": "https://console.mistral.ai/api-keys",
    "baseUrl": "https://api.mistral.ai/v1",
    "description": "Free mode, enabled by default, no credit card required. $10/month in API credits, and free-mode prompts may be used to train Mistral models unless you opt out.",
    "models": [
      {
        "id": "mistral-medium-3-5",
        "context": "256K",
        "maxOutput": "—",
        "modality": "Text + Image + Code",
        "rateLimit": "~1 RPS, 500K TPM"
      },
      {
        "id": "mistral-small-2603",
        "context": "256K",
        "maxOutput": "—",
        "modality": "Text + Image + Code",
        "rateLimit": "~1 RPS, 500K TPM"
      },
      {
        "id": "mistral-large-2512",
        "context": "256K",
        "maxOutput": "—",
        "modality": "Multimodal",
        "rateLimit": "~1 RPS, 500K TPM"
      },
      {
        "id": "ministral-8b-2512",
        "context": "256K",
        "maxOutput": "—",
        "modality": "Text + Vision",
        "rateLimit": "~1 RPS, 500K TPM"
      },
      {
        "id": "codestral-2508",
        "context": "128K",
        "maxOutput": "—",
        "modality": "Code",
        "rateLimit": "~1 RPS, 500K TPM"
      },
      {
        "id": "ministral-3b-2512",
        "context": "256K",
        "maxOutput": "—",
        "modality": "Text + Vision",
        "rateLimit": "~1 RPS, 500K TPM"
      },
      {
        "id": "ministral-14b-2512",
        "context": "256K",
        "maxOutput": "—",
        "modality": "Text + Vision",
        "rateLimit": "~1 RPS, 500K TPM"
      }
    ]
  },
  {
    "name": "Z AI (Zhipu AI)",
    "flag": "🇨🇳",
    "country": "CN",
    "category": "provider_api",
    "url": "https://open.bigmodel.cn/usercenter/apikeys",
    "baseUrl": "https://open.bigmodel.cn/api/paas/v4",
    "description": "Permanent free models, no credit card required.",
    "models": [
      {
        "id": "glm-4.7-flash",
        "context": "200K",
        "maxOutput": "128K",
        "modality": "Text (reasoning)",
        "rateLimit": "1 concurrent request"
      },
      {
        "id": "glm-4.5-flash",
        "context": "128K",
        "maxOutput": "96K",
        "modality": "Text (reasoning)",
        "rateLimit": "1 concurrent request"
      },
      {
        "id": "glm-4.6v-flash",
        "context": "128K",
        "maxOutput": "32K",
        "modality": "Multimodal",
        "rateLimit": "1 concurrent request"
      }
    ]
  },
  {
    "name": "Cloudflare Workers AI",
    "flag": "🇺🇸",
    "country": "US",
    "category": "inference_provider",
    "url": "https://dash.cloudflare.com/profile/api-tokens",
    "baseUrl": "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run",
    "description": "10,000 Neurons/day free, no credit card required. 75+ models available on the free tier.",
    "models": [
      {
        "id": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        "context": "24K",
        "maxOutput": "Shared w/ context",
        "modality": "Text",
        "rateLimit": "10K neurons/day (shared)"
      },
      {
        "id": "@cf/meta/llama-4-scout-17b-16e-instruct",
        "context": "131K",
        "maxOutput": "Shared w/ context",
        "modality": "Multimodal",
        "rateLimit": "10K neurons/day (shared)"
      },
      {
        "id": "@cf/openai/gpt-oss-120b",
        "context": "128K",
        "maxOutput": "Shared w/ context",
        "modality": "Text",
        "rateLimit": "10K neurons/day (shared)"
      },
      {
        "id": "@cf/google/gemma-4-26b-a4b-it",
        "context": "256K",
        "maxOutput": "Shared w/ context",
        "modality": "Text + Vision",
        "rateLimit": "10K neurons/day (shared)"
      },
      {
        "id": "@cf/zai-org/glm-4.7-flash",
        "context": "131K",
        "maxOutput": "Shared w/ context",
        "modality": "Text",
        "rateLimit": "10K neurons/day (shared)"
      },
      {
        "id": "@cf/mistralai/mistral-small-3.1-24b-instruct",
        "context": "128K",
        "maxOutput": "Shared w/ context",
        "modality": "Text",
        "rateLimit": "10K neurons/day (shared)"
      },
      {
        "id": "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
        "context": "80K",
        "maxOutput": "Shared w/ context",
        "modality": "Text (reasoning)",
        "rateLimit": "10K neurons/day (shared)"
      },
      {
        "id": "+ 72 more models",
        "context": "Varies",
        "maxOutput": "Varies",
        "modality": "Text, Image, Audio, Embeddings",
        "rateLimit": "10K neurons/day (shared)"
      }
    ]
  },
  {
    "name": "Groq",
    "flag": "🇺🇸",
    "country": "US",
    "category": "inference_provider",
    "url": "https://console.groq.com/keys",
    "baseUrl": "https://api.groq.com/openai/v1",
    "description": "Free tier, no credit card. Ultra-fast LPU inference.",
    "models": [
      {
        "id": "openai/gpt-oss-120b",
        "context": "131K",
        "maxOutput": "65K",
        "modality": "Text",
        "rateLimit": "30 RPM, 1,000 RPD"
      },
      {
        "id": "openai/gpt-oss-20b",
        "context": "131K",
        "maxOutput": "65K",
        "modality": "Text",
        "rateLimit": "30 RPM, 1,000 RPD"
      },
      {
        "id": "groq/compound",
        "context": "131K",
        "maxOutput": "8K",
        "modality": "Text",
        "rateLimit": "30 RPM, 250 RPD"
      },
      {
        "id": "groq/compound-mini",
        "context": "131K",
        "maxOutput": "8K",
        "modality": "Text",
        "rateLimit": "30 RPM, 250 RPD"
      },
      {
        "id": "qwen/qwen3.6-27b",
        "context": "131K",
        "maxOutput": "16K",
        "modality": "Text",
        "rateLimit": "30 RPM, 1,000 RPD"
      }
    ]
  },
  {
    "name": "Hugging Face",
    "flag": "🇺🇸",
    "country": "US",
    "category": "inference_provider",
    "url": "https://huggingface.co/settings/tokens",
    "baseUrl": "https://router.huggingface.co/v1",
    "description": "$0.10/month in Inference Provider credits for free users (subject to change). Routes to Fireworks, Together, Hyperbolic, Nebius, Novita, DeepInfra and others. Thousands of models.",
    "models": [
      {
        "id": "meta-llama/Llama-3.1-8B-Instruct",
        "context": "128K",
        "maxOutput": "~4K",
        "modality": "Text",
        "rateLimit": "Credit-metered"
      },
      {
        "id": "google/gemma-3-4b-it",
        "context": "131K",
        "maxOutput": "~4K",
        "modality": "Text",
        "rateLimit": "Credit-metered"
      },
      {
        "id": "microsoft/phi-4",
        "context": "16K",
        "maxOutput": "~4K",
        "modality": "Text",
        "rateLimit": "Credit-metered"
      },
      {
        "id": "Qwen/Qwen2.5-Coder-7B-Instruct",
        "context": "131K",
        "maxOutput": "~4K",
        "modality": "Text",
        "rateLimit": "Credit-metered"
      },
      {
        "id": "Qwen/Qwen2.5-7B-Instruct",
        "context": "131K",
        "maxOutput": "~4K",
        "modality": "Text",
        "rateLimit": "Credit-metered"
      },
      {
        "id": "+ thousands of community models",
        "context": "Varies",
        "maxOutput": "Varies",
        "modality": "Text, Image, Audio, Embeddings",
        "rateLimit": "Credit-metered"
      }
    ]
  },
  {
    "name": "Kilo Code",
    "flag": "🇺🇸",
    "country": "US",
    "category": "inference_provider",
    "url": "https://app.kilo.ai/profile",
    "baseUrl": "https://api.kilo.ai/api/gateway",
    "description": "Free models with no credit card and no API key required. `kilo-auto/free` auto-router dynamically routes to models in the free pool.",
    "models": [
      {
        "id": "nvidia/nemotron-3-ultra-550b-a55b:free",
        "context": "1M",
        "maxOutput": "65K",
        "modality": "Text",
        "rateLimit": "200 req/hr"
      },
      {
        "id": "stepfun/step-3.7-flash:free",
        "context": "262K",
        "maxOutput": "262K",
        "modality": "Text + Vision",
        "rateLimit": "200 req/hr"
      },
      {
        "id": "nvidia/nemotron-3-super-120b-a12b:free",
        "context": "262K",
        "maxOutput": "262K",
        "modality": "Text",
        "rateLimit": "200 req/hr"
      },
      {
        "id": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
        "context": "256K",
        "maxOutput": "65K",
        "modality": "Multimodal",
        "rateLimit": "200 req/hr"
      },
      {
        "id": "poolside/laguna-s-2.1:free",
        "context": "262K",
        "maxOutput": "32K",
        "modality": "Text (code)",
        "rateLimit": "200 req/hr"
      },
      {
        "id": "poolside/laguna-xs-2.1:free",
        "context": "262K",
        "maxOutput": "32K",
        "modality": "Text (code)",
        "rateLimit": "200 req/hr"
      },
      {
        "id": "cohere/north-mini-code:free",
        "context": "256K",
        "maxOutput": "64K",
        "modality": "Text (code)",
        "rateLimit": "200 req/hr"
      },
      {
        "id": "openrouter/free",
        "context": "Varies",
        "maxOutput": "Varies",
        "modality": "Text",
        "rateLimit": "200 req/hr"
      },
      {
        "id": "tencent/hy3:free",
        "context": "262K",
        "maxOutput": "128K",
        "modality": "Text",
        "rateLimit": "200 req/hr"
      },
      {
        "id": "nvidia/nemotron-3.5-lightning:free",
        "context": "1M",
        "maxOutput": "65K",
        "modality": "Text",
        "rateLimit": "200 req/hr"
      },
      {
        "id": "liquid/lfm-2.5-2.6b:free",
        "context": "64K",
        "maxOutput": "8K",
        "modality": "Text",
        "rateLimit": "200 req/hr"
      }
    ]
  },
  {
    "name": "LLM7.io",
    "flag": "🇬🇧",
    "country": "GB",
    "category": "inference_provider",
    "url": "https://token.llm7.io",
    "baseUrl": "https://api.llm7.io/v1",
    "description": "API gateway with a free tier. Anonymous access needs no key and reaches the `turbo` models; a free token from token.llm7.io raises the rate and token limits but reaches the same models.",
    "models": [
      {
        "id": "gpt-oss:20b",
        "context": "128K",
        "maxOutput": "—",
        "modality": "Text",
        "rateLimit": "10 RPM, 60 req/hr (anonymous)"
      },
      {
        "id": "mistral-Nemo-Instruct-2407",
        "context": "128K",
        "maxOutput": "—",
        "modality": "Text",
        "rateLimit": "10 RPM, 60 req/hr (anonymous)"
      },
      {
        "id": "minimax-m2.7",
        "context": "180K",
        "maxOutput": "—",
        "modality": "Text (reasoning)",
        "rateLimit": "10 RPM, 60 req/hr (anonymous)"
      }
    ]
  },
  {
    "name": "ModelScope",
    "flag": "🇨🇳",
    "country": "CN",
    "category": "inference_provider",
    "url": "https://modelscope.cn/my/myaccesstoken",
    "baseUrl": "https://api-inference.modelscope.cn/v1",
    "description": "Free API-Inference for registered users. Requires Alibaba Cloud account binding + real-name verification.",
    "models": [
      {
        "id": "Qwen/Qwen3.5-35B-A3B",
        "context": "256K",
        "maxOutput": "—",
        "modality": "Text",
        "rateLimit": "2,000 RPD total; <=500 RPD/model (dynamic)"
      },
      {
        "id": "Qwen/Qwen3.5-27B",
        "context": "256K",
        "maxOutput": "—",
        "modality": "Text",
        "rateLimit": "2,000 RPD total; <=500 RPD/model (dynamic)"
      },
      {
        "id": "+ API-Inference-enabled models",
        "context": "Varies",
        "maxOutput": "Varies",
        "modality": "LLM, MLLM",
        "rateLimit": "Dynamic quotas + dynamic concurrency"
      }
    ]
  },
  {
    "name": "NVIDIA NIM",
    "flag": "🇺🇸",
    "country": "US",
    "category": "inference_provider",
    "url": "https://build.nvidia.com/explore/discover",
    "baseUrl": "https://integrate.api.nvidia.com/v1",
    "description": "Free with NVIDIA Developer Program membership. 100+ models. Rate-limited per model.",
    "models": [
      {
        "id": "nvidia/nemotron-3-super-120b-a12b",
        "context": "1M",
        "maxOutput": "262K",
        "modality": "Text",
        "rateLimit": "40 RPM, 10,000 RPD"
      },
      {
        "id": "nvidia/nemotron-3-nano-30b-a3b",
        "context": "262K",
        "maxOutput": "32K",
        "modality": "Text",
        "rateLimit": "40 RPM, 10,000 RPD"
      },
      {
        "id": "nvidia/llama-3.1-nemotron-ultra-253b-v1",
        "context": "128K",
        "maxOutput": "4K",
        "modality": "Text",
        "rateLimit": "40 RPM, 10,000 RPD"
      },
      {
        "id": "meta/llama-3.3-70b-instruct",
        "context": "128K",
        "maxOutput": "4K",
        "modality": "Text",
        "rateLimit": "40 RPM, 10,000 RPD"
      },
      {
        "id": "mistralai/mistral-nemotron",
        "context": "128K",
        "maxOutput": "8K",
        "modality": "Text",
        "rateLimit": "40 RPM, 10,000 RPD"
      },
      {
        "id": "google/gemma-4-31b-it",
        "context": "262K",
        "maxOutput": "8K",
        "modality": "Text",
        "rateLimit": "40 RPM, 10,000 RPD"
      },
      {
        "id": "mistralai/mistral-large-2-instruct",
        "context": "128K",
        "maxOutput": "4K",
        "modality": "Text",
        "rateLimit": "40 RPM, 10,000 RPD"
      },
      {
        "id": "minimaxai/minimax-m3",
        "context": "1M",
        "maxOutput": "~64K",
        "modality": "Text",
        "rateLimit": "40 RPM, 10,000 RPD"
      },
      {
        "id": "nvidia/nemotron-3-ultra-550b-a55b",
        "context": "1M",
        "maxOutput": "262K",
        "modality": "Text",
        "rateLimit": "40 RPM, 10,000 RPD"
      },
      {
        "id": "openai/gpt-oss-120b",
        "context": "131K",
        "maxOutput": "131K",
        "modality": "Text",
        "rateLimit": "40 RPM, 10,000 RPD"
      },
      {
        "id": "openai/gpt-oss-20b",
        "context": "131K",
        "maxOutput": "131K",
        "modality": "Text",
        "rateLimit": "40 RPM, 10,000 RPD"
      },
      {
        "id": "+ 92 more models",
        "context": "Varies",
        "maxOutput": "Varies",
        "modality": "Text, Image, Video, Speech, Embeddings",
        "rateLimit": "40 RPM, 10,000 RPD"
      }
    ]
  },
  {
    "name": "Ollama Cloud",
    "flag": "🇺🇸",
    "country": "US",
    "category": "inference_provider",
    "url": "https://ollama.com/settings/keys",
    "baseUrl": "https://ollama.com/api",
    "description": "Free tier with usage limits. 16 cloud model families from the Ollama library. OpenAI SDK-compatible via https://ollama.com/v1.",
    "models": [
      {
        "id": "deepseek-v4-pro",
        "context": "1M",
        "maxOutput": "Model-dependent",
        "modality": "Text",
        "rateLimit": "Session/weekly limits (unpublished)"
      },
      {
        "id": "deepseek-v4-flash",
        "context": "1M",
        "maxOutput": "Model-dependent",
        "modality": "Text",
        "rateLimit": "Session/weekly limits (unpublished)"
      },
      {
        "id": "minimax-m3",
        "context": "512K",
        "maxOutput": "Model-dependent",
        "modality": "Text",
        "rateLimit": "Session/weekly limits (unpublished)"
      },
      {
        "id": "kimi-k3",
        "context": "1M",
        "maxOutput": "Model-dependent",
        "modality": "Text",
        "rateLimit": "Session/weekly limits (unpublished)"
      },
      {
        "id": "gpt-oss:120b",
        "context": "128K",
        "maxOutput": "Model-dependent",
        "modality": "Text",
        "rateLimit": "Session/weekly limits (unpublished)"
      },
      {
        "id": "gpt-oss:20b",
        "context": "131K",
        "maxOutput": "Model-dependent",
        "modality": "Text",
        "rateLimit": "Session/weekly limits (unpublished)"
      },
      {
        "id": "nemotron-3-ultra",
        "context": "262K",
        "maxOutput": "Model-dependent",
        "modality": "Text",
        "rateLimit": "Session/weekly limits (unpublished)"
      },
      {
        "id": "mistral-large-3:675b",
        "context": "256K",
        "maxOutput": "Model-dependent",
        "modality": "Text",
        "rateLimit": "Session/weekly limits (unpublished)"
      },
      {
        "id": "qwen3.5:397b",
        "context": "256K",
        "maxOutput": "Model-dependent",
        "modality": "Text",
        "rateLimit": "Session/weekly limits (unpublished)"
      },
      {
        "id": "+ 7 more cloud models",
        "context": "Varies",
        "maxOutput": "Varies",
        "modality": "Text",
        "rateLimit": "Session/weekly limits (unpublished)"
      }
    ]
  },
  {
    "name": "OpenRouter",
    "flag": "🇺🇸",
    "country": "US",
    "category": "inference_provider",
    "url": "https://openrouter.ai/keys",
    "baseUrl": "https://openrouter.ai/api/v1",
    "description": "17 free models (marked with `:free` suffix). OpenAI SDK-compatible.",
    "models": [
      {
        "id": "nvidia/nemotron-3-super-120b-a12b:free",
        "context": "262K",
        "maxOutput": "262K",
        "modality": "Text",
        "rateLimit": "20 RPM, 50 RPD"
      },
      {
        "id": "openai/gpt-oss-20b:free",
        "context": "131K",
        "maxOutput": "32K",
        "modality": "Text",
        "rateLimit": "20 RPM, 50 RPD"
      },
      {
        "id": "cohere/north-mini-code:free",
        "context": "256K",
        "maxOutput": "64K",
        "modality": "Text (code)",
        "rateLimit": "20 RPM, 50 RPD"
      },
      {
        "id": "google/gemma-4-26b-a4b-it:free",
        "context": "262K",
        "maxOutput": "32K",
        "modality": "Text + Image",
        "rateLimit": "20 RPM, 50 RPD"
      },
      {
        "id": "google/gemma-4-31b-it:free",
        "context": "262K",
        "maxOutput": "32K",
        "modality": "Text + Image",
        "rateLimit": "20 RPM, 50 RPD"
      },
      {
        "id": "inclusionai/ling-3.0-flash:free",
        "context": "262K",
        "maxOutput": "32K",
        "modality": "Text",
        "rateLimit": "20 RPM, 50 RPD"
      },
      {
        "id": "nvidia/nemotron-3-nano-30b-a3b:free",
        "context": "256K",
        "maxOutput": "—",
        "modality": "Text",
        "rateLimit": "20 RPM, 50 RPD"
      },
      {
        "id": "nvidia/nemotron-nano-9b-v2:free",
        "context": "128K",
        "maxOutput": "—",
        "modality": "Text",
        "rateLimit": "20 RPM, 50 RPD"
      },
      {
        "id": "nvidia/nemotron-nano-12b-v2-vl:free",
        "context": "128K",
        "maxOutput": "128K",
        "modality": "Text + Image",
        "rateLimit": "20 RPM, 50 RPD"
      },
      {
        "id": "poolside/laguna-s-2.1:free",
        "context": "262K",
        "maxOutput": "32K",
        "modality": "Text (code)",
        "rateLimit": "20 RPM, 50 RPD"
      },
      {
        "id": "poolside/laguna-xs-2.1:free",
        "context": "262K",
        "maxOutput": "32K",
        "modality": "Text (code)",
        "rateLimit": "20 RPM, 50 RPD"
      },
      {
        "id": "+ 6 more free models",
        "context": "Varies",
        "maxOutput": "Varies",
        "modality": "Text / Image",
        "rateLimit": "20 RPM, 50 RPD"
      }
    ]
  },
  {
    "name": "OVHcloud AI Endpoints",
    "flag": "🇫🇷",
    "country": "FR",
    "category": "inference_provider",
    "url": "https://www.ovhcloud.com/en/public-cloud/ai-endpoints/catalog/",
    "baseUrl": "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1",
    "description": "Free anonymous tier (no API key, no signup): 2 RPM per IP per model. 20+ open-weight models hosted in EU. OpenAI SDK-compatible.",
    "models": [
      {
        "id": "Qwen3.5-397B-A17B",
        "context": "131K",
        "maxOutput": "~32K",
        "modality": "Text",
        "rateLimit": "2 RPM (anonymous)"
      },
      {
        "id": "gpt-oss-120b",
        "context": "128K",
        "maxOutput": "~32K",
        "modality": "Text",
        "rateLimit": "2 RPM (anonymous)"
      },
      {
        "id": "gpt-oss-20b",
        "context": "128K",
        "maxOutput": "~8K",
        "modality": "Text",
        "rateLimit": "2 RPM (anonymous)"
      },
      {
        "id": "Meta-Llama-3_3-70B-Instruct",
        "context": "131K",
        "maxOutput": "~4K",
        "modality": "Text",
        "rateLimit": "2 RPM (anonymous)"
      },
      {
        "id": "Qwen3.6-27B",
        "context": "131K",
        "maxOutput": "~32K",
        "modality": "Text",
        "rateLimit": "2 RPM (anonymous)"
      },
      {
        "id": "Qwen3.5-9B",
        "context": "131K",
        "maxOutput": "~8K",
        "modality": "Text",
        "rateLimit": "2 RPM (anonymous)"
      },
      {
        "id": "Qwen3-32B",
        "context": "131K",
        "maxOutput": "~32K",
        "modality": "Text",
        "rateLimit": "2 RPM (anonymous)"
      },
      {
        "id": "Qwen3-Coder-30B-A3B-Instruct",
        "context": "262K",
        "maxOutput": "~32K",
        "modality": "Text (code)",
        "rateLimit": "2 RPM (anonymous)"
      },
      {
        "id": "Qwen2.5-VL-72B-Instruct",
        "context": "128K",
        "maxOutput": "~8K",
        "modality": "Text + Vision",
        "rateLimit": "2 RPM (anonymous)"
      },
      {
        "id": "Mistral-Small-3.2-24B-Instruct-2506",
        "context": "128K",
        "maxOutput": "~4K",
        "modality": "Text",
        "rateLimit": "2 RPM (anonymous)"
      },
      {
        "id": "Mistral-Nemo-Instruct-2407",
        "context": "128K",
        "maxOutput": "~4K",
        "modality": "Text",
        "rateLimit": "2 RPM (anonymous)"
      },
      {
        "id": "Mistral-7B-Instruct-v0.3",
        "context": "32K",
        "maxOutput": "~4K",
        "modality": "Text",
        "rateLimit": "2 RPM (anonymous)"
      }
    ]
  },
  {
    "name": "SiliconFlow",
    "flag": "🇨🇳",
    "country": "CN",
    "category": "inference_provider",
    "url": "https://cloud.siliconflow.cn/account/ak",
    "baseUrl": "https://api.siliconflow.cn/v1",
    "description": "Permanently free models, no credit card required. Identity verification required. 100+ models in the catalog, most of them paid.",
    "models": [
      {
        "id": "Qwen/Qwen3-8B",
        "context": "128K",
        "maxOutput": "—",
        "modality": "Text",
        "rateLimit": "1,000 RPM, 50,000 TPM"
      }
    ]
  }
];
