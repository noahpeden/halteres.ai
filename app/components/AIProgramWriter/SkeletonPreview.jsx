'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Check, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * SkeletonPreview - Displays skeleton workouts grouped by week with enhancement controls
 * Used for the two-phase generation system
 */
export default function SkeletonPreview({
  workouts,
  weeklyData,
  onEnhanceWeek,
  onEnhanceAll,
  isEnhancing,
  enhancingWeek,
  programContext,
}) {
  const [weekNotes, setWeekNotes] = useState({});
  const [expandedWeeks, setExpandedWeeks] = useState({});

  // Group workouts by week
  const groupedWeeks = groupWorkoutsByWeek(workouts);

  // Calculate stats
  const totalWeeks = groupedWeeks.length;
  const detailedWeeks = groupedWeeks.filter(w => w.status === 'detailed').length;
  const skeletonWeeks = groupedWeeks.filter(w => w.status === 'skeleton').length;

  const toggleWeekExpanded = (weekNumber) => {
    setExpandedWeeks(prev => ({
      ...prev,
      [weekNumber]: !prev[weekNumber]
    }));
  };

  const handleEnhanceWeek = (weekNumber) => {
    if (onEnhanceWeek) {
      onEnhanceWeek(weekNumber, weekNotes[weekNumber] || '');
    }
  };

  const setWeekNote = (weekNumber, note) => {
    setWeekNotes(prev => ({
      ...prev,
      [weekNumber]: note
    }));
  };

  if (!workouts || workouts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center py-8 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl">
        <div className="text-5xl mb-4">&#127881;</div>
        <h2 className="text-2xl font-bold text-base-content">
          Program Structure Ready!
        </h2>
        <p className="text-base-content/60 mt-2">
          {workouts.length} workouts across {totalWeeks} weeks. Review and add details below.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="p-4 bg-base-200 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold">Enhancement Progress</h4>
          <span className="text-sm text-base-content/60">
            {detailedWeeks} of {totalWeeks} weeks detailed
          </span>
        </div>
        <div className="w-full bg-gray-300 rounded-full h-3">
          <div
            className="bg-success h-3 rounded-full transition-all duration-300"
            style={{ width: `${(detailedWeeks / totalWeeks) * 100}%` }}
          />
        </div>
      </div>

      {/* Week Cards */}
      <div className="grid gap-4">
        {groupedWeeks.map(week => (
          <WeekCard
            key={week.weekNumber}
            week={week}
            isExpanded={expandedWeeks[week.weekNumber]}
            onToggleExpand={() => toggleWeekExpanded(week.weekNumber)}
            weekNote={weekNotes[week.weekNumber] || ''}
            onNoteChange={(note) => setWeekNote(week.weekNumber, note)}
            onEnhance={() => handleEnhanceWeek(week.weekNumber)}
            isEnhancing={isEnhancing && enhancingWeek === week.weekNumber}
          />
        ))}
      </div>

      {/* Bulk Enhancement Action */}
      {skeletonWeeks > 0 && (
        <div className="card bg-base-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">Enhance All Remaining Weeks</div>
              <div className="text-sm text-base-content/60">
                {skeletonWeeks} weeks x ~2.5 min = ~{Math.round(skeletonWeeks * 2.5)} minutes total
              </div>
            </div>
            <button
              className="btn btn-outline btn-primary"
              onClick={onEnhanceAll}
              disabled={isEnhancing}
            >
              {isEnhancing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enhancing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Enhance All
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Week Card Component
function WeekCard({
  week,
  isExpanded,
  onToggleExpand,
  weekNote,
  onNoteChange,
  onEnhance,
  isEnhancing,
}) {
  const statusColors = {
    detailed: 'border-success bg-success/5',
    enhancing: 'border-primary bg-primary/5',
    skeleton: 'border-base-300 bg-base-100',
  };

  const statusBadgeColors = {
    detailed: 'bg-success/20 text-success',
    enhancing: 'bg-primary/20 text-primary',
    skeleton: 'bg-warning/20 text-warning-content',
  };

  const statusLabels = {
    detailed: 'Complete',
    enhancing: 'Enhancing...',
    skeleton: 'Structure Only',
  };

  return (
    <div
      className={`
        p-6 rounded-xl border-2 transition-all
        ${statusColors[week.status]}
        ${week.status === 'enhancing' ? 'animate-pulse' : ''}
      `}
    >
      {/* Week Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className={`
            w-8 h-8 rounded-full flex items-center justify-center font-bold
            ${week.status === 'detailed'
              ? 'bg-success text-white'
              : 'bg-base-200 text-base-content'}
          `}>
            {week.status === 'detailed' ? <Check className="w-4 h-4" /> : week.weekNumber}
          </span>
          <span className="font-semibold text-lg">Week {week.weekNumber}</span>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className={`
            px-3 py-1 rounded-full text-sm font-medium
            ${statusBadgeColors[week.status]}
          `}>
            {week.status === 'enhancing' && (
              <Loader2 className="w-3 h-3 mr-1 inline animate-spin" />
            )}
            {statusLabels[week.status]}
          </span>

          {/* Expand/Collapse Button */}
          <button
            onClick={onToggleExpand}
            className="btn btn-ghost btn-sm btn-circle"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Workout Previews */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-4">
        {week.workouts.map((workout, i) => (
          <div
            key={workout.id || i}
            className="p-3 bg-base-200/50 rounded-lg text-center"
          >
            <div className="text-xs text-base-content/60">Day {i + 1}</div>
            <div className="font-medium text-sm truncate">
              {extractFocus(workout.title)}
            </div>
          </div>
        ))}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-base-300 pt-4 mt-4">
          <div className="space-y-4">
            {week.workouts.map((workout, i) => (
              <div key={workout.id || i} className="bg-base-200/30 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">{workout.title}</h4>
                <div className="text-sm text-base-content/80 whitespace-pre-wrap">
                  {workout.body_skeleton || workout.body}
                </div>
                {week.status === 'skeleton' && (
                  <div className="mt-2 p-2 bg-warning/10 rounded text-xs text-warning-content">
                    Skeleton version - Click "Add Full Details" to add coaching cues, warm-up, cool-down, and scaling options.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhancement Action */}
      {week.status === 'skeleton' && (
        <div className="space-y-3 mt-4">
          <textarea
            placeholder="Optional: Add notes for this week (e.g., 'Focus on upper body', 'Client has shoulder pain')"
            value={weekNote}
            onChange={(e) => onNoteChange(e.target.value)}
            className="textarea textarea-bordered w-full text-sm"
            rows={2}
          />
          <button
            onClick={onEnhance}
            disabled={isEnhancing}
            className="btn btn-primary w-full"
          >
            {isEnhancing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enhancing Week {week.weekNumber}...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Add Full Details to Week {week.weekNumber}
                <span className="badge badge-ghost ml-2">~2-3 min</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// Helper function to extract focus from workout title
function extractFocus(title) {
  // Try to extract the focus area from titles like "Week 1, Day 1: Lower Body Strength"
  const match = title?.match(/:\s*(.+)$/);
  return match ? match[1] : 'Workout';
}

// Helper function to group workouts by week
function groupWorkoutsByWeek(workouts) {
  if (!workouts || workouts.length === 0) return [];

  const grouped = {};

  workouts.forEach(workout => {
    // Try to get week number from workout data or parse from title
    let weekNumber = workout.week_number;

    if (!weekNumber) {
      const match = workout.title?.match(/Week\s+(\d+)/i);
      weekNumber = match ? parseInt(match[1]) : 1;
    }

    if (!grouped[weekNumber]) {
      grouped[weekNumber] = {
        weekNumber,
        workouts: [],
        status: 'skeleton',
      };
    }
    grouped[weekNumber].workouts.push(workout);
  });

  // Determine week status based on workout statuses
  Object.values(grouped).forEach(week => {
    const statuses = week.workouts.map(w => w.generation_status || 'detailed');
    if (statuses.every(s => s === 'detailed')) {
      week.status = 'detailed';
    } else if (statuses.some(s => s === 'enhancing')) {
      week.status = 'enhancing';
    } else if (statuses.some(s => s === 'skeleton')) {
      week.status = 'skeleton';
    } else {
      week.status = 'detailed'; // Default for legacy workouts
    }
  });

  return Object.values(grouped).sort((a, b) => a.weekNumber - b.weekNumber);
}
