'use client';
import ProgramCard from './ProgramCard';

export default function ProgramsList({
  programs,
  entities,
  filterEntityId,
  searchQuery = '',
  onFilterChange,
  onDeleteProgram,
  onCreateProgram,
}) {
  // Filter programs based on selected entity and search query
  const filteredPrograms = programs.filter((program) => {
    const matchesEntity = filterEntityId === 'all' || program.entity_id === filterEntityId;
    const matchesSearch =
      searchQuery === '' ||
      program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.description?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesEntity && matchesSearch;
  });

  if (programs.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-12 h-12 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Programs Yet</h3>
        <p className="text-slate-600 mb-6 max-w-sm mx-auto">
          Create your first training program to get started with managing your workouts
        </p>
        <button
          onClick={onCreateProgram}
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 shadow-sm"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Create Your First Program
        </button>
      </div>
    );
  }

  if (filteredPrograms.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Programs Found</h3>
        <p className="text-slate-600 mb-4">
          {searchQuery
            ? `No programs match "${searchQuery}"`
            : 'No programs match your current filter'}
        </p>
        <button
          onClick={onCreateProgram}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Create New Program
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          {filteredPrograms.length} {filteredPrograms.length === 1 ? 'program' : 'programs'}
          {searchQuery && ` matching "${searchQuery}"`}
        </span>
      </div>

      {/* Programs grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredPrograms.map((program) => {
          // Find the entity name for the card
          const entity = entities.find((e) => e.id === program.entity_id);
          const entityDisplayName = entity
            ? `${entity.name} (${entity.type})`
            : 'Unknown Profile/Class';

          return (
            <ProgramCard
              key={program.id}
              program={program}
              entityDisplayName={entityDisplayName}
              onDelete={onDeleteProgram}
            />
          );
        })}
      </div>
    </div>
  );
}
