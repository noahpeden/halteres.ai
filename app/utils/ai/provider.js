import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

/**
 * Single entry point for all AI text-generation calls in the app.
 *
 * Why this exists: halteres used to hardcode a specific SDK/model in every route
 * (Anthropic in some, OpenAI in others, a separate DeepSeek copy in others). As a
 * solo-maintained, cost-sensitive product we want ONE place that decides which
 * provider/model to call, so we can swap providers (or A/B test them) via env vars
 * instead of editing N routes.
 *
 * Default provider: DeepSeek (OpenAI-compatible endpoint), because it is ~6-12x
 * cheaper than the Claude models previously used here and the integration pattern
 * already existed in this repo (see the now-retired app/api/generate-program-deepseek).
 * The Anthropic/Claude path is kept fully reachable behind AI_PROVIDER=anthropic
 * during the transition (see the quality evaluation in docs/ai-provider-eval.md).
 *
 * Tiers:
 *  - 'pro'   heavier reasoning calls: full program generation, week-by-week workout
 *            generation. Defaults to DeepSeek V4-Pro / Claude Sonnet.
 *  - 'flash' lightweight calls: feedback parsing, single-workout enhancement, quick
 *            classification. Defaults to DeepSeek V4-Flash / Claude Haiku.
 *
 * IMPORTANT model-name note: DeepSeek retired the legacy `deepseek-chat` /
 * `deepseek-reasoner` aliases on 2026-07-24. Any code still using those names will
 * error. Always go through this module (or DEEPSEEK_MODEL_PRO/FLASH env vars) so a
 * future model rename is a one-line config change, not a code hunt.
 */

const VALID_PROVIDERS = ['deepseek', 'anthropic'];

function normalizeProvider(value) {
  const normalized = (value || '').toLowerCase().trim();
  return VALID_PROVIDERS.includes(normalized) ? normalized : null;
}

function getDefaultProvider() {
  return normalizeProvider(process.env.AI_PROVIDER) || 'deepseek';
}

export function isAnthropicDefault() {
  return getDefaultProvider() === 'anthropic';
}

const DEEPSEEK_MODEL_PRO = process.env.DEEPSEEK_MODEL_PRO || 'deepseek-v4-pro';
const DEEPSEEK_MODEL_FLASH = process.env.DEEPSEEK_MODEL_FLASH || 'deepseek-v4-flash';
const ANTHROPIC_MODEL_PRO = process.env.ANTHROPIC_MODEL_PRO || 'claude-sonnet-4-5-20250929';
const ANTHROPIC_MODEL_FLASH = process.env.ANTHROPIC_MODEL_FLASH || 'claude-haiku-4-5-20250514';

let deepseekClient = null;
function getDeepseekClient() {
  if (!deepseekClient) {
    deepseekClient = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
  }
  return deepseekClient;
}

let anthropicClient = null;
function getAnthropicClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

/**
 * Resolve which client/model/SDK shape to use for a given call.
 * @param {'pro'|'flash'} tier
 * @param {'deepseek'|'anthropic'} [overrideProvider] - force a specific provider for this call
 *   (e.g. an eval script comparing both), bypassing AI_PROVIDER.
 */
export function getAIProvider(tier = 'pro', overrideProvider) {
  const provider = normalizeProvider(overrideProvider) || getDefaultProvider();

  if (provider === 'anthropic') {
    return {
      provider: 'anthropic',
      sdk: 'anthropic',
      client: getAnthropicClient(),
      model: tier === 'flash' ? ANTHROPIC_MODEL_FLASH : ANTHROPIC_MODEL_PRO,
    };
  }

  return {
    provider: 'deepseek',
    sdk: 'openai',
    client: getDeepseekClient(),
    model: tier === 'flash' ? DEEPSEEK_MODEL_FLASH : DEEPSEEK_MODEL_PRO,
  };
}

/**
 * Non-streaming chat completion. Use for shorter calls (feedback parsing, single
 * workout enhancement, JSON-object responses).
 *
 * @param {object} opts
 * @param {'pro'|'flash'} [opts.tier]
 * @param {'deepseek'|'anthropic'} [opts.provider] - override the default provider
 * @param {string} opts.systemPrompt
 * @param {string} opts.userPrompt
 * @param {number} [opts.temperature]
 * @param {number} [opts.maxTokens]
 * @param {boolean} [opts.jsonMode] - request a JSON object response (OpenAI-compatible only)
 * @returns {Promise<{provider: string, model: string, content: string, usage: object|undefined}>}
 */
export async function createChatCompletion({
  tier = 'pro',
  provider: overrideProvider,
  systemPrompt,
  userPrompt,
  temperature = 0.7,
  maxTokens = 4000,
  jsonMode = false,
} = {}) {
  const { provider, sdk, client, model } = getAIProvider(tier, overrideProvider);

  if (sdk === 'anthropic') {
    const message = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    return {
      provider,
      model,
      content: message.content?.[0]?.text ?? '',
      usage: message.usage,
    };
  }

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
    ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
  });

  return {
    provider,
    model,
    content: response.choices?.[0]?.message?.content ?? '',
    usage: response.usage,
  };
}

/**
 * Streaming chat completion, normalized across SDKs so callers only deal with
 * plain text chunks regardless of provider. This lets streaming, chunked
 * generation routes (e.g. program/skeleton generation) stay provider-agnostic
 * without rewriting their SSE/JSON-repair logic for each SDK's event shape.
 *
 * @param {object} opts
 * @param {'pro'|'flash'} [opts.tier]
 * @param {'deepseek'|'anthropic'} [opts.provider]
 * @param {string} opts.systemPrompt
 * @param {Array<{type: 'text', text: string, cache_control?: object}>} [opts.systemBlocks] -
 *   Anthropic-style system blocks (used for prompt caching on client metrics / reference
 *   workouts). Ignored (flattened into systemPrompt) for OpenAI-compatible providers, since
 *   DeepSeek applies automatic prefix caching without needing cache_control markers.
 * @param {string} opts.userPrompt
 * @param {number} [opts.temperature]
 * @param {number} [opts.maxTokens]
 * @yields {string} text deltas as they arrive
 */
export async function* streamChatCompletion({
  tier = 'pro',
  provider: overrideProvider,
  systemPrompt,
  systemBlocks,
  userPrompt,
  temperature = 0.7,
  maxTokens = 4000,
} = {}) {
  const { sdk, client, model } = getAIProvider(tier, overrideProvider);

  if (sdk === 'anthropic') {
    const systemParam =
      systemBlocks && systemBlocks.length > 0
        ? systemBlocks
        : [{ type: 'text', text: systemPrompt }];

    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemParam,
      messages: [{ role: 'user', content: userPrompt }],
      stream: true,
    });

    for await (const chunk of response) {
      if (chunk.type === 'content_block_delta') {
        const text = chunk.delta?.text || '';
        if (text) yield text;
      }
    }
    return;
  }

  // OpenAI-compatible (DeepSeek and future providers like GLM/GPT via the same shape)
  const flattenedSystemPrompt =
    systemBlocks && systemBlocks.length > 0
      ? systemBlocks.map((block) => block.text).join('\n\n')
      : systemPrompt;

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: flattenedSystemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
    stream: true,
  });

  for await (const chunk of response) {
    const text = chunk.choices?.[0]?.delta?.content || '';
    if (text) yield text;
  }
}
