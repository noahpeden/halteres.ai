/**
 * Shared markdown entry point. Prefer PalaestraMarkdown in UI.
 * parseMarkdown stays for callers that need HTML strings.
 */

import PalaestraMarkdown from '@/components/PalaestraMarkdown';
import { renderWorkoutMarkdown } from '@/utils/workoutMarkdown';

export function parseMarkdown(text) {
  return renderWorkoutMarkdown(text);
}

export function MarkdownContent({ content, className = '' }) {
  return <PalaestraMarkdown content={content} className={className} />;
}
