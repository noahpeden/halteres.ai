'use client';
import { Calendar, ExternalLink, Trash2, User, Users } from 'lucide-react';
import Link from 'next/link';

export default function ProgramCard({ program, entityDisplayName, onDelete }) {
  // Share functionality removed in B2C UX
  // Parse entity info
  const entityParts = entityDisplayName.split(' (');
  const entityName = entityParts[0];
  const entityType = entityParts[1]?.replace(')', '') || 'CLIENT';

  // Format creation date
  const createdDate = new Date(program.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4 hover:shadow-md hover:border-blue-300 transition-all duration-200 group">
      <div className="flex items-center justify-between">
        {/* Left side - Program info */}
        <div className="flex-1 min-w-0 mr-2 sm:mr-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm sm:text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors duration-200 truncate">
              {program.name}
            </h3>
            <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-medium flex-shrink-0">
              {entityType}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm gap-1 sm:gap-0">
            {/* Entity info */}
            <div className="flex items-center text-slate-600 min-w-0 order-1">
              {entityType === 'CLIENT' ? (
                <User className="w-3.5 h-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
              ) : (
                <Users className="w-3.5 h-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
              )}
              <span className="font-medium truncate">{entityName}</span>
            </div>

            {/* Creation date */}
            <div className="flex items-center text-slate-500 sm:ml-4 flex-shrink-0 order-2">
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              <span className="text-xs">{createdDate}</span>
            </div>
          </div>

          {/* Description - only show if exists and keep it very compact */}
          {program.description && (
            <p className="text-xs text-slate-600 line-clamp-1 mt-2">{program.description}</p>
          )}
        </div>

        {/* Right side - Action buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-2 flex-shrink-0">
          <Link
            href={`/program/${program.id}/writer`}
            className="inline-flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors duration-200 group"
          >
            <span>Open</span>
            <ExternalLink className="w-3 h-3 ml-1.5 group-hover:translate-x-0.5 transition-transform duration-200" />
          </Link>

          <button
            onClick={() => onDelete(program.id)}
            className="inline-flex items-center justify-center p-1 sm:p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200 group"
            title="Delete program"
          >
            <Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform duration-200" />
          </button>
        </div>
      </div>
    </div>
  );
}
