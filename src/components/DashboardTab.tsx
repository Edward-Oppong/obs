import React, { useMemo, useState } from 'react';
import { ObservationDoc, AeiouCategory, GroupId, TagType } from '../types';
import {
  FIXED_TAGS,
  TAG_LABELS,
  AEIOU_DEFINITIONS,
  TEAM_GROUPS,
} from '../constants';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Compass,
  Users,
  Tag,
  Lightbulb,
  Building,
  Star,
  Activity,
  Sparkles,
  Wand2,
  Copy,
  Check,
  FileText,
  Target,
} from 'lucide-react';

interface DashboardTabProps {
  observations: ObservationDoc[];
  onOpenAeiouHelp: () => void;
  onSelectFilter?: (filterType: string, val: string) => void;
}

interface ShiftDebriefData {
  shiftOverview: string;
  topBottlenecks: Array<{
    title: string;
    lens: AeiouCategory;
    severity: string;
    rootCause: string;
    impact: string;
  }>;
  qiRecommendations: Array<{
    proposal: string;
    stakeholders: string;
    feasibility: string;
  }>;
  aeiouCoaching: string;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  observations,
  onOpenAeiouHelp,
  onSelectFilter,
}) => {
  // State for AI Debrief & QI Synthesis
  const [isGeneratingDebrief, setIsGeneratingDebrief] = useState(false);
  const [debriefData, setDebriefData] = useState<ShiftDebriefData | null>(null);
  const [debriefError, setDebriefError] = useState<string | null>(null);
  const [copiedDebrief, setCopiedDebrief] = useState(false);

  // Compute summary stats client-side
  const stats = useMemo(() => {
    const total = observations.length;
    let newCount = 0;
    let discussedCount = 0;
    let validatedCount = 0;
    let prioritizedCount = 0;
    let discardedCount = 0;
    let highCount = 0;
    let medCount = 0;
    let lowCount = 0;

    // AEIOU counts
    const aeiouCounts: Record<AeiouCategory, number> = {
      Activities: 0,
      Environment: 0,
      Interactions: 0,
      Objects: 0,
      Users: 0,
    };

    // Group counts
    const groupCounts: Record<GroupId, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      E: 0,
    };

    // Tag counts
    const tagCounts: Record<TagType, number> = {
      workflow: 0,
      equipment: 0,
      documentation: 0,
      communication: 0,
      'patient-experience': 0,
      staffing: 0,
      'infection-control': 0,
      'cost-resources': 0,
      safety: 0,
    };

    // Setting counts
    const settingCounts: Record<string, number> = {};

    observations.forEach((obs) => {
      // Status
      if (obs.status === 'New') newCount++;
      else if (obs.status === 'Discussed') discussedCount++;
      else if (obs.status === 'Validated') validatedCount++;
      else if (obs.status === 'Prioritized') prioritizedCount++;
      else if (obs.status === 'Discarded') discardedCount++;

      // Severity
      if (obs.severity === 'High') highCount++;
      else if (obs.severity === 'Medium') medCount++;
      else if (obs.severity === 'Low') lowCount++;

      // AEIOU
      if (aeiouCounts[obs.aeiou] !== undefined) {
        aeiouCounts[obs.aeiou]++;
      }

      // Group
      if (groupCounts[obs.group] !== undefined) {
        groupCounts[obs.group]++;
      }

      // Tags
      obs.tags?.forEach((t) => {
        if (tagCounts[t] !== undefined) {
          tagCounts[t]++;
        }
      });

      // Settings
      if (obs.setting) {
        settingCounts[obs.setting] = (settingCounts[obs.setting] || 0) + 1;
      }
    });

    return {
      total,
      newCount,
      discussedCount,
      validatedCount,
      prioritizedCount,
      discardedCount,
      highCount,
      medCount,
      lowCount,
      aeiouCounts,
      groupCounts,
      tagCounts,
      settingCounts,
    };
  }, [observations]);

  // Max counts for relative bar scaling
  const maxAeiou = Math.max(...Object.values(stats.aeiouCounts), 1);
  const maxGroup = Math.max(...Object.values(stats.groupCounts), 1);
  const maxTag = Math.max(...Object.values(stats.tagCounts), 1);

  // Identify AEIOU blindness/skew
  const leastObservedAeiou = useMemo(() => {
    if (stats.total === 0) return null;
    const sorted = (Object.keys(stats.aeiouCounts) as AeiouCategory[]).sort(
      (a, b) => stats.aeiouCounts[a] - stats.aeiouCounts[b]
    );
    return sorted[0];
  }, [stats]);

  const handleGenerateDebrief = async () => {
    if (observations.length === 0) {
      setDebriefError('No observations logged yet. Log clinical observations to generate an AI shift debrief.');
      return;
    }
    setIsGeneratingDebrief(true);
    setDebriefError(null);
    try {
      const res = await fetch('/api/generate-shift-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observations }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate AI shift debrief.');
      }
      const data = await res.json();
      setDebriefData(data);
    } catch (err: any) {
      console.error('Debrief error:', err);
      setDebriefError(err.message || 'Could not generate AI shift debrief.');
    } finally {
      setIsGeneratingDebrief(false);
    }
  };

  const handleCopyDebrief = () => {
    if (!debriefData) return;
    const text = `OB/GYN CLINICAL ROTATION SHIFT DEBRIEF
Generated via Gemini AI Systems Analysis

SHIFT OVERVIEW:
${debriefData.shiftOverview}

TOP BOTTLENECKS:
${debriefData.topBottlenecks.map((b, i) => `${i + 1}. [${b.lens.toUpperCase()}] ${b.title} (${b.severity} Severity)\n   Root Cause: ${b.rootCause}\n   Impact: ${b.impact}`).join('\n\n')}

QUALITY IMPROVEMENT (QI) PROPOSALS:
${debriefData.qiRecommendations.map((q, i) => `${i + 1}. Proposal: ${q.proposal}\n   Stakeholders: ${q.stakeholders}\n   Feasibility: ${q.feasibility}`).join('\n\n')}

STUDENT AEIOU COACHING:
${debriefData.aeiouCoaching}`;

    navigator.clipboard.writeText(text);
    setCopiedDebrief(true);
    setTimeout(() => setCopiedDebrief(false), 2500);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                Internship Analytics
              </span>
              <span className="text-xs text-slate-500">Live Client-Side Aggregation</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              Shadowing Observations Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Synthesis of friction points across AEIOU dimensions, student internship groups, and clinical domains.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <button
              onClick={handleGenerateDebrief}
              disabled={isGeneratingDebrief}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isGeneratingDebrief ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating AI Debrief...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generate AI Shift Debrief</span>
                </>
              )}
            </button>

            <button
              onClick={onOpenAeiouHelp}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 rounded-xl transition cursor-pointer"
            >
              <Compass className="w-4 h-4 text-sky-600" />
              <span>AEIOU Guide</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Shift Debrief & QI Synthesis Panel */}
      {debriefError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center justify-between text-xs text-rose-800 dark:text-rose-300">
          <span>{debriefError}</span>
          <button onClick={() => setDebriefError(null)} className="font-bold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {debriefData && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 border border-indigo-500/30 shadow-xl space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-800/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-400/30 text-indigo-300">
                <Wand2 className="w-6 h-6 text-indigo-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold">
                    AI Clinical Ethnography & Shift Debrief
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-500/30 text-indigo-200 rounded-full border border-indigo-400/30 uppercase tracking-wider">
                    Gemini Systems Analysis
                  </span>
                </div>
                <p className="text-xs text-indigo-200/80 mt-0.5">
                  Automated synthesis of departmental friction points and quality improvement opportunities.
                </p>
              </div>
            </div>

            <button
              onClick={handleCopyDebrief}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 transition cursor-pointer self-start sm:self-center"
            >
              {copiedDebrief ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied Debrief!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy for Morning Rounds</span>
                </>
              )}
            </button>
          </div>

          {/* Shift Overview */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 block mb-1">
              Cross-Ward Ethnographic Overview:
            </span>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
              {debriefData.shiftOverview}
            </p>
          </div>

          {/* Top Bottlenecks Grid */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-3 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-amber-400" />
              <span>Top Systemic Friction Bottlenecks Identified</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {debriefData.topBottlenecks.map((bottleneck, i) => (
                <div
                  key={i}
                  className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 hover:bg-white/10 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">
                      {bottleneck.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        bottleneck.severity === 'High'
                          ? 'bg-rose-500/30 text-rose-200 border border-rose-400/30'
                          : 'bg-amber-500/30 text-amber-200 border border-amber-400/30'
                      }`}
                    >
                      {bottleneck.lens} • {bottleneck.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    <span className="text-slate-400 font-semibold">Root Cause: </span>
                    {bottleneck.rootCause}
                  </p>
                  <p className="text-xs text-slate-300">
                    <span className="text-slate-400 font-semibold">Impact: </span>
                    {bottleneck.impact}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Actionable QI Recommendations */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Recommended Quality Improvement (QI) Actions</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {debriefData.qiRecommendations.map((rec, i) => (
                <div
                  key={i}
                  className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-200">
                      Recommendation #{i + 1}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-400/20">
                      {rec.feasibility}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium">
                    {rec.proposal}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    <span className="text-emerald-400/80 font-bold">Champions: </span>
                    {rec.stakeholders}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Coaching Advice for Interns */}
          {debriefData.aeiouCoaching && (
            <div className="p-4 bg-sky-950/40 border border-sky-500/30 rounded-2xl flex items-start gap-3 text-xs text-sky-200">
              <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block mb-0.5">
                  Educational AEIOU Coaching for Next Shift:
                </span>
                <span>{debriefData.aeiouCoaching}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Logged */}
        <div
          onClick={() => onSelectFilter?.('status', 'ALL')}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 hover:border-sky-400 dark:hover:border-sky-600 transition cursor-pointer group"
          title="Click to view all observations in All Entries"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">
              Total Logged
            </span>
            <Activity className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {stats.total}
          </div>
          <p className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>Across {Object.keys(stats.settingCounts).length} clinical settings</span>
            <span className="text-[10px] text-sky-600 font-bold opacity-0 group-hover:opacity-100 transition">View →</span>
          </p>
        </div>

        {/* New / Needs Follow-up */}
        <div
          onClick={() => onSelectFilter?.('status', 'New')}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 hover:border-blue-400 dark:hover:border-blue-600 transition cursor-pointer group"
          title="Click to filter by New (Need Review) observations"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              New (Need Review)
            </span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
            {stats.newCount}
          </div>
          <p className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>Awaiting student debrief rounds</span>
            <span className="text-[10px] text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition">View →</span>
          </p>
        </div>

        {/* Validated */}
        <div
          onClick={() => onSelectFilter?.('status', 'Validated')}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 hover:border-emerald-400 dark:hover:border-emerald-600 transition cursor-pointer group"
          title="Click to filter by Validated observations"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Validated
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.validatedCount}
          </div>
          <p className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>{stats.total > 0 ? Math.round((stats.validatedCount / stats.total) * 100) : 0}% of all observations</span>
            <span className="text-[10px] text-emerald-600 font-bold opacity-0 group-hover:opacity-100 transition">View →</span>
          </p>
        </div>

        {/* High Severity */}
        <div
          onClick={() => onSelectFilter?.('severity', 'High')}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 hover:border-rose-400 dark:hover:border-rose-600 transition cursor-pointer group"
          title="Click to filter by High Severity observations"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              High Severity
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
            {stats.highCount}
          </div>
          <p className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>Patient safety or acute workflow risk</span>
            <span className="text-[10px] text-rose-600 font-bold opacity-0 group-hover:opacity-100 transition">View →</span>
          </p>
        </div>
      </div>

      {/* AEIOU Breakdown Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-sky-600" />
              <span>AEIOU Observational Lens Distribution</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Checks whether your team has blind spots in noticing physical space (E) or workflows (A). Click any bar to inspect.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            5 Observational Dimensions
          </span>
        </div>

        {/* AEIOU Bars */}
        <div className="space-y-3.5">
          {(Object.keys(AEIOU_DEFINITIONS) as AeiouCategory[]).map((catKey) => {
            const def = AEIOU_DEFINITIONS[catKey];
            const count = stats.aeiouCounts[catKey];
            const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
            const barWidth = stats.total > 0 ? (count / maxAeiou) * 100 : 0;

            return (
              <div
                key={catKey}
                onClick={() => onSelectFilter?.('aeiou', catKey)}
                className="space-y-1.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer group"
                title={`Click to filter All Entries by Lens: ${def.name}`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                    <span
                      className="w-5 h-5 rounded-md inline-flex items-center justify-center font-bold text-[11px] text-white shadow-2xs"
                      style={{ backgroundColor: def.dotColor }}
                    >
                      {def.letter}
                    </span>
                    <span className="group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">{def.name}</span>
                    <span className="font-normal text-slate-400 text-[11px] hidden md:inline">
                      — {def.shortDesc}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="text-slate-900 dark:text-white font-bold">{count}</span>
                    <span className="text-slate-400 text-[11px]">({pct}%)</span>
                    <span className="text-[11px] text-sky-600 opacity-0 group-hover:opacity-100 transition font-bold">→</span>
                  </div>
                </div>

                {/* Progress bar container */}
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(barWidth, count > 0 ? 3 : 0)}%`,
                      backgroundColor: def.dotColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Observational Bias Callout Banner */}
        {leastObservedAeiou && stats.total > 2 && (
          <div className="p-3.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl flex items-start gap-2.5 text-xs text-sky-900 dark:text-sky-300">
            <Lightbulb className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Team Observation Insight: </span>
              Your lowest captured category is <strong>{leastObservedAeiou}</strong> ({stats.aeiouCounts[leastObservedAeiou]} observations). Clinical shadowing teams commonly miss physical obstacles, crowding, and subtle environmental friction. Remind your interns to observe physical layouts in the next round!
            </div>
          </div>
        )}
      </div>

      {/* Two Column Grid: Breakdown by Group & Breakdown by Tag */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Breakdown by Internship Group (A–E) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Observations by Group (A–E)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                9 students across 5 internship pairings. Click to filter.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400">9 Interns</span>
          </div>

          <div className="space-y-2">
            {(['A', 'B', 'C', 'D', 'E'] as GroupId[]).map((grp) => {
              const count = stats.groupCounts[grp];
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              const barWidth = stats.total > 0 ? (count / maxGroup) * 100 : 0;
              const meta = TEAM_GROUPS[grp];

              return (
                <div
                  key={grp}
                  onClick={() => onSelectFilter?.('group', grp)}
                  className="space-y-1 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer group"
                  title={`Click to filter All Entries by Group ${grp}`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-slate-900 text-white dark:bg-sky-600 flex items-center justify-center font-bold text-xs">
                        {grp}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                        Group {grp}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        ({meta.memberCount} {meta.memberCount === 1 ? 'intern' : 'interns'})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="text-slate-900 dark:text-white font-bold">{count}</span>
                      <span className="text-slate-400 text-[11px]">({pct}%)</span>
                      <span className="text-[11px] text-indigo-600 opacity-0 group-hover:opacity-100 transition font-bold">→</span>
                    </div>
                  </div>

                  <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(barWidth, count > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Breakdown by Category Tag */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-teal-600" />
                <span>Breakdown by Issue Taxonomy</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Fixed 9-tag clinical categorization. Click to filter.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400">9 Core Tags</span>
          </div>

          <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
            {FIXED_TAGS.map((tag) => {
              const count = stats.tagCounts[tag];
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              const barWidth = stats.total > 0 ? (count / maxTag) * 100 : 0;
              const meta = TAG_LABELS[tag];

              return (
                <div
                  key={tag}
                  onClick={() => onSelectFilter?.('tag', tag)}
                  className="space-y-1 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer group"
                  title={`Click to filter All Entries by Tag: ${meta.label}`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition">
                      {meta.label}
                    </span>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="text-slate-900 dark:text-white font-bold">{count}</span>
                      <span className="text-slate-400 text-[11px]">({pct}%)</span>
                      <span className="text-[11px] text-teal-600 opacity-0 group-hover:opacity-100 transition font-bold">→</span>
                    </div>
                  </div>

                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-600 dark:bg-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(barWidth, count > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Clinical Settings Distribution */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-sky-600" />
              <span>Observations Across Hospital Settings</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any department setting to inspect its logged observations.
            </p>
          </div>
          <span className="text-xs text-slate-400">Department Distribution</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(stats.settingCounts).map(([settingName, count]) => (
            <div
              key={settingName}
              onClick={() => onSelectFilter?.('setting', settingName)}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-sky-50 dark:hover:bg-slate-700/80 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between transition cursor-pointer group"
              title={`Click to filter All Entries by Setting: ${settingName}`}
            >
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-sky-700 dark:group-hover:text-sky-300 truncate pr-2">
                {settingName}
              </div>
              <span className="px-2 py-0.5 bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 font-bold rounded-md text-xs border border-slate-200 dark:border-slate-600 group-hover:border-sky-300">
                {count}
              </span>
            </div>
          ))}
          {Object.keys(stats.settingCounts).length === 0 && (
            <div className="col-span-3 text-xs text-slate-400 text-center py-4 italic">
              No clinical settings logged yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
