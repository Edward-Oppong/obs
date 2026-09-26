import React, { useState, useMemo, useEffect } from 'react';
import { User } from 'firebase/auth';
import { doc, updateDoc, deleteDoc, serverTimestamp, db } from '../firebase';
import {
  ObservationDoc,
  GroupId,
  AeiouCategory,
  ObservationStatus,
  SeverityLevel,
  TagType,
} from '../types';
import {
  FIXED_TAGS,
  TAG_LABELS,
  AEIOU_DEFINITIONS,
  STATUS_CONFIG,
  SEVERITY_CONFIG,
  CLINICAL_SETTINGS,
} from '../constants';
import { CommentSection } from './CommentSection';
import { CalendarDateRangePicker } from './CalendarDateRangePicker';
import {
  Search,
  Filter,
  Calendar,
  X,
  MessageSquare,
  Building,
  Users2,
  Quote,
  Clock,
  Sparkles,
  ChevronDown,
  CheckCircle,
  Tag,
  AlertCircle,
  Compass,
  Copy,
  Check,
  Trash2,
} from 'lucide-react';

interface AllEntriesTabProps {
  observations: ObservationDoc[];
  loading: boolean;
  user: User | null;
  onOpenAuth: () => void;
  onOpenAeiouHelp: () => void;
  initialFilters?: {
    group?: string;
    tag?: string;
    status?: string;
    aeiou?: string;
    severity?: string;
    setting?: string;
  };
}

