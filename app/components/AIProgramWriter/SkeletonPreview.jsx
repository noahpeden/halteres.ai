'use client';

import {
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  MoreVertical,
  Pencil,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import TemplateFeedbackButton from '@/components/feedback/TemplateFeedbackButton';
import { weekDisplayStatus } from '@/utils/prompt-builder/generationGuardrails';
import { extractDayNumber, sortWorkoutsForDisplay } from '@/utils/prompt-builder/modelOutput';

// Simple markdown parser for workout content (same as WorkoutList)
const parseMarkdownToHTML = (markdown) => {
  if (!markdown) return '';

  let html = markdown
    // Headers (## Header -> <h3>, ### Header -> <h4>)
    .replace(/^### (.*$)/gim, '<h4 class="text-base font-semibold mt-4 mb-2 text-gray-800">$1</h4>')
    .replace(
      /^## (.*$)/gim,
      '<h3 class="text-lg font-semibold mt-5 mb-3 text-gray-900 border-b border-gray-200 pb-1">$1</h3>'
    )
    // Bold text (**text** or __text__)
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    .replace(/__(.*?)__/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    // Italic text (*text* or _text_)
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/_(.*?)_/g, '<em class="italic">$1</em>')
    // Bullet points (- item or * item)
    .replace(/^[\s]*[-*+]\s+(.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
    // Numbered lists (1. item, 2. item, etc.)
    .replace(/^[\s]*\d+\.\s+(.*$)/gim, '<li class="ml-4 mb-1 list-decimal">$1</li>')
    // Gender symbols with better styling
    .replace(
      /♀/g,
      '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-pink-100 text-pink-800">♀</span>'
    )
    .replace(
      /♂/g,
      '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">♂</span>'
    )
    // Convert line breaks to <br> but preserve structure
    .replace(/\n/g, '<br>');

  // Wrap consecutive <li> elements in <ul> tags
  html = html.replace(/(<li[^>]*>.*?<\/li>)(\s*<br>\s*<li[^>]*>.*?<\/li>)*/g, (match) => {
    const listItems = match.replace(/<br>\s*/g, '');
    return `<ul class="list-disc ml-4 space-y-1 my-2">${listItems}</ul>`;
  });

  // Clean up excessive <br> tags around headers and lists
  html = html
    .replace(/<br>\s*(<h[234][^>]*>)/g, '$1')
    .replace(/(<\/h[234]>)\s*<br>/g, '$1')
    .replace(/<br>\s*(<ul[^>]*>)/g, '$1')
    .replace(/(<\/ul>)\s*<br>/g, '$1')
    // Clean up multiple consecutive <br> tags
    .replace(/(<br>\s*){3,}/g, '<br><br>');

  return html;
};

/**
 * SkeletonPreview - Displays workouts grouped by week with enhancement controls
 * Used for both skeleton and detailed workouts in the two-phase generation system
 */
export default function SkeletonPreview({
  workouts,
  weeklyData,
  onEnhanceWeek,
  onEnhanceAll,
  enhancingWeeks = new Set(), // Set of week numbers currently being enhanced
  programContext,
  // Action props for detailed workouts
  onViewDetails,
  onEditWorkout,
  onDeleteWorkout,
  onMarkComplete,
  onDatePick,
  formatDate,
  gymId,
  generatedDescription,
}) {
  // Derive isEnhancing from the set (any week being enhanced)
  const isEnhancing = enhancingWeeks.size > 0;
  const [weekNotes, setWeekNotes] = useState({});
  const [expandedWeeks, setExpandedWeeks] = useState({});
  const [showEnhanceAllConfirm, setShowEnhanceAllConfirm] = useState(false);

  // Group workouts by week
  const groupedWeeks = groupWorkoutsByWeek(workouts);

  // Calculate stats
  const requestedWeeks = Number(programContext?.numberOfWeeks) || groupedWeeks.length;
  const totalWeeks = requestedWeeks;
  const detailedWeeks = groupedWeeks.filter((w) => w.status === 'detailed').length;
  const skeletonWeeks = groupedWeeks.filter((w) => w.status === 'skeleton').length;

  const toggleWeekExpanded = (weekNumber) => {
    setExpandedWeeks((prev) => ({
      ...prev,
      [weekNumber]: !prev[weekNumber],
    }));
  };

  const handleEnhanceWeek = (weekNumber) => {
    if (!onEnhanceWeek) return;
    onEnhanceWeek(weekNumber, weekNotes[weekNumber] || '');
  };

  const setWeekNote = (weekNumber, note) => {
    setWeekNotes((prev) => ({
      ...prev,
      [weekNumber]: note,
    }));
  };

  // Handle "Enhance All" button click - shows confirmation if weeks already enhanced
  const handleEnhanceAllClick = () => {
    if (detailedWeeks > 0) {
      // Show confirmation if some weeks are already enhanced
      setShowEnhanceAllConfirm(true);
    } else {
      // No enhanced weeks, proceed directly
      onEnhanceAll();
    }
  };

  if (!workouts || workouts.length === 0) {
    return null;
  }

  // Check if all weeks are detailed (program is fully enhanced)
  const isFullyEnhanced = skeletonWeeks === 0 && detailedWeeks === totalWeeks;

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="py-6 border-b border-[var(--paper-rule)]">
        <p className="athlete-label mb-2">
          {isFullyEnhanced ? 'Ready to train' : 'Skeleton in ink'}
        </p>
        <h2 className="athlete-heading-xl">
          {isFullyEnhanced
            ? 'The block is written.'
            : 'Structure first. Details when you want them.'}
        </h2>
        <p className="athlete-body mt-2">
          {workouts.length} workouts across {requestedWeeks} weeks.{' '}
          {isFullyEnhanced
            ? 'Open any day to edit, enhance, or log.'
            : 'Enhance a week when you want full notes — or leave it lean.'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="p-4 bg-base-200 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold">Enhancement Progress</h4>
          <span className="text-sm text-base-content/60">
            {detailedWeeks} of {totalWeeks} weeks detailed
            {enhancingWeeks.size > 0 && (
              <span className="ml-2 text-primary">({enhancingWeeks.size} in progress)</span>
            )}
          </span>
        </div>
        <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
          {/* Completed (green) */}
          <div
            className="bg-success h-3 float-left transition-all duration-300"
            style={{ width: `${(detailedWeeks / totalWeeks) * 100}%` }}
          />
          {/* In progress (animated blue) */}
          {enhancingWeeks.size > 0 && (
            <div
              className="bg-primary h-3 float-left transition-all duration-300 animate-pulse"
              style={{ width: `${(enhancingWeeks.size / totalWeeks) * 100}%` }}
            />
          )}
        </div>
      </div>

      {/* Program Description */}
      {generatedDescription && (
        <div className="mb-4">
          <div className="collapse collapse-arrow bg-base-200">
            <input type="checkbox" defaultChecked={true} />
            <div className="collapse-title font-medium">Program Description</div>
            <div className="collapse-content">
              <div
                className="p-2 bg-[var(--chalk)] rounded-sm text-sm"
                dangerouslySetInnerHTML={{
                  __html: parseMarkdownToHTML(generatedDescription),
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Week Cards */}
      <div className="grid gap-4">
        {groupedWeeks.map((week) => (
          <WeekCard
            key={week.weekNumber}
            week={week}
            isExpanded={expandedWeeks[week.weekNumber]}
            onToggleExpand={() => toggleWeekExpanded(week.weekNumber)}
            weekNote={weekNotes[week.weekNumber] || ''}
            onNoteChange={(note) => setWeekNote(week.weekNumber, note)}
            onEnhance={() => handleEnhanceWeek(week.weekNumber)}
            isEnhancing={enhancingWeeks.has(week.weekNumber)}
            // Action props for detailed workouts
            onViewDetails={onViewDetails}
            onEditWorkout={onEditWorkout}
            onDeleteWorkout={onDeleteWorkout}
            onMarkComplete={onMarkComplete}
            onDatePick={onDatePick}
            formatDate={formatDate}
            gymId={gymId}
          />
        ))}
      </div>

      {/* Bulk Enhancement Action */}
      {skeletonWeeks > 0 && (
        <div className="card bg-base-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-semibold">Enhance All Remaining Weeks</div>
              <div className="text-sm text-base-content/60">
                {isEnhancing ? (
                  <>
                    Enhancing {enhancingWeeks.size} week{enhancingWeeks.size !== 1 ? 's' : ''}...
                  </>
                ) : (
                  <>
                    {skeletonWeeks} weeks x ~2.5 min = ~{Math.round(skeletonWeeks * 2.5)} minutes
                    total
                  </>
                )}
              </div>
            </div>
            <button
              className="btn btn-outline btn-primary w-full sm:w-auto"
              onClick={handleEnhanceAllClick}
              disabled={isEnhancing}
            >
              {isEnhancing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enhancing {enhancingWeeks.size}/{skeletonWeeks + enhancingWeeks.size}...
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

      {/* Enhance All Confirmation Modal */}
      {showEnhanceAllConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="athlete-card-static p-6 max-w-md m-4">
            <h3 className="font-bold text-lg mb-2">Enhance Remaining Weeks?</h3>
            <p className="text-base-content/70 mb-4">
              {detailedWeeks} week{detailedWeeks > 1 ? 's have' : ' has'} already been enhanced and
              will be preserved. {skeletonWeeks} week{skeletonWeeks > 1 ? 's' : ''} will be
              enhanced.
            </p>
            <div className="flex flex-col gap-2">
              <button
                className="btn btn-primary w-full"
                onClick={() => {
                  setShowEnhanceAllConfirm(false);
                  onEnhanceAll();
                }}
              >
                Keep Enhanced, Enhance Rest ({skeletonWeeks} week{skeletonWeeks > 1 ? 's' : ''})
              </button>
              <button
                className="btn btn-outline w-full"
                onClick={() => {
                  setShowEnhanceAllConfirm(false);
                  onEnhanceAll({ includeEnhanced: true });
                }}
              >
                Re-enhance All Weeks ({totalWeeks} week{totalWeeks > 1 ? 's' : ''})
              </button>
              <button
                className="btn btn-ghost w-full"
                onClick={() => setShowEnhanceAllConfirm(false)}
              >
                Cancel
              </button>
            </div>
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
  // Action props for detailed workouts
  onViewDetails,
  onEditWorkout,
  onDeleteWorkout,
  onMarkComplete,
  onDatePick,
  formatDate,
  gymId,
}) {
  const statusColors = {
    detailed: 'border-[var(--olive)] bg-[color-mix(in_srgb,var(--olive)_8%,var(--chalk))]',
    enhancing: 'border-[var(--sea)] bg-[color-mix(in_srgb,var(--sea)_8%,var(--chalk))]',
    skeleton: 'border-[var(--paper-rule)] bg-[var(--chalk)]',
  };

  const statusBadgeColors = {
    detailed: 'bg-[var(--olive)] text-[var(--chalk)]',
    enhancing: 'bg-[var(--sea)] text-[var(--chalk)]',
    skeleton: 'bg-[var(--gold)] text-[var(--ink)]',
  };

  const statusLabels = {
    detailed: 'Fully Written',
    enhancing: 'Enhancing...',
    skeleton: 'Structure Only',
  };

  return (
    <div
      className={`
        p-6 rounded-sm border transition-all
        ${statusColors[week.status]}
        ${week.status === 'enhancing' ? 'animate-pulse' : ''}
      `}
    >
      {/* Week Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span
            className={`
            w-8 h-8 rounded-full flex items-center justify-center font-bold
            ${
              week.status === 'detailed' ? 'bg-[var(--olive)] text-[var(--chalk)]' : 'bg-[var(--paper-deep)] text-[var(--ink)]'
            }
          `}
          >
            {week.status === 'detailed' ? <Check className="w-4 h-4" /> : week.weekNumber}
          </span>
          <span className="font-semibold text-lg">Week {week.weekNumber}</span>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`
            px-3 py-1 rounded-full text-sm font-medium
            ${statusBadgeColors[week.status]}
          `}
          >
            {week.status === 'enhancing' && (
              <Loader2 className="w-3 h-3 mr-1 inline animate-spin" />
            )}
            {statusLabels[week.status]}
          </span>

          {/* Expand/Collapse Button */}
          <button onClick={onToggleExpand} className="btn btn-ghost btn-sm btn-circle">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Workout Previews */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-4">
        {sortWorkoutsForDisplay(week.workouts).map((workout, i) => (
          <div key={workout.id || i} className="p-3 bg-base-200/50 rounded-lg text-center">
            <div className="text-xs text-base-content/60">
              Day {extractDayNumber(workout.title, i)}
            </div>
            <div className="font-medium text-sm truncate">{extractFocus(workout.title)}</div>
          </div>
        ))}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-base-300 pt-4 mt-4">
          <div className="space-y-4">
            {sortWorkoutsForDisplay(week.workouts).map((workout, i) => (
              <DetailedWorkoutCard
                key={workout.id || i}
                workout={workout}
                dayIndex={extractDayNumber(workout.title, i) - 1}
                weekStatus={week.status}
                onViewDetails={onViewDetails}
                onEditWorkout={onEditWorkout}
                onDeleteWorkout={onDeleteWorkout}
                onMarkComplete={onMarkComplete}
                onDatePick={onDatePick}
                formatDate={formatDate}
                gymId={gymId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Enhancement Action */}
      {week.status === 'skeleton' && (
        <div className="space-y-3 mt-4">
          <textarea
            placeholder="Optional adjustments (e.g., 'Focus on posterior chain', 'Avoid overhead movements'). Leave blank for full comprehensive details."
            value={weekNote}
            onChange={(e) => onNoteChange(e.target.value)}
            className="textarea textarea-bordered w-full text-sm"
            rows={2}
          />
          <button
            type="button"
            onPointerDown={(event) => {
              if (event.pointerType === 'mouse' && event.button !== 0) return;
              if (isEnhancing) return;
              onEnhance();
            }}
            onClick={(event) => {
              event.preventDefault();
              if (isEnhancing) return;
              onEnhance();
            }}
            disabled={isEnhancing}
            aria-busy={isEnhancing}
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
                <span className="badge badge-ghost ml-2 pointer-events-none">~2-3 min</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// Detailed Workout Card Component - renders full workout with actions (matches WorkoutList style)
function DetailedWorkoutCard({
  workout,
  dayIndex,
  weekStatus,
  onViewDetails,
  onEditWorkout,
  onDeleteWorkout,
  onMarkComplete,
  onDatePick,
  formatDate,
  gymId,
}) {
  const isSkeleton = workout.generation_status === 'skeleton';
  const isDetailed = workout.generation_status === 'detailed';
  const displayBody = workout.body || workout.body_skeleton;

  const getDisplayDate = () => {
    const date =
      workout.scheduled_date ||
      workout.suggestedDate ||
      workout.date ||
      workout.tags?.suggestedDate;
    if (!date) return null;
    return formatDate ? formatDate(date) : date;
  };

  // For skeleton workouts, show simple view
  if (weekStatus === 'skeleton' || isSkeleton) {
    return (
      <div className="bg-base-200/30 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">{workout.title}</h4>
        <div className="text-sm text-base-content/80 whitespace-pre-wrap">
          {workout.body_skeleton || workout.body}
        </div>
        <div className="mt-2 p-2 bg-warning/10 rounded text-xs text-warning-content">
          Skeleton version - Click "Add Full Details" to add strategy, coaching cues, warm-up,
          cool-down, and scaling options.
        </div>
      </div>
    );
  }

  // For detailed workouts, show full card with actions (matching WorkoutList style exactly)
  return (
    <div
      className={`border rounded-md p-3 sm:p-4 flex flex-col w-full ${
        workout.completed
          ? 'bg-[color-mix(in_srgb,var(--olive)_10%,var(--chalk))] border-[var(--olive)]'
          : 'bg-[var(--chalk)] border-[var(--paper-rule)]'
      }`}
    >
      <div className="flex justify-between items-center mb-1 w-full">
        <div className="flex-1 mr-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded">
              Day {dayIndex + 1}
            </span>
            {workout.completed && (
              <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded">
                Completed
              </span>
            )}
            {workout.generation_status === 'skeleton' && (
              <span className="text-xs font-medium px-2 py-1 bg-warning/20 text-warning-content rounded">
                Skeleton
              </span>
            )}
            {workout.generation_status === 'enhancing' && (
              <span className="text-xs font-medium px-2 py-1 bg-info/20 text-info-content rounded animate-pulse">
                Enhancing...
              </span>
            )}
            {workout.generation_status === 'detailed' && (
              <span className="text-xs font-medium px-2 py-1 bg-success/20 text-success-content rounded">
                Detailed
              </span>
            )}
          </div>
          <h4 className="font-semibold break-words">{workout.title || `Day ${dayIndex + 1}`}</h4>
        </div>
        {workout.id && (
          <details className="dropdown dropdown-end flex-shrink-0">
            <summary className="btn btn-sm btn-ghost btn-square">
              <MoreVertical className="h-5 w-5" />
            </summary>
            <ul className="menu dropdown-content bg-base-100 rounded-box z-10 w-40 p-2 shadow-sm">
              <li>
                <button
                  className="flex items-center gap-2 w-full text-neutral"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onEditWorkout) onEditWorkout(workout);
                  }}
                  title="Edit workout"
                >
                  <Pencil className="h-4 w-4" /> Edit
                </button>
              </li>
              <li>
                <button
                  className="flex items-center gap-2 w-full text-success"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onMarkComplete) onMarkComplete(workout);
                  }}
                  title={workout.completed ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  <CheckCircle className="h-4 w-4" />
                  {workout.completed ? 'Incomplete' : 'Complete'}
                </button>
              </li>
              <li>
                <button
                  className="flex items-center gap-2 w-full text-error"
                  onClick={(e) => {
                    if (onDeleteWorkout) onDeleteWorkout(workout.id, e);
                  }}
                  title="Delete workout"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </li>
            </ul>
          </details>
        )}
      </div>
      <div className="mb-2">
        <button
          className="btn btn-xs btn-ghost text-primary cursor-pointer pl-0"
          onClick={(e) => {
            e.stopPropagation();
            if (onDatePick) onDatePick(workout);
          }}
          title="Adjust date"
        >
          {getDisplayDate() || 'Not scheduled'}
        </button>
      </div>
      <div
        className="overflow-auto max-h-60 sm:max-h-80 text-sm mb-3 flex-grow"
        dangerouslySetInnerHTML={{
          __html: parseMarkdownToHTML(displayBody || 'No description available'),
        }}
      />
      <div className="flex justify-between items-center mt-auto gap-2">
        {/* Feedback Button */}
        {workout.id && gymId && (
          <TemplateFeedbackButton workoutId={workout.id} gymId={gymId} showStats={true} size="sm" />
        )}
        {(!workout.id || !gymId) && <div />}
        <button
          className="btn btn-sm text-white btn-primary w-full sm:w-auto"
          onClick={(e) => {
            e.stopPropagation();
            if (onViewDetails) onViewDetails(workout);
          }}
        >
          View Details
        </button>
      </div>
    </div>
  );
}

function extractFocus(title) {
  const cleaned = String(title || '')
    .replace(/["']?\s*,\s*"body"[\s\S]*$/i, '')
    .replace(/\\n/g, ' ')
    .replace(/"+/g, '')
    .trim();
  const match = cleaned.match(/:\s*(.+)$/);
  return match ? match[1].trim() : 'Workout';
}

function groupWorkoutsByWeek(workouts) {
  if (!workouts || workouts.length === 0) return [];

  const grouped = {};

  workouts.forEach((workout) => {
    const rawWeek = Number(workout.week_number);
    let weekNumber = Number.isFinite(rawWeek) && rawWeek > 0 ? rawWeek : 0;
    if (!weekNumber) {
      const match = workout.title?.match(/Week\s+(\d+)/i);
      weekNumber = match ? parseInt(match[1], 10) : 1;
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

  Object.values(grouped).forEach((week) => {
    week.status = weekDisplayStatus(week.workouts);
  });

  return Object.values(grouped).sort((a, b) => a.weekNumber - b.weekNumber);
}
