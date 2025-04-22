'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, ChevronDown } from 'lucide-react';

// Define default options outside the component
const defaultTypeOptions = [
  { id: 'crossfit', name: 'CrossFit', icon: '🏋️‍♀️' },
  { id: 'bodybuilding', name: 'Bodybuilding', icon: '💪' },
  { id: 'powerlifting', name: 'Powerlifting', icon: '🏆' },
  { id: 'functional', name: 'Functional Fitness', icon: '🔄' },
  { id: 'hiit', name: 'HIIT/Metabolic', icon: '⏱️' },
  { id: 'calisthenics', name: 'Calisthenics', icon: '🤸‍♂️' },
  { id: 'sport', name: 'Sport-Specific', icon: '🏈' },
  { id: 'commercial', name: 'Commercial Gym', icon: '🏢' },
  { id: 'minimal', name: 'Minimal Equipment', icon: '🏠' },
  { id: 'balanced', name: 'Balanced Fitness', icon: '⚖️' },
];

export default function ProgramTypeSelector({
  selectedTypes = [],
  onChange,
  options = defaultTypeOptions, // Use default if options prop not provided
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState([]);
  const dropdownRef = useRef(null);

  // No need for useMemo here anymore since options prop defaults to a constant
  const typeOptions = options;

  useEffect(() => {
    setFilteredOptions(
      typeOptions.filter((type) =>
        type.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm, typeOptions]); // Remove 'options' from dependency array

  const handleSelect = (typeId) => {
    const newSelected = selectedTypes.includes(typeId)
      ? selectedTypes.filter((id) => id !== typeId)
      : [...selectedTypes, typeId];
    onChange(newSelected);
  };

  const handleClickOutside = useCallback(
    (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    },
    [setIsOpen]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClickOutside]);

  const selectedOptions = typeOptions.filter((type) =>
    selectedTypes.includes(type.id)
  );

  return (
    <div className="dropdown dropdown-end w-full" ref={dropdownRef}>
      <button
        type="button"
        tabIndex={0}
        role="button"
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-outline bg-white border-base-content/20 hover:border-base-content/40 hover:bg-transparent w-full justify-between font-normal text-base-content"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {selectedOptions.length > 0 ? (
          <div className="flex items-center flex-wrap gap-1 overflow-hidden">
            {selectedOptions.map((opt) => (
              <span
                key={opt.id}
                className="badge badge-outline badge-sm flex items-center gap-1 overflow-hidden"
              >
                <span>{opt.icon}</span>
                <span className="truncate max-w-[4rem]">{opt.name}</span>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-base-content/60">
            Select training methodology
          </span>
        )}
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <ul
          tabIndex={0}
          className="dropdown-content z-[1] w-auto min-w-full menu p-2 shadow bg-base-100 rounded-box mt-2 max-h-60 overflow-y-auto"
          role="listbox"
        >
          <li>
            <input
              type="text"
              placeholder="Search methodology..."
              className="input input-bordered input-sm w-full !outline-none mb-1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              aria-label="Search training methodology"
            />
          </li>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((type) => (
              <li
                key={type.id}
                role="option"
                aria-selected={selectedTypes.includes(type.id)}
              >
                <button
                  type="button"
                  onClick={() => handleSelect(type.id)}
                  className={`flex items-center justify-between w-full text-left p-2 rounded ${
                    selectedTypes.includes(type.id)
                      ? 'bg-primary text-primary-content'
                      : 'hover:bg-base-200'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="mr-1">{type.icon}</span>
                    {type.name}
                  </span>
                  <Check
                    className={`ml-auto h-4 w-4 ${
                      selectedTypes.includes(type.id)
                        ? 'opacity-100'
                        : 'opacity-0'
                    }`}
                  />
                </button>
              </li>
            ))
          ) : (
            <li className="p-2 text-center text-base-content/60">
              No results found.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
