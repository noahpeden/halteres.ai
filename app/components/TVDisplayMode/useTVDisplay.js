'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Hook for managing TV display mode state and keyboard navigation
 * @param {Array<{id: number, title: string, content: string}>} sections - Parsed workout sections
 * @returns {Object} TV display state and methods
 */
export function useTVDisplay(sections) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSectionId, setCurrentSectionId] = useState(0);

  const openSection = useCallback((id) => {
    setCurrentSectionId(id);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const goToNext = useCallback(() => {
    if (sections.length === 0) return;
    setCurrentSectionId((prev) => (prev + 1) % sections.length);
  }, [sections.length]);

  const goToPrevious = useCallback(() => {
    if (sections.length === 0) return;
    setCurrentSectionId((prev) => (prev - 1 + sections.length) % sections.length);
  }, [sections.length]);

  const goToSection = useCallback((id) => {
    setCurrentSectionId(id);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Escape':
          close();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          goToNext();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          goToPrevious();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close, goToNext, goToPrevious]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const currentSection = sections[currentSectionId] || null;

  return {
    isOpen,
    currentSectionId,
    currentSection,
    openSection,
    close,
    goToNext,
    goToPrevious,
    goToSection,
  };
}
