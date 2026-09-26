import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface CalendarDateRangePickerProps {
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  onChange: (startDate: string, endDate: string) => void;
  observationDates?: string[]; // set of 'YYYY-MM-DD' with logged observations
}

// Helpers
function formatYmd(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function parseYmd(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = parseYmd(dateStr);
  if (!date) return dateStr;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const CalendarDateRangePicker: React.FC<CalendarDateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  observationDates = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Current view month (defaults to startDate or current date)
  const [viewDate, setViewDate] = useState<Date>(() => {
    return parseYmd(startDate) || parseYmd(endDate) || new Date();
  });

  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Sync viewDate when startDate changes externally
  useEffect(() => {
    if (startDate) {
      const d = parseYmd(startDate);
      if (d) setViewDate(d);
    }
  }, [startDate]);

  // Month navigation
  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  // Days in month calculation
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    // Previous month filler days
    const prevMonthDaysCount = new Date(year, month, 0).getDate();
    const prevDays: { day: number; dateStr: string; currentMonth: boolean }[] = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDaysCount - i;
      const prevDate = new Date(year, month - 1, d);
      prevDays.push({
        day: d,
        dateStr: formatYmd(prevDate.getFullYear(), prevDate.getMonth(), d),
        currentMonth: false,
      });
    }

    // Current month days
    const currentDays: { day: number; dateStr: string; currentMonth: boolean }[] = [];
    for (let d = 1; d <= totalDaysInMonth; d++) {
      currentDays.push({
        day: d,
        dateStr: formatYmd(year, month, d),
        currentMonth: true,
      });
    }

    // Next month filler days to complete 35 or 42 grid cells
    const combined = [...prevDays, ...currentDays];
    const totalCells = combined.length > 35 ? 42 : 35;
    const nextDaysCount = totalCells - combined.length;
    const nextDays: { day: number; dateStr: string; currentMonth: boolean }[] = [];
    for (let d = 1; d <= nextDaysCount; d++) {
      const nextDate = new Date(year, month + 1, d);
      nextDays.push({
        day: d,
        dateStr: formatYmd(nextDate.getFullYear(), nextDate.getMonth(), d),
        currentMonth: false,
      });
    }

    return [...combined, ...nextDays];
  }, [viewDate]);

  // Handle day click
  const handleDayClick = (dateStr: string) => {
    if (!startDate || (startDate && endDate)) {
      // Start a new selection
      onChange(dateStr, '');
    } else if (startDate && !endDate) {
      if (dateStr < startDate) {
        onChange(dateStr, startDate);
      } else {
        onChange(startDate, dateStr);
      }
    }
  };

  // Quick preset actions
  const applyPreset = (preset: 'today' | 'yesterday' | 'last7' | 'last14' | 'thisMonth' | 'all') => {
    const now = new Date();
    const todayStr = formatYmd(now.getFullYear(), now.getMonth(), now.getDate());

    if (preset === 'today') {
      onChange(todayStr, todayStr);
      setViewDate(now);
    } else if (preset === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = formatYmd(yest.getFullYear(), yest.getMonth(), yest.getDate());
      onChange(yestStr, yestStr);
      setViewDate(yest);
    } else if (preset === 'last7') {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      const start = formatYmd(d.getFullYear(), d.getMonth(), d.getDate());
      onChange(start, todayStr);
      setViewDate(now);
    } else if (preset === 'last14') {
      const d = new Date(now);
      d.setDate(d.getDate() - 13);
      const start = formatYmd(d.getFullYear(), d.getMonth(), d.getDate());
      onChange(start, todayStr);
      setViewDate(now);
    } else if (preset === 'thisMonth') {
      const start = formatYmd(now.getFullYear(), now.getMonth(), 1);
      onChange(start, todayStr);
      setViewDate(now);
    } else if (preset === 'all') {
      onChange('', '');
    }
  };

  const hasRange = Boolean(startDate || endDate);

  // Month & Year title
  const monthYearTitle = viewDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const observationSet = useMemo(() => new Set(observationDates), [observationDates]);

  // Label for trigger button
  const triggerLabel = useMemo(() => {
    if (startDate && endDate) {
      if (startDate === endDate) {
        return formatDisplayDate(startDate);
      }
      return `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`;
    }
    if (startDate) {
      return `From ${formatDisplayDate(startDate)}`;
    }
    if (endDate) {
      return `Until ${formatDisplayDate(endDate)}`;
    }
    return 'Select Date Range';
  }, [startDate, endDate]);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
            hasRange
              ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-700 text-sky-900 dark:text-sky-200 ring-2 ring-sky-500/20 shadow-2xs'
              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
          }`}
          title="Open interactive calendar date range picker"
        >
          <CalendarIcon className={`w-3.5 h-3.5 ${hasRange ? 'text-sky-600' : 'text-slate-400'}`} />
          <span>{triggerLabel}</span>
          {hasRange && (
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
          )}
        </button>

        {hasRange && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('', '');
            }}
            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Clear date range filter"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Popover Calendar Grid */}
      {isOpen && (
        <div className="absolute left-0 mt-2 z-50 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-4 animate-in fade-in zoom-in-95">
          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-sky-500" />
              <span>Presets:</span>
            </span>
            <button
              type="button"
              onClick={() => applyPreset('today')}
              className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => applyPreset('yesterday')}
              className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition cursor-pointer"
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => applyPreset('last7')}
              className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition cursor-pointer"
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset('last14')}
              className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition cursor-pointer"
            >
              Last 14 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset('thisMonth')}
              className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition cursor-pointer"
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => applyPreset('all')}
              className="px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition cursor-pointer ml-auto"
            >
              Reset
            </button>
          </div>

          {/* Month Header & Navigation */}
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {monthYearTitle}
            </h4>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of the Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <div
                key={day}
                className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Month Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(({ day, dateStr, currentMonth }) => {
              const isStart = startDate === dateStr;
              const isEnd = endDate === dateStr;
              const hasLogged = observationSet.has(dateStr);

              // Check if inside range
              let inRange = false;
              if (startDate && endDate) {
                inRange = dateStr >= startDate && dateStr <= endDate;
              } else if (startDate && !endDate && hoverDate) {
                const min = startDate < hoverDate ? startDate : hoverDate;
                const max = startDate < hoverDate ? hoverDate : startDate;
                inRange = dateStr >= min && dateStr <= max;
              }

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => handleDayClick(dateStr)}
                  onMouseEnter={() => setHoverDate(dateStr)}
                  onMouseLeave={() => setHoverDate(null)}
                  className={`relative h-8 rounded-lg text-xs font-semibold transition flex flex-col items-center justify-center cursor-pointer ${
                    !currentMonth
                      ? 'text-slate-300 dark:text-slate-600'
                      : isStart || isEnd
                      ? 'bg-sky-600 text-white font-bold shadow-xs'
                      : inRange
                      ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-900 dark:text-sky-200'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{day}</span>
                  {/* Observation dot indicator */}
                  {hasLogged && (
                    <span
                      className={`w-1 h-1 rounded-full absolute bottom-1 ${
                        isStart || isEnd ? 'bg-white' : 'bg-teal-500'
                      }`}
                      title="Observations logged on this date"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Range Summary & Manual Inputs */}
          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {startDate && !endDate ? (
                <span className="text-sky-600 dark:text-sky-400 font-semibold">
                  Click second date to complete range
                </span>
              ) : startDate && endDate ? (
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatDisplayDate(startDate)} to {formatDisplayDate(endDate)}
                </span>
              ) : (
                <span>Click start date, then end date</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {hasRange && (
                <button
                  type="button"
                  onClick={() => onChange('', '')}
                  className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
