'use client';

import { useState, useEffect } from 'react';

interface RangeFilterProps {
  label: string;           // "Cost Range" or "Token Range"
  min: number;             // Auto-detected min from data
  max: number;             // Auto-detected max from data
  currentMin: number | null;
  currentMax: number | null;
  onChange: (min: number | null, max: number | null) => void;
  formatValue?: (value: number) => string;  // Optional formatter (e.g., "$5.00" or "5M")
  step?: number;           // Slider step (default 1)
}

export default function RangeFilter({
  label,
  min,
  max,
  currentMin,
  currentMax,
  onChange,
  formatValue,
  step = 1,
}: RangeFilterProps) {
  // Local state for controlled inputs
  const [localMin, setLocalMin] = useState<number>(currentMin ?? min);
  const [localMax, setLocalMax] = useState<number>(currentMax ?? max);

  // Sync local state when props change
  useEffect(() => {
    setLocalMin(currentMin ?? min);
    setLocalMax(currentMax ?? max);
  }, [currentMin, currentMax, min, max]);

  // Handle slider changes
  const handleMinSliderChange = (value: number) => {
    const newMin = Math.min(value, localMax); // Ensure min <= max
    setLocalMin(newMin);
    onChange(newMin === min ? null : newMin, localMax === max ? null : localMax);
  };

  const handleMaxSliderChange = (value: number) => {
    const newMax = Math.max(value, localMin); // Ensure max >= min
    setLocalMax(newMax);
    onChange(localMin === min ? null : localMin, newMax === max ? null : newMax);
  };

  // Handle number input changes
  const handleMinInputChange = (value: string) => {
    const parsed = parseFloat(value);
    if (isNaN(parsed)) return;

    const clamped = Math.max(min, Math.min(parsed, max));
    const newMin = Math.min(clamped, localMax);
    setLocalMin(newMin);
    onChange(newMin === min ? null : newMin, localMax === max ? null : localMax);
  };

  const handleMaxInputChange = (value: string) => {
    const parsed = parseFloat(value);
    if (isNaN(parsed)) return;

    const clamped = Math.max(min, Math.min(parsed, max));
    const newMax = Math.max(clamped, localMin);
    setLocalMax(newMax);
    onChange(localMin === min ? null : localMin, newMax === max ? null : newMax);
  };

  // Reset to full range
  const handleReset = () => {
    setLocalMin(min);
    setLocalMax(max);
    onChange(null, null);
  };

  // Calculate fill percentage for visual slider track
  const minPercent = ((localMin - min) / (max - min)) * 100;
  const maxPercent = ((localMax - min) / (max - min)) * 100;

  const isFiltered = localMin !== min || localMax !== max;

  return (
    <div className="space-y-3">
      {/* Label and Reset */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-300" id={`${label}-label`}>
          {label}
        </label>
        {isFiltered && (
          <button
            onClick={handleReset}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none rounded px-2 py-1"
            aria-label={`Reset ${label.toLowerCase()} to default range`}
          >
            Reset
          </button>
        )}
      </div>

      {/* Dual Range Slider Container */}
      <div className="relative h-6">
        {/* Background track */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-1.5 bg-slate-700 rounded-full" />

        {/* Active range track (colored section between handles) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-blue-500 rounded-full pointer-events-none"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`,
          }}
        />

        {/* Min range slider */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localMin}
          onChange={(e) => handleMinSliderChange(parseFloat(e.target.value))}
          aria-label={`Set minimum ${label.toLowerCase()}`}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={localMin}
          className="absolute w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-900 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg hover:[&::-webkit-slider-thumb]:bg-blue-400 focus:[&::-webkit-slider-thumb]:ring-2 focus:[&::-webkit-slider-thumb]:ring-blue-400 focus:[&::-webkit-slider-thumb]:ring-offset-2 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-slate-900 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-lg hover:[&::-moz-range-thumb]:bg-blue-400 focus:[&::-moz-range-thumb]:ring-2 focus:[&::-moz-range-thumb]:ring-blue-400 focus:[&::-moz-range-thumb]:ring-offset-2"
          style={{ zIndex: localMin > max - (max - min) * 0.1 ? 5 : 3 }}
        />

        {/* Max range slider */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localMax}
          onChange={(e) => handleMaxSliderChange(parseFloat(e.target.value))}
          aria-label={`Set maximum ${label.toLowerCase()}`}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={localMax}
          className="absolute w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-900 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg hover:[&::-webkit-slider-thumb]:bg-blue-400 focus:[&::-webkit-slider-thumb]:ring-2 focus:[&::-webkit-slider-thumb]:ring-blue-400 focus:[&::-webkit-slider-thumb]:ring-offset-2 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-slate-900 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-lg hover:[&::-moz-range-thumb]:bg-blue-400 focus:[&::-moz-range-thumb]:ring-2 focus:[&::-moz-range-thumb]:ring-blue-400 focus:[&::-moz-range-thumb]:ring-offset-2"
          style={{ zIndex: 4 }}
        />
      </div>

      {/* Value Display and Number Inputs */}
      <div className="flex items-center gap-3">
        {/* Min Input */}
        <div className="flex-1">
          <label htmlFor={`${label}-min`} className="text-xs text-slate-400 mb-1 block">
            Min
          </label>
          <input
            id={`${label}-min`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={localMin}
            onChange={(e) => handleMinInputChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label={`Minimum ${label.toLowerCase()}`}
          />
          {formatValue && (
            <div className="text-xs text-slate-500 mt-1">{formatValue(localMin)}</div>
          )}
        </div>

        {/* Separator */}
        <div className="text-slate-500 pt-5" aria-hidden="true">
          —
        </div>

        {/* Max Input */}
        <div className="flex-1">
          <label htmlFor={`${label}-max`} className="text-xs text-slate-400 mb-1 block">
            Max
          </label>
          <input
            id={`${label}-max`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={localMax}
            onChange={(e) => handleMaxInputChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label={`Maximum ${label.toLowerCase()}`}
          />
          {formatValue && (
            <div className="text-xs text-slate-500 mt-1">{formatValue(localMax)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
