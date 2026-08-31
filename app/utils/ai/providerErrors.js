/**
 * Provider-error helpers shared by DeepSeek/Anthropic chat calls.
 *
 * Kept separate from the SDK client so unit tests can cover 401/429/empty-stream
 * diagnostics without making paid network calls.
 */

const SECRET_RE = /sk-[a-zA-Z0-9_-]{8,}|Bearer\s+\S+|api[_-]?key["']?\s*[:=]\s*["']?[^\s"',}]+/gi;

export function sanitizeProviderText(text) {
  return String(text || '')
    .replace(SECRET_RE, '[redacted]')
    .replace(/key[=:]\s*\S+/gi, 'key=[redacted]');
}

export function resolveDeepseekThinking(explicit) {
  if (explicit === true || explicit === 'enabled') return { type: 'enabled' };
  if (explicit === false || explicit === 'disabled') return { type: 'disabled' };
  const fromEnv = String(process.env.DEEPSEEK_THINKING || 'disabled')
    .toLowerCase()
    .trim();
  return { type: fromEnv === 'enabled' ? 'enabled' : 'disabled' };
}

/**
 * DeepSeek V4 thinking is ON by default and shares the max_tokens budget with
 * the visible answer. Thinking-enabled calls therefore need a much larger cap
 * or they finish with finish_reason=length and empty content.
 */
export function effectiveDeepseekMaxTokens(maxTokens, thinking) {
  const requested = Number(maxTokens) > 0 ? Number(maxTokens) : 4000;
  if (resolveDeepseekThinking(thinking).type === 'enabled') {
    return Math.max(requested, 16000);
  }
  return requested;
}

export function buildDeepseekChatBody({
  model,
  systemPrompt,
  userPrompt,
  temperature = 0.7,
  maxTokens = 4000,
  jsonMode = false,
  stream = false,
  thinking,
} = {}) {
  const thinkingMode = resolveDeepseekThinking(thinking);
  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt || '' },
      { role: 'user', content: userPrompt || '' },
    ],
    max_tokens: effectiveDeepseekMaxTokens(maxTokens, thinkingMode.type),
    stream,
    thinking: thinkingMode,
  };

  // Temperature is ignored in thinking mode; only send it when thinking is off.
  if (thinkingMode.type === 'disabled') {
    body.temperature = temperature;
  }

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }
  if (stream) {
    body.stream_options = { include_usage: true };
  }
  return body;
}

export function applyOpenAiStreamChunk(state, chunk) {
  if (!state || typeof state !== 'object') return '';
  if (chunk?.usage) {
    state.usage = chunk.usage;
  }
  const choice = chunk?.choices?.[0];
  if (!choice) return '';
  if (choice.finish_reason) {
    state.finishReason = choice.finish_reason;
  }
  const delta = choice.delta || {};
  if (delta.reasoning_content) {
    state.reasoningChars = (state.reasoningChars || 0) + String(delta.reasoning_content).length;
  }
  return typeof delta.content === 'string' ? delta.content : '';
}

function usageField(usage, key) {
  if (!usage || typeof usage !== 'object') return undefined;
  if (typeof usage[key] === 'number') return usage[key];
  const details = usage.completion_tokens_details || usage.output_tokens_details || {};
  if (key === 'reasoning_tokens' && typeof details.reasoning_tokens === 'number') {
    return details.reasoning_tokens;
  }
  return undefined;
}

export function describeEmptyStream({
  model,
  finishReason,
  reasoningChars = 0,
  completionTokens,
  reasoningTokens,
  thinking,
  status,
  code,
} = {}) {
  const parts = ['No content received from streaming response'];
  if (model) parts.push(`model=${model}`);
  if (thinking) parts.push(`thinking=${thinking}`);
  if (finishReason) parts.push(`finish_reason=${finishReason}`);
  if (status) parts.push(`status=${status}`);
  if (code) parts.push(`code=${code}`);
  if (reasoningChars) parts.push(`reasoning_chars=${reasoningChars}`);
  if (completionTokens != null) parts.push(`completion_tokens=${completionTokens}`);
  if (reasoningTokens != null) parts.push(`reasoning_tokens=${reasoningTokens}`);

  let hint = '';
  if (
    finishReason === 'length' ||
    reasoningChars > 0 ||
    (typeof reasoningTokens === 'number' && reasoningTokens > 0)
  ) {
    hint =
      ' DeepSeek thinking consumed the output budget before any content tokens. Disable thinking or raise max_tokens.';
  } else if (status === 401 || code === 'invalid_api_key' || code === 'missing_api_key') {
    hint = ' Authentication failed. Check DEEPSEEK_API_KEY on this deploy.';
  } else if (status === 429) {
    hint = ' Provider rate-limited the request.';
  } else if (status === 400) {
    hint = ' Provider rejected the request (model or payload).';
  } else if (!finishReason) {
    hint = ' Provider closed the stream without content tokens.';
  }

  return `${parts.join('; ')}.${hint}`;
}

