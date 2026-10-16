import React, { useState } from 'react';

interface ZoomSliderProps {
  /** Current zoom start percent (0-100) */
  start: number;
  /** Current zoom end percent (0-100) */
  end: number;
  /** Callback when range changes */
  onChange: (start: number, end: number) => void;
}

export function ZoomSlider({ start, end, onChange }: ZoomSliderProps) {
  const [localStart, setLocalStart] = useState(start);
  const [localEnd, setLocalEnd] = useState(end);

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(Number(e.target.value), localEnd - 1);
    setLocalStart(val);
    onChange(val, localEnd);
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(Number(e.target.value), localStart + 1);
    setLocalEnd(val);
    onChange(localStart, val);
  };

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Zoom:</span>
      <input
        type="range"
        min={0}
        max={100}
        value={localStart}
        onChange={handleStartChange}
        className="flex-1"
        aria-label="Zoom start"
      />
      <input
        type="range"
        min={0}
        max={100}
        value={localEnd}
        onChange={handleEndChange}
        className="flex-1"
        aria-label="Zoom end"
      />
      <span>{localStart}% – {localEnd}%</span>
    </div>
  );
}
