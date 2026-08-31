import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyOpenAiStreamChunk,
  buildDeepseekChatBody,
  createEmptyStreamError,
  describeEmptyStream,
  effectiveDeepseekMaxTokens,
  ensureDeepseekThinkingBody,
  formatProviderError,
  resolveDeepseekThinking,
  sanitizeProviderText,
} from './providerErrors.js';

describe('sanitizeProviderText', () => {
  it('redacts API keys and bearer tokens', () => {
    const cleaned = sanitizeProviderText(
      'Authorization: Bearer sk-live-abcdefghijklmnopqrstuvwxyz  api_key=sk-abc12345secret'
    );
    assert.doesNotMatch(cleaned, /sk-live-/);
    assert.doesNotMatch(cleaned, /sk-abc12345/);
    assert.match(cleaned, /\[redacted\]/);
  });
});

describe('DeepSeek thinking defaults', () => {
  it('disables thinking unless explicitly opted in', () => {
    const previous = process.env.DEEPSEEK_THINKING;
    delete process.env.DEEPSEEK_THINKING;
    try {
      assert.deepEqual(resolveDeepseekThinking(), { type: 'disabled' });
      assert.deepEqual(resolveDeepseekThinking(true), { type: 'enabled' });
      assert.deepEqual(resolveDeepseekThinking('enabled'), { type: 'enabled' });
      assert.equal(effectiveDeepseekMaxTokens(4000), 4000);
      assert.equal(effectiveDeepseekMaxTokens(4000, 'enabled'), 16000);
    } finally {
      if (previous === undefined) delete process.env.DEEPSEEK_THINKING;
      else process.env.DEEPSEEK_THINKING = previous;
    }
  });

  it('puts thinking:disabled on the chat body so V4 does not eat max_tokens', () => {
    const body = buildDeepseekChatBody({
      model: 'deepseek-v4-pro',
      systemPrompt: 'sys',
      userPrompt: 'user',
      maxTokens: 4000,
      stream: true,
    });
    assert.deepEqual(body.thinking, { type: 'disabled' });
    assert.equal(body.max_tokens, 4000);
    assert.equal(body.stream, true);
    assert.deepEqual(body.stream_options, { include_usage: true });
    assert.equal(body.temperature, 0.7);
  });

  it('re-attaches thinking when the SDK serialized body dropped it', () => {
    const stripped = JSON.stringify({
      model: 'deepseek-v4-pro',
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 4000,
      stream: true,
    });
    const repaired = JSON.parse(ensureDeepseekThinkingBody(stripped));
    assert.deepEqual(repaired.thinking, { type: 'disabled' });
    assert.equal(ensureDeepseekThinkingBody('not-json'), 'not-json');
  });
});

describe('empty stream diagnostics', () => {
  it('names thinking+length as the empty-content cause', () => {
    const message = describeEmptyStream({
      model: 'deepseek-v4-pro',
      thinking: 'enabled',
      finishReason: 'length',
      reasoningChars: 3800,
      completionTokens: 4000,
      reasoningTokens: 4000,
    });
    assert.match(message, /No content received from streaming response/);
    assert.match(message, /model=deepseek-v4-pro/);
    assert.match(message, /finish_reason=length/);
    assert.match(message, /thinking=enabled/);
    assert.match(message, /reasoning_tokens=4000/);
    assert.match(message, /consumed the output budget/);
  });

  it('applies OpenAI-compatible chunks and ignores usage-only events', () => {
    const state = { finishReason: null, reasoningChars: 0, usage: null };
    assert.equal(
      applyOpenAiStreamChunk(state, {
        choices: [{ delta: { reasoning_content: 'plan...' } }],
      }),
      ''
    );
    assert.equal(
      applyOpenAiStreamChunk(state, {
        choices: [{ delta: { content: '{"workouts"' } }],
      }),
      '{"workouts"'
    );
    applyOpenAiStreamChunk(state, {
      choices: [],
      usage: { completion_tokens: 12, completion_tokens_details: { reasoning_tokens: 9 } },
    });
    applyOpenAiStreamChunk(state, { choices: [{ finish_reason: 'stop', delta: {} }] });
    assert.equal(state.reasoningChars, 7);
    assert.equal(state.finishReason, 'stop');
    assert.equal(state.usage.completion_tokens, 12);
  });

  it('creates an empty_stream error that formatProviderError does not swallow', () => {
    const error = createEmptyStreamError({
      model: 'deepseek-v4-pro',
      finishReason: 'length',
      thinking: 'enabled',
      usage: { completion_tokens: 4000, completion_tokens_details: { reasoning_tokens: 4000 } },
    });
    assert.equal(error.code, 'empty_stream');
    const formatted = formatProviderError(error);
    assert.match(formatted, /finish_reason=length/);
    assert.match(formatted, /reasoning_tokens=4000/);
    assert.doesNotMatch(formatted, /sk-/);
  });
});

describe('formatProviderError', () => {
  it('surfaces 401 / 429 / 400 model errors without leaking secrets', () => {
    const unauthorized = new Error('Incorrect API key provided: sk-abcdefghijklmnopqrstuv');
    unauthorized.status = 401;
    unauthorized.code = 'invalid_api_key';
    assert.equal(
      formatProviderError(unauthorized, { model: 'deepseek-v4-pro' }),
      'DeepSeek 401: authentication failed model=deepseek-v4-pro. DEEPSEEK_API_KEY is missing or invalid on this deploy.'
    );

    const rateLimited = new Error('Rate limit reached');
    rateLimited.status = 429;
    rateLimited.code = 'rate_limit_exceeded';
    assert.match(formatProviderError(rateLimited), /DeepSeek 429: rate limited/);

    const badModel = new Error('Model Not Exist: deepseek-chat retired');
    badModel.status = 400;
    badModel.code = 'invalid_request_error';
    const formatted = formatProviderError(badModel, { model: 'deepseek-chat' });
    assert.match(formatted, /DeepSeek 400/);
    assert.match(formatted, /model=deepseek-chat/);
    assert.match(formatted, /Model Not Exist/);
  });

  it('does not double-wrap Week / DeepSeek messages', () => {
    const weekError = new Error(
      'Week 1 of 8 failed: DeepSeek 401: authentication failed model=deepseek-v4-pro. DEEPSEEK_API_KEY is missing or invalid on this deploy. Generation stopped so placeholders are not saved as a successful program.'
    );
    assert.equal(formatProviderError(weekError), weekError.message);
  });
});
