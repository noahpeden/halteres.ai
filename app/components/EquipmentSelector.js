import React, { useCallback, useState, useRef } from 'react';
import { ReactTags } from 'react-tag-autocomplete';
import equipmentList from '@/utils/equipmentlist';

function EquipmentSelector({ selected, setSelected }) {
  const reactTags = useRef(null);

  const onAdd = useCallback(
    (newTag) => {
      setSelected([...selected, newTag]);
    },
    [selected, setSelected]
  );

  const onDelete = useCallback(
    (tagIndex) => {
      setSelected(selected.filter((_, i) => i !== tagIndex));
    },
    [selected, setSelected]
  );

  const daisyUIReactTagsClassNames = {
    root: 'react-tags daisyui-form-control',
    searchInput: 'react-tags__search-input input input-bordered',
    selected: 'react-tags__selected',
    selectedTag: 'react-tags__selected-tag badge badge-accent',
    selectedTagName: 'react-tags__selected-tag-name',
    search: 'react-tags__search',
    searchWrapper: 'react-tags__search-wrapper',
    suggestions: 'react-tags__suggestions',
    suggestionActive: 'react-tags__suggestion--active',
    suggestionDisabled: 'react-tags__suggestion--disabled',
    // Add more custom classes as needed for each part of the component
  };

  return (
    <div className="w-full">
      <ReactTags
        ref={reactTags}
        tags={selected}
        suggestions={equipmentList}
        onAddition={onAdd}
        onDelete={onDelete}
        classNames={daisyUIReactTagsClassNames}
        noSuggestionsText="No matching equipment found"
        placeholderText="Add new equipment"
        allowNew={true}
      />
      <button
        type="button"
        className="btn btn-outline btn-primary mt-2"
        onClick={() => reactTags.current.input.focus()}
      >
        Focus input
      </button>
    </div>
  );
}

export default EquipmentSelector;
