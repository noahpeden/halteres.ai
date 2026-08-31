'use client';

import { Sparkles, Star, Trophy, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function PRCelebration({ prData, onClose }) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setShowConfetti(true);

    const confettiContainer = document.getElementById('confetti-container');
    if (confettiContainer) {
      for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.animationDelay = `${Math.random() * 0.5}s`;
        confetti.style.backgroundColor = ['#84cc16', '#f97316', '#06b6d4', '#eab308', '#a855f7'][
          Math.floor(Math.random() * 5)
        ];
        confettiContainer.appendChild(confetti);
      }
    }

    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const improvement = prData?.improvement
    ? `${prData.improvement > 0 ? '+' : ''}${prData.improvement.toFixed(1)}%`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-athlete-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Confetti Container */}
      <div id="confetti-container" className="fixed inset-0 pointer-events-none overflow-hidden" />

      {/* Celebration Card */}
      <div className="relative z-10 max-w-sm mx-4 animate-athlete-bounce-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[var(--athlete-bg-card)] flex items-center justify-center z-20"
        >
          <X className="w-4 h-4 text-[var(--athlete-text-muted)]" />
        </button>

        {/* Gradient border wrapper */}
        <div className="relative p-[2px] rounded-3xl bg-gradient-to-br from-[var(--athlete-accent-secondary)] via-[var(--athlete-accent-primary)] to-[var(--athlete-accent-secondary)]">
          <div className="bg-[var(--athlete-bg-card)] rounded-3xl p-8 text-center">
            {/* Decorative elements */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2">
              <div className="relative">
                <Star className="w-6 h-6 text-[var(--athlete-accent-secondary)] absolute -left-8 -top-2 animate-pulse" />
                <Star className="w-4 h-4 text-[var(--athlete-accent-primary)] absolute -right-6 top-0 animate-pulse delay-150" />
                <Sparkles className="w-5 h-5 text-[var(--athlete-accent-secondary)] absolute -right-10 -top-3 animate-pulse delay-300" />
              </div>
            </div>

            {/* Trophy Icon with glow */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-[var(--athlete-accent-secondary)] rounded-full blur-xl opacity-50 animate-pulse" />
              <div className="relative w-full h-full rounded-full bg-gradient-to-br from-[var(--athlete-accent-secondary)] to-[var(--athlete-accent-primary)] flex items-center justify-center">
                <Trophy className="w-12 h-12 text-black" />
              </div>
            </div>

            {/* PR Text */}
            <h2 className="athlete-heading-xl mb-2">New mark.</h2>

            <p className="athlete-heading-xl mb-2">{prData?.displayValue || 'Personal record'}</p>

            {/* Improvement */}
            {improvement && prData.previousValue && (
              <p className="text-lg text-[var(--athlete-accent-complete)] font-medium mb-4">
                {improvement} better than before!
              </p>
            )}

            {/* Encouraging Message */}
            <p className="athlete-body text-[var(--athlete-text-secondary)] mb-6">
              Ink it. Come back tomorrow.
            </p>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="athlete-btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Keep it
            </button>
          </div>
        </div>
      </div>

      {/* Confetti CSS */}
      <style jsx>{`
        @keyframes athleteFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes athleteBounceIn {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes confettiFall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .animate-athlete-fade-in {
          animation: athleteFadeIn 0.3s ease-out;
        }

        .animate-athlete-bounce-in {
          animation: athleteBounceIn 0.6s ease-out;
        }

        :global(.confetti-piece) {
          position: absolute;
          width: 10px;
          height: 10px;
          top: -10px;
          animation: confettiFall 3s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}
