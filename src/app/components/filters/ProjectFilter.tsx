'use client';

import { useState, useRef, useEffect } from 'react';
import { useDashboardData } from '@/lib/client/data-context';
import { useFilters } from '@/lib/client/filter-context';

export default function ProjectFilter() {
  const { data } = useDashboardData();
  const { filters, toggleProject } = useFilters();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const availableProjects = data?.projects || [];

  const filteredProjects = availableProjects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCount = filters.projects.size;
  const allSelected = selectedCount === 0;

  const isProjectSelected = (projectName: string) => {
    return allSelected || filters.projects.has(projectName);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectAll = () => {
    availableProjects.forEach((project) => {
      if (filters.projects.has(project.name)) {
        toggleProject(project.name);
      }
    });
  };

  if (availableProjects.length === 0) {
    return (
      <div className="text-slate-600 text-xs px-3 py-2 bg-slate-900/30 rounded border border-slate-800">
        No projects available
      </div>
    );
  }

  const buttonLabel = allSelected
    ? `All (${availableProjects.length})`
    : `${selectedCount} selected`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
          }
        }}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 bg-transparent border border-slate-800 rounded hover:text-slate-300 hover:border-slate-700 transition-all focus:outline-none focus:ring-1 focus:ring-slate-600"
        aria-label="Select projects to filter"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span>{buttonLabel}</span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute mt-1 w-80 bg-slate-900 border border-slate-800 rounded shadow-2xl z-50"
          role="listbox"
          aria-label="Projects list"
        >
          <div className="p-2 border-b border-slate-800">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded text-slate-300 placeholder-slate-600 focus:outline-none focus:border-slate-700 transition-colors"
              aria-label="Search projects by name or path"
            />
          </div>

          <div className="p-2 border-b border-slate-800">
            <button
              onClick={handleSelectAll}
              className="w-full px-2 py-1 text-xs text-slate-400 hover:text-slate-300 text-left rounded hover:bg-slate-800/50 transition-colors focus:outline-none"
              aria-label="Select all projects"
            >
              Select all
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filteredProjects.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-600">
                No projects found
              </div>
            ) : (
              filteredProjects.map((project) => {
                const selected = isProjectSelected(project.name);

                return (
                  <label
                    key={project.name}
                    className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-slate-800/50 transition-colors group"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleProject(project.name)}
                      className="mt-0.5 w-3 h-3 rounded border border-slate-700 bg-slate-950 text-slate-400 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      aria-label={`Toggle ${project.name} project filter`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-300 truncate group-hover:text-slate-200">{project.name}</div>
                      <div className="text-[10px] text-slate-600 truncate">{project.path}</div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
