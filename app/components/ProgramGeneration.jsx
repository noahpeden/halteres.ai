'use client';

import React, { useState } from 'react';

export default function ProgramGeneration({ onGenerate, isGenerating }) {
  const [prompt, setPrompt] = useState('');
  const [generationType, setGenerationType] = useState('complete'); // complete, modify, suggestions

  const handleSubmit = (e) => {
    e.preventDefault();
    onGenerate({ prompt, type: generationType });
  };

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <h2 className="card-title">Program Generation</h2>
        <p className="text-sm text-gray-500 mb-4">
          Use AI to generate or modify your program based on your requirements.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Generation Type</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={generationType}
              onChange={(e) => setGenerationType(e.target.value)}
            >
              <option value="complete">Complete Program</option>
              <option value="modify">Modify Existing</option>
              <option value="suggestions">Get Suggestions</option>
            </select>
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Prompt</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-24"
              placeholder="Describe what you want to generate..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            ></textarea>
          </div>

          <div className="card-actions justify-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isGenerating || !prompt.trim()}
            >
              {isGenerating ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Generating...
                </>
              ) : (
                'Generate Program'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
