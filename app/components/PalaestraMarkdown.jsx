import { renderWorkoutMarkdown } from '@/utils/workoutMarkdown';

/**
 * Shared Palaestra markdown renderer for workout bodies and program overviews.
 * Unescapes \\n / leaked JSON wrappers, then sections headers, lists, and loads.
 */
export default function PalaestraMarkdown({ content, className = '', emptyLabel = '' }) {
  const html = renderWorkoutMarkdown(content);

  if (!html) {
    if (!emptyLabel) return null;
    return <p className={`athlete-body ${className}`.trim()}>{emptyLabel}</p>;
  }

  return (
    <div
      className={`palaestra-markdown ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
