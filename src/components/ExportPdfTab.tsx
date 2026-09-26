import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { ObservationDoc, GroupId } from '../types';
import {
  FileDown,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Printer,
  FileText,
  ShieldAlert,
  Building,
  Users,
} from 'lucide-react';
import { AEIOU_DEFINITIONS, TEAM_GROUPS, TAG_LABELS, CLINICAL_PRIVACY_DISCLAIMER } from '../constants';

interface ExportPdfTabProps {
  observations: ObservationDoc[];
}

export const ExportPdfTab: React.FC<ExportPdfTabProps> = ({ observations }) => {
  // Available dates sorted newest first
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    observations.forEach((o) => {
      if (o.date) set.add(o.date);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [observations]);

  // Selected date defaults to latest or today
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return availableDates[0] || new Date().toISOString().split('T')[0];
  });

  const [generating, setGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [csvSuccess, setCsvSuccess] = useState(false);

  // Observations for chosen date
  const dateObservations = useMemo(() => {
    return observations.filter((o) => o.date === selectedDate);
  }, [observations, selectedDate]);

  // Export CSV
  const handleExportCsv = () => {
    if (dateObservations.length === 0) return;
    const headers = [
      'Date',
      'Group',
      'Clinical Setting',
      'Roles Involved',
      'Friction Point / Observation',
      'Description Context',
      'Anonymized Quote',
      'AEIOU Lens',
      'Severity',
      'Frequency',
      'Category Tags',
      'Status',
      'Logged By',
    ];

    const escapeCsv = (val: string) => {
      if (!val) return '""';
      const clean = String(val).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = dateObservations.map((o) => [
      escapeCsv(o.date),
      escapeCsv(o.group),
      escapeCsv(o.setting),
      escapeCsv(o.roles),
      escapeCsv(o.observation),
      escapeCsv(o.description),
      escapeCsv(o.quote),
      escapeCsv(o.aeiou),
      escapeCsv(o.severity),
      escapeCsv(o.frequency),
      escapeCsv(o.tags.join('; ')),
      escapeCsv(o.status),
      escapeCsv(o.creatorName || o.creatorEmail || 'Intern'),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `obgyn_friction_log_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setCsvSuccess(true);
    setTimeout(() => setCsvSuccess(false), 3000);
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Grouped by Group A-E
  const groupedObservations = useMemo(() => {
    const map: Record<GroupId, ObservationDoc[]> = {
      A: [],
      B: [],
      C: [],
      D: [],
      E: [],
    };
    dateObservations.forEach((obs) => {
      if (map[obs.group]) {
        map[obs.group].push(obs);
      }
    });
    return map;
  }, [dateObservations]);

  // Generate PDF via jsPDF
  const handleGeneratePdf = () => {
    if (dateObservations.length === 0) return;
    setGenerating(true);
    setDownloadSuccess(false);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const primaryColor = [14, 116, 144]; // cyan-700
      const slateDark = [30, 41, 59]; // slate-800
      const slateMuted = [100, 116, 139]; // slate-500

      // Helper to add footer to all pages at end
      const addPageFooters = () => {
        const totalPages = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(140, 140, 140);
          doc.setDrawColor(220, 220, 220);
          doc.line(margin, pageHeight - 32, pageWidth - margin, pageHeight - 32);

          // Strictly required footer text
          doc.text(
            'Contains anonymized student observations. Do not add patient-identifying information.',
            margin,
            pageHeight - 20
          );
          doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
        }
      };

      const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - 50) {
          doc.addPage();
          y = margin;
        }
      };

      // Title Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.roundedRect(margin, y, contentWidth, 54, 4, 4, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Ob/Gyn Shadowing Observation Log', margin + 14, y + 22);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225);
      doc.text(
        `Clinical Internship Daily Summary • Date: ${selectedDate} • Total Observations: ${dateObservations.length}`,
        margin + 14,
        y + 40
      );

      y += 66;

      // Privacy Protocol Notice Header Box
      doc.setFillColor(254, 243, 199); // amber-100
      doc.setDrawColor(251, 191, 36); // amber-400
      doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');
      doc.setTextColor(146, 64, 14); // amber-800
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(
        'CLINICAL PRIVACY: Anonymized student notes. Strictly role-based observations with zero patient identifiers.',
        margin + 8,
        y + 15
      );

      y += 32;

      // Iterate through Groups A–E
      const groups: GroupId[] = ['A', 'B', 'C', 'D', 'E'];
      let totalGroupsWithData = 0;

      groups.forEach((grp) => {
        const obsList = groupedObservations[grp];
        if (obsList.length === 0) return;
        totalGroupsWithData++;

        checkPageBreak(50);

        // Group Header
        doc.setFillColor(241, 245, 249); // slate-100
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(`GROUP ${grp} — ${TEAM_GROUPS[grp].name} (${obsList.length} observation${obsList.length > 1 ? 's' : ''})`, margin + 10, y + 16);

        y += 32;

        // Observations under this group
        obsList.forEach((obs, index) => {
          checkPageBreak(90);

          // Observation card container
          const startCardY = y;

          // Header line: Number & AEIOU Lens & Severity
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(14, 116, 144);
          doc.text(`Observation #${index + 1}  •  AEIOU Lens: [${obs.aeiou}]`, margin + 4, y);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(`Severity: ${obs.severity}  |  Frequency: ${obs.frequency}  |  Status: ${obs.status}`, pageWidth - margin - 4, y, { align: 'right' });

          y += 13;

          // Clinical Setting & Roles
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          doc.text(`Setting: `, margin + 4, y);
          doc.setFont('helvetica', 'normal');
          doc.text(`${obs.setting}`, margin + 40, y);

          doc.setFont('helvetica', 'bold');
          doc.text(`Roles: `, margin + 220, y);
          doc.setFont('helvetica', 'normal');
          doc.text(`${obs.roles}`, margin + 252, y);

          y += 14;

          // What was noticed (Required Observation Text)
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(30, 41, 59);
          doc.text(`What Was Noticed / Friction Point:`, margin + 4, y);
          y += 11;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          const obsLines = doc.splitTextToSize(obs.observation, contentWidth - 8);
          doc.text(obsLines, margin + 4, y);
          y += obsLines.length * 11 + 3;

          // Optional Description
          if (obs.description && obs.description.trim()) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);
            const descLines = doc.splitTextToSize(`Detail: ${obs.description}`, contentWidth - 8);
            doc.text(descLines, margin + 4, y);
            y += descLines.length * 10 + 3;
          }

          // Optional Quote
          if (obs.quote && obs.quote.trim()) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            doc.setTextColor(180, 83, 9); // amber-700
            const quoteLines = doc.splitTextToSize(`"${obs.quote}"`, contentWidth - 14);
            doc.text(quoteLines, margin + 8, y);
            y += quoteLines.length * 10 + 3;
          }

          // Optional AEIOU Detailed inputs
          if (obs.aeiouDetails && Object.values(obs.aeiouDetails).some((v) => v && v.trim())) {
            checkPageBreak(40);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(14, 116, 144);
            doc.text('AEIOU Breakdown:', margin + 4, y);
            y += 9;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(51, 65, 85);
            if (obs.aeiouDetails.activities) {
              const lines = doc.splitTextToSize(`• [A - Activities]: ${obs.aeiouDetails.activities}`, contentWidth - 12);
              doc.text(lines, margin + 8, y);
              y += lines.length * 9;
            }
            if (obs.aeiouDetails.environment) {
              const lines = doc.splitTextToSize(`• [E - Environment]: ${obs.aeiouDetails.environment}`, contentWidth - 12);
              doc.text(lines, margin + 8, y);
              y += lines.length * 9;
            }
            if (obs.aeiouDetails.interactions) {
              const lines = doc.splitTextToSize(`• [I - Interactions]: ${obs.aeiouDetails.interactions}`, contentWidth - 12);
              doc.text(lines, margin + 8, y);
              y += lines.length * 9;
            }
            if (obs.aeiouDetails.objects) {
              const lines = doc.splitTextToSize(`• [O - Objects]: ${obs.aeiouDetails.objects}`, contentWidth - 12);
              doc.text(lines, margin + 8, y);
              y += lines.length * 9;
            }
            if (obs.aeiouDetails.users) {
              const lines = doc.splitTextToSize(`• [U - Users]: ${obs.aeiouDetails.users}`, contentWidth - 12);
              doc.text(lines, margin + 8, y);
              y += lines.length * 9;
            }
            y += 2;
          }

          // Tags
          if (obs.tags && obs.tags.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            const tagString = obs.tags.map((t) => `#${t}`).join(', ');
            doc.text(`Tags: ${tagString}`, margin + 4, y);
            y += 10;
          }

          // Separator
          y += 6;
          doc.setDrawColor(226, 232, 240);
          doc.line(margin + 4, y, pageWidth - margin - 4, y);
          y += 12;
        });

        y += 10;
      });

      // Add footers on all generated pages
      addPageFooters();

      // Save PDF to user device
      doc.save(`ObGyn_Shadowing_Log_${selectedDate}.pdf`);
      setDownloadSuccess(true);
    } catch (err) {
      console.error('PDF Generation Error:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                PDF Export
              </span>
              <span className="text-xs text-slate-500">Client-Side jsPDF Generator</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              Export Daily Ob/Gyn Observations PDF
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Select a shadowing session date to compile and download a formatted report grouped by Group A–E with full AEIOU classifications.
            </p>
          </div>

          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0 self-start sm:self-center">
            <Printer className="w-6 h-6" />
          </div>
        </div>

        {/* Export Privacy Notice */}
        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
          <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-800 dark:text-slate-200">Compliance & Clean Export: </strong>
            Firestore internal document IDs and database keys are stripped from the export. The required clinical anonymization notice is stamped on every page footer.
          </div>
        </div>
      </div>

      {/* Date Picker & Action Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Shadowing Session Date
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setDownloadSuccess(false);
                }}
                className="w-full sm:w-64 px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 outline-hidden font-medium"
              />

              {availableDates.length > 0 && (
                <select
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setDownloadSuccess(false);
                  }}
                  className="hidden md:block px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-hidden"
                >
                  <option value="" disabled>Or pick existing date...</option>
                  {availableDates.map((d) => (
                    <option key={d} value={d}>
                      {d} ({observations.filter((o) => o.date === d).length} items)
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* CSV Download Button */}
            <button
              onClick={handleExportCsv}
              disabled={dateObservations.length === 0}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
              title="Download observations as CSV spreadsheet"
            >
              <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Export CSV</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              disabled={dateObservations.length === 0}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
              title="Print report or save via browser PDF printer"
            >
              <Printer className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Print</span>
            </button>

            {/* Formal PDF Generation Button */}
            <button
              onClick={handleGeneratePdf}
              disabled={generating || dateObservations.length === 0}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-md cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>
                {generating
                  ? 'Compiling PDF...'
                  : `Download PDF (${dateObservations.length} Items)`}
              </span>
            </button>
          </div>
        </div>

        {csvSuccess && (
          <div className="p-3.5 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl flex items-center gap-2.5 text-xs text-teal-800 dark:text-teal-300 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            <span>CSV spreadsheet successfully exported to your downloads!</span>
          </div>
        )}

        {downloadSuccess && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>PDF successfully compiled and downloaded to your device!</span>
          </div>
        )}
      </div>

      {/* Date Preview Content */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-600" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Document Preview for {selectedDate}
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {dateObservations.length} observations found
          </span>
        </div>

        {dateObservations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500 space-y-2">
            <Calendar className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-xs">
              No observations logged on <strong>{selectedDate}</strong>.
            </p>
            <p className="text-[11px]">
              Select a date with logged entries, or switch to the Log Entry tab to submit observations for this day.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {(['A', 'B', 'C', 'D', 'E'] as GroupId[]).map((grp) => {
              const grpList = groupedObservations[grp];
              if (grpList.length === 0) return null;

              return (
                <div key={grp} className="space-y-3">
                  {/* Group header in preview */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                        {grp}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Group {grp} — {TEAM_GROUPS[grp].name}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {grpList.length} items
                    </span>
                  </div>

                  {/* Observations list */}
                  <div className="space-y-2 pl-2">
                    {grpList.map((obs, idx) => {
                      const aeiouDef = AEIOU_DEFINITIONS[obs.aeiou];
                      return (
                        <div
                          key={obs.id || idx}
                          className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sky-700 dark:text-sky-300">
                                #{idx + 1}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${aeiouDef.bgBadge}`}>
                                {obs.aeiou}
                              </span>
                              <span className="text-slate-400">|</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {obs.severity} Sev
                              </span>
                              <span className="text-slate-400">|</span>
                              <span className="text-slate-500">{obs.frequency}</span>
                            </div>

                            <span className="text-[11px] font-semibold text-slate-500">
                              Status: {obs.status}
                            </span>
                          </div>

                          <p className="font-bold text-slate-900 dark:text-white">
                            {obs.observation}
                          </p>

                          {obs.description && (
                            <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                              {obs.description}
                            </p>
                          )}

                          {/* AEIOU details in preview if present */}
                          {obs.aeiouDetails && Object.values(obs.aeiouDetails).some((val) => val && val.trim()) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[10px]">
                              {obs.aeiouDetails.activities && (
                                <div className="p-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200/60 dark:border-slate-800">
                                  <span className="font-bold text-sky-600 mr-1">[A - Activities]:</span>
                                  <span className="text-slate-600 dark:text-slate-400">{obs.aeiouDetails.activities}</span>
                                </div>
                              )}
                              {obs.aeiouDetails.environment && (
                                <div className="p-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200/60 dark:border-slate-800">
                                  <span className="font-bold text-emerald-600 mr-1">[E - Environment]:</span>
                                  <span className="text-slate-600 dark:text-slate-400">{obs.aeiouDetails.environment}</span>
                                </div>
                              )}
                              {obs.aeiouDetails.interactions && (
                                <div className="p-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200/60 dark:border-slate-800">
                                  <span className="font-bold text-violet-600 mr-1">[I - Interactions]:</span>
                                  <span className="text-slate-600 dark:text-slate-400">{obs.aeiouDetails.interactions}</span>
                                </div>
                              )}
                              {obs.aeiouDetails.objects && (
                                <div className="p-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200/60 dark:border-slate-800">
                                  <span className="font-bold text-amber-600 mr-1">[O - Objects]:</span>
                                  <span className="text-slate-600 dark:text-slate-400">{obs.aeiouDetails.objects}</span>
                                </div>
                              )}
                              {obs.aeiouDetails.users && (
                                <div className="p-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200/60 dark:border-slate-800">
                                  <span className="font-bold text-pink-600 mr-1">[U - Users]:</span>
                                  <span className="text-slate-600 dark:text-slate-400">{obs.aeiouDetails.users}</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 pt-1">
                            <span>Setting: {obs.setting}</span>
                            <span>•</span>
                            <span>Roles: {obs.roles}</span>
                            <span>•</span>
                            <span>Tags: {obs.tags.join(', ')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