export function createEmptyStreamError(details = {}) {
  const error = new Error(
    describeEmptyStream({
      ...details,
      completionTokens: details.completionTokens ?? usageField(details.usage, 'completion_tokens'),
      reasoningTokens: details.reasoningTokens ?? usageField(details.usage, 'reasoning_tokens'),
    })
  );
  error.code = 'empty_stream';
  error.details = details;
  return error;
}

export function extractProviderStatus(error) {
  if (!error || typeof error !== 'object') return null;
  if (typeof error.status === 'number') return error.status;
  if (typeof error.statusCode === 'number') return error.statusCode;
  if (typeof error.response?.status === 'number') return error.response.status;
  return null;
}

export function formatProviderError(error, { provider = 'DeepSeek', model } = {}) {
  if (!error) return `${provider} error: unknown failure`;
  if (error.code === 'empty_stream') {
    return sanitizeProviderText(error.message);
  }

  const alreadyFormatted = sanitizeProviderText(error.message || '');
  if (/^(DeepSeek|Anthropic|Week )\b/i.test(alreadyFormatted)) {
    return alreadyFormatted;
  }

  const status = extractProviderStatus(error);
  const code = error.code || error.error?.code || '';
  const raw = sanitizeProviderText(error.message || error.error?.message || 'unknown error');
  const modelPart = model ? ` model=${model}` : '';

  if (error.name === 'AbortError' || error.code === 'ABORT_ERR') {
    return sanitizeProviderText(raw);
  }

  if (status === 401 || code === 'invalid_api_key' || code === 'missing_api_key') {
    return `${provider} 401: authentication failed${modelPart}. DEEPSEEK_API_KEY is missing or invalid on this deploy.`;
  }
  if (status === 403) {
    return `${provider} 403: access forbidden${modelPart}. Check account access for this model.`;
  }
  if (status === 429 || code === 'rate_limit_exceeded') {
    return `${provider} 429: rate limited${modelPart}${code ? ` (${code})` : ''}.`;
  }
  if (status === 400) {
    return `${provider} 400: request rejected${modelPart}${code ? ` (${code})` : ''}. ${raw}`;
  }
  if (status && status >= 500) {
    return `${provider} ${status}: provider unavailable${modelPart}. ${raw}`;
  }
  if (status) {
    return `${provider} ${status}${code ? ` ${code}` : ''}${modelPart}: ${raw}`;
  }
  return `${provider} error${modelPart}: ${raw}`;
}

/**
 * Re-attach DeepSeek `thinking` if a serialized chat body lost the field.
 * Returns the original string when the body is not JSON chat.
 */
export function ensureDeepseekThinkingBody(bodyString, thinking) {
  if (typeof bodyString !== 'string') return bodyString;
  try {
    const parsed = JSON.parse(bodyString);
    if (parsed && Array.isArray(parsed.messages) && !parsed.thinking) {
      parsed.thinking = resolveDeepseekThinking(thinking);
      return JSON.stringify(parsed);
    }
  } catch {
    return bodyString;
  }
  return bodyString;
}

export function withPlaceholderGuard(message, { weekNumber, numberOfWeeks } = {}) {
  const inner = String(message || 'unknown error').trim();
  const prefix =
    weekNumber != null && numberOfWeeks != null
      ? `Week ${weekNumber} of ${numberOfWeeks} failed: `
      : '';
  const guard = 'Generation stopped so placeholders are not saved as a successful program.';
  if (inner.includes('placeholders are not saved')) {
    return `${prefix}${inner}`;
  }
  const spacer = /[.!?]$/.test(inner) ? ' ' : '. ';
  return `${prefix}${inner}${spacer}${guard}`;
}

export function wrapProviderError(error, context = {}) {
  if (error?.code === 'empty_stream') return error;
  const wrapped = new Error(formatProviderError(error, context));
  wrapped.status = extractProviderStatus(error);
  wrapped.code = error?.code || error?.error?.code;
  wrapped.cause = error;
  return wrapped;
}