// Reusable Highlight component to visually emphasize matching search terms
const HighlightedText: React.FC<{ text?: string; highlight?: string; className?: string }> = ({
  text,
  highlight,
  className = '',
}) => {
  if (!text) return null;
  if (!highlight || !highlight.trim()) {
    return <span className={className}>{text}</span>;
  }

  const query = highlight.trim();
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={index}
            className="bg-amber-200 dark:bg-amber-400/35 text-amber-950 dark:text-amber-100 font-extrabold px-1 py-0.2 rounded-xs shadow-2xs"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

export const AllEntriesTab: React.FC<AllEntriesTabProps> = ({
  observations,
  loading,
  user,
  onOpenAuth,
  onOpenAeiouHelp,
}) => {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedAeiou, setSelectedAeiou] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedSetting, setSelectedSetting] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Expand comment thread by observation ID
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [statusUpdateLoading, setStatusUpdateLoading] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync initial filters passed from Dashboard clicks
  useEffect(() => {
    if (!initialFilters) return;
    if (initialFilters.group !== undefined) setSelectedGroup(initialFilters.group);
    if (initialFilters.tag !== undefined) setSelectedTag(initialFilters.tag);
    if (initialFilters.status !== undefined) setSelectedStatus(initialFilters.status);
    if (initialFilters.aeiou !== undefined) setSelectedAeiou(initialFilters.aeiou);
    if (initialFilters.severity !== undefined) setSelectedSeverity(initialFilters.severity);
    if (initialFilters.setting !== undefined) setSelectedSetting(initialFilters.setting);
  }, [initialFilters]);

  const handleDeleteObservation = async (obsId: string) => {
    if (!user) {
      onOpenAuth();
      return;
    }
    setDeletingId(obsId);
    try {
      await deleteDoc(doc(db, 'observations', obsId));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to delete observation:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleComments = (id: string) => {
    setOpenComments((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyObservation = (obs: ObservationDoc) => {
    const textToCopy = `[Ob/Gyn Friction Point - Group ${obs.group}]
Date: ${obs.date} | Location: ${obs.setting}
Roles: ${obs.roles}
Lens: ${obs.aeiou} | Severity: ${obs.severity} | Frequency: ${obs.frequency}
Observation: ${obs.observation}
${obs.description ? `Detail: ${obs.description}\n` : ''}${obs.quote ? `Quote: "${obs.quote}"\n` : ''}Tags: ${obs.tags.join(', ')}`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedId(obs.id || 'copied');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleStatusChange = async (obsId: string, newStatus: ObservationStatus) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    setStatusUpdateLoading((prev) => ({ ...prev, [obsId]: true }));
    try {
      const docRef = doc(db, 'observations', obsId);
      await updateDoc(docRef, {
        status: newStatus,
        statusUpdatedAt: serverTimestamp(),
        statusUpdatedBy: user.uid,
      });
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setStatusUpdateLoading((prev) => ({ ...prev, [obsId]: false }));
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedGroup('ALL');
    setSelectedTag('ALL');
    setSelectedStatus('ALL');
    setSelectedAeiou('ALL');
    setSelectedSeverity('ALL');
    setSelectedSetting('ALL');
    setStartDate('');
    setEndDate('');
  };

  // Distinct dates with logged observations
  const observationDates = useMemo(() => {
    return Array.from(new Set(observations.map((o) => o.date).filter(Boolean)));
  }, [observations]);

  // Filter observations client-side
  const filteredObservations = useMemo(() => {
    return observations.filter((obs) => {
      // Group filter
      if (selectedGroup !== 'ALL' && obs.group !== selectedGroup) return false;

      // Status filter
      if (selectedStatus !== 'ALL' && obs.status !== selectedStatus) return false;

      // AEIOU filter
      if (selectedAeiou !== 'ALL' && obs.aeiou !== selectedAeiou) return false;

      // Severity filter
      if (selectedSeverity !== 'ALL' && obs.severity !== selectedSeverity) return false;

      // Setting filter
      if (selectedSetting !== 'ALL' && obs.setting !== selectedSetting) return false;

      // Tag filter
      if (selectedTag !== 'ALL' && !obs.tags.includes(selectedTag as TagType)) return false;

      // Date range filter
      if (startDate && obs.date < startDate) return false;
      if (endDate && obs.date > endDate) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const obsText = (obs.observation || '').toLowerCase();
        const descText = (obs.description || '').toLowerCase();
        const settingText = (obs.setting || '').toLowerCase();
        const rolesText = (obs.roles || '').toLowerCase();
        const tagsJoined = (obs.tags || []).join(' ').toLowerCase();
        const quoteText = (obs.quote || '').toLowerCase();
        const aeiouDetailsJoined = [
          obs.aeiouDetails?.activities || '',
          obs.aeiouDetails?.environment || '',
          obs.aeiouDetails?.interactions || '',
          obs.aeiouDetails?.objects || '',
          obs.aeiouDetails?.users || '',
        ].join(' ').toLowerCase();

        const matches =
          obsText.includes(query) ||
          descText.includes(query) ||
          settingText.includes(query) ||
          rolesText.includes(query) ||
          tagsJoined.includes(query) ||
          quoteText.includes(query) ||
          aeiouDetailsJoined.includes(query);

        if (!matches) return false;
      }

      return true;
    });
  }, [
    observations,
    selectedGroup,
    selectedTag,
    selectedStatus,
    selectedAeiou,
    selectedSeverity,
    selectedSetting,
    startDate,
    endDate,
    searchTerm,
  ]);

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedGroup !== 'ALL' ||
    selectedTag !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedAeiou !== 'ALL' ||
    selectedSeverity !== 'ALL' ||
    selectedSetting !== 'ALL' ||
    startDate !== '' ||
    endDate !== '';

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Header & Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
              Team Observation Log
            </span>
            <span className="text-xs text-slate-500">Live Real-Time Sync</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            Clinical Observations & Friction Points
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Reviewing and validating recorded friction points across all 5 internship groups (A–E).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAeiouHelp}
            className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            AEIOU Reference
          </button>
        </div>
      </div>

      {/* Search & Filter Control Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search observations, descriptions, roles, settings, or quotes..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 outline-hidden"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          {/* Group Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Group
            </label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-hidden font-medium"
            >
              <option value="ALL">All Groups (A–E)</option>
              <option value="A">Group A</option>
              <option value="B">Group B</option>
              <option value="C">Group C</option>
              <option value="D">Group D</option>
              <option value="E">Group E</option>
            </select>
          </div>

          {/* AEIOU Lens */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              AEIOU Lens
            </label>
            <select
              value={selectedAeiou}
              onChange={(e) => setSelectedAeiou(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-hidden font-medium"
            >
              <option value="ALL">All AEIOU Lenses</option>
              {(Object.keys(AEIOU_DEFINITIONS) as AeiouCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {AEIOU_DEFINITIONS[cat].letter} — {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-hidden font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="New">New</option>
              <option value="Discussed">Discussed</option>
              <option value="Validated">Validated</option>
              <option value="Prioritized">Prioritized</option>
              <option value="Discarded">Discarded</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Severity
            </label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-hidden font-medium"
            >
              <option value="ALL">All Severities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Tag Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Category Tag
            </label>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-hidden font-medium"
            >
              <option value="ALL">All Tags</option>
              {FIXED_TAGS.map((t) => (
                <option key={t} value={t}>
                  {TAG_LABELS[t].label}
                </option>
              ))}
            </select>
          </div>

          {/* Setting Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Setting
            </label>
            <select
              value={selectedSetting}
              onChange={(e) => setSelectedSetting(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-hidden font-medium truncate"
            >
              <option value="ALL">All Settings</option>
              {CLINICAL_SETTINGS.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/ \(.*\)/, '')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range Sub-Bar with Interactive Calendar Picker */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              <span>Date Range:</span>
            </span>

            {/* Interactive Calendar Date Range Picker Popover */}
            <CalendarDateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
              observationDates={observationDates}
            />

            {/* Optional manual date inputs fallback */}
            <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
              <span className="text-[11px]">(or type:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md outline-hidden text-[11px] text-slate-700 dark:text-slate-300 font-medium"
                title="From date"
              />
              <span className="text-[11px]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md outline-hidden text-[11px] text-slate-700 dark:text-slate-300 font-medium"
                title="To date"
              />
              <span className="text-[11px]">)</span>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-sky-600 hover:text-sky-800 dark:text-sky-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <span className="font-semibold text-slate-400">Active filters:</span>
            {selectedGroup !== 'ALL' && (
              <span className="px-2 py-0.5 bg-slate-900 text-white rounded-md flex items-center gap-1">
                Group: {selectedGroup}
                <button type="button" onClick={() => setSelectedGroup('ALL')} className="hover:opacity-75"><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedAeiou !== 'ALL' && (
              <span className="px-2 py-0.5 bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 rounded-md flex items-center gap-1 border border-sky-300 dark:border-sky-800">
                Lens: {selectedAeiou}
                <button type="button" onClick={() => setSelectedAeiou('ALL')} className="hover:opacity-75"><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedStatus !== 'ALL' && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 rounded-md flex items-center gap-1 border border-purple-300 dark:border-purple-800">
                Status: {selectedStatus}
                <button type="button" onClick={() => setSelectedStatus('ALL')} className="hover:opacity-75"><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedSeverity !== 'ALL' && (
              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 rounded-md flex items-center gap-1 border border-rose-300 dark:border-rose-800">
                Severity: {selectedSeverity}
                <button type="button" onClick={() => setSelectedSeverity('ALL')} className="hover:opacity-75"><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedTag !== 'ALL' && (
              <span className="px-2 py-0.5 bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 rounded-md flex items-center gap-1 border border-teal-300 dark:border-teal-800">
                Tag: {selectedTag}
                <button type="button" onClick={() => setSelectedTag('ALL')} className="hover:opacity-75"><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedSetting !== 'ALL' && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded-md flex items-center gap-1 border border-blue-300 dark:border-blue-800">
                Setting: {selectedSetting.replace(/ \(.*\)/, '')}
                <button type="button" onClick={() => setSelectedSetting('ALL')} className="hover:opacity-75"><X className="w-3 h-3" /></button>
              </span>
            )}
            {(startDate || endDate) && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-md flex items-center gap-1 border border-amber-300 dark:border-amber-800">
                Date: {startDate || '...'} to {endDate || '...'}
                <button type="button" onClick={() => { setStartDate(''); setEndDate(''); }} className="hover:opacity-75"><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results Header Count */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
        <span>
          Showing <strong>{filteredObservations.length}</strong> of{' '}
          <strong>{observations.length}</strong> observations
        </span>
        <span>Organized by newest shadowing session</span>
      </div>

      {/* Observation List */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500">
          <div className="inline-block animate-spin w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full mb-2"></div>
          <p className="text-sm font-medium">Loading clinical observations from Firestore...</p>
        </div>
      ) : filteredObservations.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="inline-flex p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {observations.length === 0 ? 'No observations logged yet' : 'No observations match your filters'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {observations.length === 0
              ? 'Start by switching to the "Log Entry" tab to record friction points from your Ob/Gyn shadowing round.'
              : 'Try clearing some of your filter criteria or search keyword to see more results.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredObservations.map((obs) => {
            const aeiouDef = AEIOU_DEFINITIONS[obs.aeiou] || AEIOU_DEFINITIONS.Activities;
            const statusMeta = STATUS_CONFIG[obs.status] || STATUS_CONFIG.New;
            const sevMeta = SEVERITY_CONFIG[obs.severity] || SEVERITY_CONFIG.Medium;
            const isCommentsOpen = !!openComments[obs.id || ''];
            const isUpdating = !!statusUpdateLoading[obs.id || ''];

            return (
              <div
                key={obs.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-xs transition space-y-4"
              >
                {/* Top Metadata Row */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Group Badge */}
                    <span className="px-2.5 py-1 rounded-lg font-black text-xs bg-slate-900 text-white dark:bg-sky-600 shadow-2xs">
                      Group {obs.group}
                    </span>

                    {/* Date */}
                    <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {obs.date}
                    </span>

                    {/* AEIOU Lens Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${aeiouDef.bgBadge}`}
                    >
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: aeiouDef.dotColor }}
                      ></span>
                      <span>Lens: {obs.aeiou}</span>
                    </span>

                    {/* Severity Pill */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${sevMeta.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sevMeta.dot}`}></span>
                      <span>{obs.severity}</span>
                    </span>

                    {/* Frequency */}
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-medium">
                      {obs.frequency}
                    </span>
                  </div>

                  {/* Status Dropdown with Live Firestore Update */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400">Status:</span>
                    <select
                      value={obs.status}
                      disabled={isUpdating}
                      onChange={(e) => handleStatusChange(obs.id!, e.target.value as ObservationStatus)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg border cursor-pointer outline-hidden ${statusMeta.badge} disabled:opacity-50`}
                      title="Update validation status of this friction point"
                    >
                      {(['New', 'Discussed', 'Validated', 'Prioritized', 'Discarded'] as ObservationStatus[]).map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Primary Observation Text */}
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    <HighlightedText text={obs.observation} highlight={searchTerm} />
                  </h3>

                  {/* Description if present */}
                  {obs.description && (
                    <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <HighlightedText text={obs.description} highlight={searchTerm} />
                    </p>
                  )}

                  {/* Anonymized Quote if present */}
                  {obs.quote && (
                    <div className="mt-2.5 flex items-start gap-2.5 p-3 bg-amber-50/60 dark:bg-amber-950/20 border-l-4 border-amber-400 rounded-r-xl text-xs sm:text-sm italic text-amber-900 dark:text-amber-200">
                      <Quote className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>"<HighlightedText text={obs.quote} highlight={searchTerm} />"</span>
                    </div>
                  )}
                </div>

                {/* Setting & Roles Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-slate-300">Setting:</span>
                    <span className="truncate">
                      <HighlightedText text={obs.setting} highlight={searchTerm} />
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-slate-300">Roles:</span>
                    <span className="truncate">
                      <HighlightedText text={obs.roles} highlight={searchTerm} />
                    </span>
                  </div>
                </div>

                {/* AEIOU Inputs Breakdown if filled */}
                {obs.aeiouDetails && Object.values(obs.aeiouDetails).some((val) => val && val.trim()) && (
                  <div className="bg-slate-50/90 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-sky-600" />
                      <span>AEIOU Observational Inputs</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      {obs.aeiouDetails.activities && (
                        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                          <span className="font-bold text-sky-600 dark:text-sky-400 mr-1.5">[A - Activities]:</span>
                          <span className="text-slate-700 dark:text-slate-300">
                            <HighlightedText text={obs.aeiouDetails.activities} highlight={searchTerm} />
                          </span>
                        </div>
                      )}
                      {obs.aeiouDetails.environment && (
                        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 mr-1.5">[E - Environment]:</span>
                          <span className="text-slate-700 dark:text-slate-300">
                            <HighlightedText text={obs.aeiouDetails.environment} highlight={searchTerm} />
                          </span>
                        </div>
                      )}
                      {obs.aeiouDetails.interactions && (
                        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                          <span className="font-bold text-violet-600 dark:text-violet-400 mr-1.5">[I - Interactions]:</span>
                          <span className="text-slate-700 dark:text-slate-300">
                            <HighlightedText text={obs.aeiouDetails.interactions} highlight={searchTerm} />
                          </span>
                        </div>
                      )}
                      {obs.aeiouDetails.objects && (
                        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                          <span className="font-bold text-amber-600 dark:text-amber-400 mr-1.5">[O - Objects]:</span>
                          <span className="text-slate-700 dark:text-slate-300">
                            <HighlightedText text={obs.aeiouDetails.objects} highlight={searchTerm} />
                          </span>
                        </div>
                      )}
                      {obs.aeiouDetails.users && (
                        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                          <span className="font-bold text-pink-600 dark:text-pink-400 mr-1.5">[U - Users]:</span>
                          <span className="text-slate-700 dark:text-slate-300">
                            <HighlightedText text={obs.aeiouDetails.users} highlight={searchTerm} />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tags */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {obs.tags.map((tag) => {
                    const meta = TAG_LABELS[tag];
                    return (
                      <span
                        key={tag}
                        className={`text-[11px] px-2 py-0.5 rounded-md font-medium border ${meta?.color || 'bg-slate-100 text-slate-700'}`}
                      >
                        #{meta?.label || tag}
                      </span>
                    );
                  })}
                </div>

                {/* Bottom Footer: Author attribution, copy note, subcollection comment toggle */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>
                      Logged by: <strong className="text-slate-600 dark:text-slate-300">{obs.creatorName || obs.creatorEmail?.split('@')[0] || 'Intern'}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Delete Observation Button (with confirm state) */}
                    {deleteConfirmId === obs.id ? (
                      <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 p-1 rounded-lg border border-rose-200 dark:border-rose-800 animate-in fade-in">
                        <span className="text-[10px] text-rose-700 dark:text-rose-300 font-bold px-1">Delete?</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteObservation(obs.id!)}
                          disabled={deletingId === obs.id}
                          className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                        >
                          {deletingId === obs.id ? '...' : 'Yes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-1.5 py-0.5 text-slate-500 hover:text-slate-800 text-[10px] font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      user && (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(obs.id!)}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Delete this observation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      onClick={() => handleCopyObservation(obs)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                      title="Copy formatted observation note to clipboard"
                    >
                      {copiedId === obs.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => toggleComments(obs.id!)}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-lg transition cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{isCommentsOpen ? 'Hide Debrief' : 'Debrief / Comments'}</span>
                    </button>
                  </div>
                </div>

                {/* Real-time Subcollection Comment Thread */}
                {isCommentsOpen && (
                  <CommentSection
                    observationId={obs.id!}
                    user={user}
                    onOpenAuth={onOpenAuth}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
