'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

/**
 * Fullscreen TV display overlay for workout sections
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the display is open
 * @param {Object} props.currentSection - Current section to display
 * @param {Array} props.sections - All sections for navigation dots
 * @param {number} props.currentSectionId - Current section index
 * @param {string} props.workoutTitle - Title of the workout
 * @param {Function} props.onClose - Callback to close the display
 * @param {Function} props.onNext - Callback to go to next section
 * @param {Function} props.onPrevious - Callback to go to previous section
 * @param {Function} props.onGoToSection - Callback to go to specific section
 */
export default function TVDisplayMode({
  isOpen,
  currentSection,
  sections,
  currentSectionId,
  workoutTitle,
  onClose,
  onNext,
  onPrevious,
  onGoToSection,
}) {
  const contentRef = useRef(null);

  // Reset scroll position when section changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [currentSectionId]);

  if (!isOpen || !currentSection) return null;

  return (
    <div className="fixed inset-0 z-50 tv-display-enter">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-blue-50 backdrop-blur-sm" />

      {/* Content Container */}
      <div className="relative h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200/50">
          <div>
            <h1 className="text-2xl font-bold text-slate-700">{workoutTitle}</h1>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close TV display"
          >
            <X className="w-8 h-8 text-gray-600" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          {/* Previous Button */}
          {sections.length > 1 && (
            <button
              onClick={onPrevious}
              className="absolute left-4 lg:left-8 z-10 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-all hover:scale-105"
              aria-label="Previous section"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Section Content */}
          <div
            ref={contentRef}
            className="flex-1 max-w-5xl mx-auto px-20 py-8 overflow-y-auto max-h-full"
          >
            {/* Section Title */}
            <div className="text-center mb-8">
              <h2 className="text-4xl lg:text-5xl font-bold text-indigo-700 mb-2">
                {currentSection.title}
              </h2>
              <div className="w-24 h-1 bg-indigo-500 mx-auto rounded-full" />
            </div>

            {/* Section Content */}
            <div className="tv-content text-2xl lg:text-3xl text-slate-800 leading-relaxed whitespace-pre-line text-center">
              {currentSection.content}
            </div>
          </div>

          {/* Next Button */}
          {sections.length > 1 && (
            <button
              onClick={onNext}
              className="absolute right-4 lg:right-8 z-10 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-all hover:scale-105"
              aria-label="Next section"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
        </div>

        {/* Navigation Dots */}
        {sections.length > 1 && (
          <div className="flex justify-center gap-3 py-6 border-t border-gray-200/50">
            {sections.map((section, index) => (
              <button
                key={section.id}
                onClick={() => onGoToSection(index)}
                className={`tv-section-dot ${index === currentSectionId ? 'active' : ''}`}
                aria-label={`Go to ${section.title}`}
                title={section.title}
              />
            ))}
          </div>
        )}

        {/* Keyboard Hint */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-sm text-gray-500">
          Use arrow keys to navigate, ESC to close
        </div>
      </div>
    </div>
  );
}
