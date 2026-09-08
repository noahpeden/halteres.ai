/**
 * Normalize and render workout / program-overview markdown for athletes.
 * Keeps modelOutput unescape + leaked-JSON unwrap guards, then turns
 * ## / ### sections, lists, and **loads** into Palaestra-styled HTML.
 */

import {
  looksLikeRawJsonBlob,
  splitLeakedTitleBody,
  unescapeWorkoutText,
} from './prompt-builder/modelOutput.js';

export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function normalizeWorkoutMarkdown(text = '') {
  let value = String(text || '');
  if (!value.trim()) return '';

  if (looksLikeRawJsonBlob(value)) {
    const leaked = splitLeakedTitleBody(value);
    if (leaked?.body && !looksLikeRawJsonBlob(leaked.body)) {
      value = leaked.body;
    }
  }

  return unescapeWorkoutText(value)
    .replace(/^\uFEFF/, '')
    .trim();
}

function applyInlineMarkdown(escaped) {
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/♀/g, '<span class="palaestra-md-mark palaestra-md-mark-f">♀</span>')
    .replace(/♂/g, '<span class="palaestra-md-mark palaestra-md-mark-m">♂</span>');
}

function closeList(parts, listType) {
  if (listType === 'ul') parts.push('</ul>');
  if (listType === 'ol') parts.push('</ol>');
  return null;
}

/**
 * Convert athlete-facing markdown into Palaestra HTML.
 * Headers become section hierarchy (Warm-up / Strength / Metcon / …).
 */
export function renderWorkoutMarkdown(text = '') {
  const normalized = normalizeWorkoutMarkdown(text);
  if (!normalized) return '';

  const lines = normalized.split(/\r?\n/);
  const parts = [];
  let listType = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    const trimmed = line.trim();

    if (!trimmed) {
      listType = closeList(parts, listType);
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      listType = closeList(parts, listType);
      const hashes = heading[1].length;
      const level = hashes <= 2 ? 2 : hashes === 3 ? 3 : 4;
      const title = applyInlineMarkdown(escapeHtml(heading[2].trim()));
      parts.push(`<h${level}>${title}</h${level}>`);
      continue;
    }

    const unordered = trimmed.match(/^[-*+]\s+(.+)$/);
    if (unordered) {
      if (listType !== 'ul') {
        listType = closeList(parts, listType);
        parts.push('<ul>');
        listType = 'ul';
      }
      parts.push(`<li>${applyInlineMarkdown(escapeHtml(unordered[1]))}</li>`);
      continue;
    }

    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      if (listType !== 'ol') {
        listType = closeList(parts, listType);
        parts.push('<ol>');
        listType = 'ol';
      }
      parts.push(`<li>${applyInlineMarkdown(escapeHtml(ordered[1]))}</li>`);
      continue;
    }

    listType = closeList(parts, listType);
    parts.push(`<p>${applyInlineMarkdown(escapeHtml(trimmed))}</p>`);
  }

  closeList(parts, listType);
  return parts.join('');
}
