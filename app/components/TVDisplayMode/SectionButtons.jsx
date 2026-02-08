'use client';

import { Monitor } from 'lucide-react';

/**
 * Horizontal scrollable row of buttons for each workout section
 * @param {Object} props
 * @param {Array<{id: number, title: string, content: string}>} props.sections - Parsed workout sections
 * @param {Function} props.onOpenSection - Callback when a section button is clicked
 */
export default function SectionButtons({ sections, onOpenSection }) {
  if (!sections || sections.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Monitor className="w-4 h-4 text-indigo-600" />
        <span className="text-sm font-medium text-gray-700">TV Display Mode</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onOpenSection(section.id)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-medium transition-colors border border-indigo-200 whitespace-nowrap flex-shrink-0"
          >
            <Monitor className="w-4 h-4" />
            {section.title}
          </button>
        ))}
      </div>
    </div>
  );
}
