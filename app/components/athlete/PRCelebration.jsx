'use client';

import { useEffect, useState } from 'react';

export default function PRCelebration({ prData, onClose }) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Trigger confetti after component mounts
    setShowConfetti(true);

    // Create confetti effect using CSS animation
    const confettiContainer = document.getElementById('confetti-container');
    if (confettiContainer) {
      for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.animationDelay = `${Math.random() * 0.5}s`;
        confetti.style.backgroundColor = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][
          Math.floor(Math.random() * 5)
        ];
        confettiContainer.appendChild(confetti);
      }
    }

    // Auto-close after 5 seconds
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const improvement = prData?.improvement
    ? `${prData.improvement > 0 ? '+' : ''}${prData.improvement.toFixed(1)}%`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Confetti Container */}
      <div id="confetti-container" className="fixed inset-0 pointer-events-none overflow-hidden" />

      {/* Celebration Card */}
      <div className="relative bg-gradient-to-br from-yellow-400 via-orange-400 to-red-400 rounded-3xl p-1 animate-bounceIn">
        <div className="bg-base-100 rounded-3xl p-8 text-center max-w-sm">
          {/* Trophy Icon */}
          <div className="text-7xl mb-4 animate-pulse">
            🏆
          </div>

          {/* PR Text */}
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500 mb-2">
            NEW PR!
          </h2>

          {/* Result Value */}
          <p className="text-4xl font-bold text-base-content mb-2">
            {prData?.displayValue || 'Personal Record'}
          </p>

          {/* Improvement */}
          {improvement && prData.previousValue && (
            <p className="text-lg text-success font-medium mb-4">
              {improvement} better than before!
            </p>
          )}

          {/* Encouraging Message */}
          <p className="text-base-content/70 mb-6">
            You're crushing it! Keep up the amazing work! 💪
          </p>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="btn btn-primary btn-lg"
          >
            Celebrate! 🎉
          </button>
        </div>
      </div>

      {/* Confetti CSS */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes confettiFall {
          0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-bounceIn {
          animation: bounceIn 0.6s ease-out;
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
