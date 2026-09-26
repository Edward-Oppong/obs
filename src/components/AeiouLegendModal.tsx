import React from 'react';
import { X, HelpCircle, Lightbulb, Compass } from 'lucide-react';
import { AEIOU_DEFINITIONS } from '../constants';
import { AeiouCategory } from '../types';

interface AeiouLegendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AeiouLegendModal: React.FC<AeiouLegendModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const categories = Object.keys(AEIOU_DEFINITIONS) as AeiouCategory[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="aeiou-modal-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-xl">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h2 id="aeiou-modal-title" className="text-xl font-bold text-slate-900 dark:text-white">
                AEIOU Observational Framework
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Guide for classifying clinical shadowing observations in Ob/Gyn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tip banner */}
        <div className="my-4 p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            <span className="font-semibold">Tags vs AEIOU:</span> <em>Tags</em> define the <strong>subject matter</strong> (e.g. documentation, safety). <em>AEIOU</em> defines <strong>what aspect of clinical reality</strong> you were observing. Clinical teams often overlook <em>Environment</em> and <em>Activities</em>—keep your eyes open for physical obstacles and clumsy process steps!
          </div>
        </div>

        {/* Categories List */}
        <div className="space-y-4 my-4">
          {categories.map((catKey) => {
            const def = AEIOU_DEFINITIONS[catKey];
            return (
              <div
                key={catKey}
                className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3 mb-1.5">
                  <span
                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg font-black text-sm text-white shadow-xs"
                    style={{ backgroundColor: def.dotColor }}
                  >
                    {def.letter}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {def.name}
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ml-auto ${def.bgBadge}`}>
                    Lens {def.letter}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {def.shortDesc}
                </p>
                <div className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Clinical Ob/Gyn Context: </span>
                  {def.clinicalExample}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-700 rounded-xl transition shadow-xs"
          >
            Got it, back to logging
          </button>
        </div>
      </div>
    </div>
  );
};
