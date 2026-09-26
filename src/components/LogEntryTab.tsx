import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, db } from '../firebase';
import {
  AeiouCategory,
  AeiouDetails,
  GroupId,
  SeverityLevel,
  FrequencyType,
  TagType,
} from '../types';
import {
  FIXED_TAGS,
  TAG_LABELS,
  AEIOU_DEFINITIONS,
  CLINICAL_SETTINGS,
  TEAM_GROUPS,
  CLINICAL_PRIVACY_DISCLAIMER,
} from '../constants';
import {
  Plus,
  Trash2,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Calendar,
  Layers,
  Compass,
  MapPin,
  Users2,
  Sparkles,
  Wand2,
  Zap,
  ArrowRight,
  ArrowLeft,
  Check,
  User as UserIcon,
  ShieldCheck,
  Edit3,
  Mic,
  MicOff,
  Radio,
  Volume2,
} from 'lucide-react';

interface LogEntryTabProps {
  user: User | null;
  onOpenAuth: () => void;
  onOpenAeiouHelp: () => void;
  onSuccessSubmit: (count: number) => void;
  onViewEntries?: () => void;
  userDefaultGroup?: GroupId;
}

// Single raw observation item during rapid typing
interface RawItem {
  id: string;
  rawText: string;
}

// Redrafted item ready for review and correction
interface RedraftedItem {
  id: string;
  originalRaw: string;
  location: string;
  roles: string;
  observation: string;
  description: string;
  quote: string;
  aeiou: AeiouCategory;
  aeiouDetails: AeiouDetails;
  severity: SeverityLevel;
  frequency: FrequencyType;
  tags: TagType[];
}

export const LogEntryTab: React.FC<LogEntryTabProps> = ({
  user,
  onOpenAuth,
  onOpenAeiouHelp,
  onSuccessSubmit,
  onViewEntries,
  userDefaultGroup = 'A',
}) => {
  // Step 1: Session Header info (takes 5 seconds)
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [studentName, setStudentName] = useState('');
  const [group, setGroup] = useState<GroupId>(userDefaultGroup);
  const [defaultSetting, setDefaultSetting] = useState('Labor & Delivery Ward (L&D)');

  // Sync default student name from auth user
  useEffect(() => {
    if (user && !studentName) {
      setStudentName(user.displayName || user.email?.split('@')[0] || '');
    }
  }, [user]);

  // Step 2: List of Raw Observations (rapid typing)
  const [rawItems, setRawItems] = useState<RawItem[]>([
    {
      id: 'raw-1',
      rawText: '',
    },
  ]);

  // Workflow Mode: 'input' (typing raw notes) | 'review' (reviewing AI redrafts before final save)
  const [workflowStage, setWorkflowStage] = useState<'input' | 'review'>('input');

  // Redrafted items after AI batch processing
  const [redraftedItems, setRedraftedItems] = useState<RedraftedItem[]>([]);

  // Loading & notification states
  const [aiProcessing, setAiProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Web Speech API Voice Dictation State
  const [dictatingIdx, setDictatingIdx] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  // Check if Web Speech API is supported
  const isSpeechSupported =
    typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // Stop active voice dictation
  const stopDictation = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setDictatingIdx(null);
    setInterimTranscript('');
  };

  // Start voice dictation for a specific raw observation index
  const startDictation = (targetIdx: number) => {
    const SpeechRecConstructor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecConstructor) {
      setSpeechError(
        'Web Speech API is not supported in this browser. Please use Google Chrome, Edge, or Safari to dictate clinical notes.'
      );
      return;
    }

    // Toggle off if clicking the currently active dictating note
    if (isListening && dictatingIdx === targetIdx) {
      stopDictation();
      return;
    }

    // Stop any existing session
    if (isListening) {
      stopDictation();
    }

    try {
      const recognition = new SpeechRecConstructor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setDictatingIdx(targetIdx);
        setInterimTranscript('');
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let finalSegment = '';
        let interimSegment = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalSegment += transcript + ' ';
          } else {
            interimSegment += transcript;
          }
        }

        setInterimTranscript(interimSegment);

        if (finalSegment.trim()) {
          setRawItems((prev) => {
            const copy = [...prev];
            const current = copy[targetIdx]?.rawText || '';
            const needsSpace = current.length > 0 && !current.endsWith(' ');
            copy[targetIdx] = {
              ...copy[targetIdx],
              rawText: `${current}${needsSpace ? ' ' : ''}${finalSegment.trim()}`,
            };
            return copy;
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError(
            'Microphone access was denied. Please allow microphone permissions in your browser address bar to dictate observations.'
          );
          stopDictation();
        } else if (event.error === 'network') {
          setSpeechError('Network error during speech recognition. Please check your connection.');
          stopDictation();
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setDictatingIdx(null);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Speech recognition initialization error:', err);
      setSpeechError(err.message || 'Could not start microphone dictation.');
      stopDictation();
    }
  };

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  const reviewSectionRef = useRef<HTMLDivElement>(null);

  // Quick preset clinical observations to test instantly
  const sampleObservations = [
    'In Triage Bay 2 with the midwife and intern, the CTG monitor battery died during active deceleration because the charging cord was frayed and unplugged in the hallway. The intern had to leave to find a backup while the midwife tried to palpate contractions manually.',
    'During emergency C-section in OR 2 with attending surgeon and scrub nurse, the surgical count board was blocked by the radiant warmer cart, forcing the scrub nurse to verbally halt surgery so someone could reposition the cart.',
    'In Antenatal Clinic Room 3, the midwife, patient, and unit clerk had an 18-chart backlog because ultrasound intake sheets are printed on paper then manually typed into the EHR at end of clinic.',
  ];

  // Helper to add another raw observation
  const handleAddRawItem = () => {
    setRawItems((prev) => [
      ...prev,
      {
        id: `raw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        rawText: '',
      },
    ]);
  };

  // Helper to remove a raw observation
  const handleRemoveRawItem = (index: number) => {
    if (rawItems.length <= 1) {
      setRawItems([{ id: 'raw-1', rawText: '' }]);
      return;
    }
    setRawItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Helper to update raw text
  const handleUpdateRawText = (index: number, text: string) => {
    setRawItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], rawText: text };
      return copy;
    });
  };

  // Insert a sample observation
  const handleInsertSample = (sampleText: string) => {
    // If first item is empty, replace it; otherwise add new
    if (rawItems.length === 1 && !rawItems[0].rawText.trim()) {
      handleUpdateRawText(0, sampleText);
    } else {
      setRawItems((prev) => [
        ...prev,
        {
          id: `raw-${Date.now()}`,
          rawText: sampleText,
        },
      ]);
    }
  };

  // Run AI Batch Analysis to redraft into AEIOU chart
  const handleAnalyzeAndRedraft = async (autoSaveDirectly = false) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!user) {
      onOpenAuth();
      return;
    }

    const validNotes = rawItems.map((r) => r.rawText.trim()).filter(Boolean);
    if (validNotes.length === 0) {
      setErrorMessage('Please type at least one raw observation before analyzing with AI.');
      return;
    }

    setAiProcessing(true);

    try {
      const res = await fetch('/api/batch-redraft-aeiou', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rawObservations: validNotes,
          group,
          date,
          studentName: studentName.trim() || user.displayName || 'Intern',
          defaultLocation: defaultSetting,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to redraft observations with AI.');
      }

      const data = await res.json();
      const redraftedList: RedraftedItem[] = (data.redrafted || []).map((item: any, idx: number) => ({
        id: `redraft-${idx}-${Date.now()}`,
        originalRaw: item.originalRaw || validNotes[idx] || '',
        location: item.location || defaultSetting,
        roles: item.roles || 'Midwife, Resident, Patient',
        observation: item.observation || validNotes[idx] || '',
        description: item.description || '',
        quote: item.quote || '',
        aeiou: item.aeiou || 'Activities',
        aeiouDetails: {
          activities: item.aeiouDetails?.activities || '',
          environment: item.aeiouDetails?.environment || '',
          interactions: item.aeiouDetails?.interactions || '',
          objects: item.aeiouDetails?.objects || '',
          users: item.aeiouDetails?.users || '',
        },
        severity: item.severity || 'Medium',
        frequency: item.frequency || 'Recurring',
        tags: Array.isArray(item.tags) && item.tags.length > 0 ? item.tags : ['workflow'],
      }));

      if (autoSaveDirectly) {
        // Save directly to Firestore right now
        await saveRedraftedToFirestore(redraftedList);
      } else {
        // Move to Review & Corrections stage
        setRedraftedItems(redraftedList);
        setWorkflowStage('review');
        setTimeout(() => {
          reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } catch (err: any) {
      console.error('AI Redraft Error:', err);
      setErrorMessage(err.message || 'AI redrafting encountered an issue. Please try again.');
    } finally {
      setAiProcessing(false);
    }
  };

  // Update a field in the redrafted review item
  const handleUpdateRedraftedItem = (
    index: number,
    field: keyof RedraftedItem,
    value: any
  ) => {
    setRedraftedItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Update specific AEIOU dimension in review item
  const handleUpdateRedraftedAeiou = (
    index: number,
    category: keyof AeiouDetails,
    val: string
  ) => {
    setRedraftedItems((prev) => {
      const copy = [...prev];
      const prevDetails = copy[index].aeiouDetails || {};
      copy[index] = {
        ...copy[index],
        aeiouDetails: {
          ...prevDetails,
          [category]: val,
        },
      };
      return copy;
    });
  };

  // Toggle category tag on review item
  const handleToggleReviewTag = (index: number, tag: TagType) => {
    setRedraftedItems((prev) => {
      const copy = [...prev];
      const curTags = copy[index].tags;
      const nextTags = curTags.includes(tag) ? curTags.filter((t) => t !== tag) : [...curTags, tag];
      copy[index] = { ...copy[index], tags: nextTags.length > 0 ? nextTags : ['workflow'] };
      return copy;
    });
  };

  // Final Commit to Firestore
  const saveRedraftedToFirestore = async (itemsToSave: RedraftedItem[]) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const sessionId = `sess_${date}_grp${group}_${Date.now().toString(36)}`;
      const observationsCol = collection(db, 'observations');

      const promises = itemsToSave.map((item) => {
        return addDoc(observationsCol, {
          sessionId,
          date,
          group,
          setting: item.location.trim() || defaultSetting,
          roles: item.roles.trim() || 'Midwife, Resident, Patient',
          observation: item.observation.trim(),
          description: item.description.trim() || '',
          quote: item.quote.trim() || '',
          aeiou: item.aeiou,
          aeiouDetails: {
            activities: item.aeiouDetails?.activities?.trim() || '',
            environment: item.aeiouDetails?.environment?.trim() || '',
            interactions: item.aeiouDetails?.interactions?.trim() || '',
            objects: item.aeiouDetails?.objects?.trim() || '',
            users: item.aeiouDetails?.users?.trim() || '',
          },
          severity: item.severity,
          frequency: item.frequency,
          tags: item.tags,
          status: 'New',
          createdAt: serverTimestamp(),
          createdBy: user.uid,
          creatorEmail: user.email || 'anonymous',
          creatorName: studentName.trim() || user.displayName || user.email?.split('@')[0] || 'Intern',
          updatedAt: serverTimestamp(),
          statusUpdatedAt: serverTimestamp(),
          statusUpdatedBy: user.uid,
        });
      });

      await Promise.all(promises);

      const count = itemsToSave.length;
      setSuccessMessage(
        `Successfully redrafted and saved ${count} observation${count > 1 ? 's' : ''} to Firestore!`
      );

      // Reset workflow back to raw input for next round
      setRawItems([{ id: 'raw-1', rawText: '' }]);
      setRedraftedItems([]);
      setWorkflowStage('input');
      onSuccessSubmit(count);
    } catch (err: any) {
      console.error('Save to Firestore error:', err);
      setErrorMessage(err.message || 'Failed to save observations. Check your connection or team permissions.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Clinical Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
                Streamlined Ob/Gyn Entry
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Redraft & AEIOU Analysis</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              Rapid Clinical Observation Logger
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Enter date, your name, and team. Type your raw observations in plain words. AI redrafts them into structured AEIOU charts for your quick review and saving.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAeiouHelp}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 rounded-xl transition cursor-pointer self-start sm:self-center shrink-0"
          >
            <Compass className="w-4 h-4 text-sky-600" />
            <span>AEIOU Guide</span>
          </button>
        </div>

        {/* Anonymity Reminder */}
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Strict Clinical Anonymity: </span>
            {CLINICAL_PRIVACY_DISCLAIMER}
          </div>
        </div>
      </div>

      {/* Global Notifications */}
      {speechError && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-center justify-between text-xs sm:text-sm text-amber-900 dark:text-amber-200 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <MicOff className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-bold">Dictation Notice: </span>
              {speechError}
            </div>
          </div>
          <button
            onClick={() => setSpeechError(null)}
            className="text-amber-700 dark:text-amber-400 hover:underline text-xs cursor-pointer font-bold ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center">
            {onViewEntries && (
              <button
                type="button"
                onClick={onViewEntries}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1"
              >
                <span>View in All Entries</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-700 dark:text-emerald-400 hover:underline text-xs cursor-pointer font-bold"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-2.5 text-xs sm:text-sm text-rose-800 dark:text-rose-300">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: FAST HEADER (Date, Name, Team, Default Setting)                  */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-600 text-white font-bold text-[11px]">
              1
            </span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Shift Details & Team Identifier
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Takes 5 seconds</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Observation Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              <span>Shift Date</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 outline-hidden font-medium"
            />
          </div>

          {/* Student Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <UserIcon className="w-3.5 h-3.5 text-sky-600" />
              <span>Your Name / Initials</span>
            </label>
            <input
              type="text"
              required
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="e.g. Alex M. or Dr. Taylor"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 outline-hidden font-medium"
            />
          </div>

          {/* Internship Group */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Users2 className="w-3.5 h-3.5 text-sky-600" />
              <span>Shadowing Team</span>
            </label>
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value as GroupId)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 outline-hidden font-semibold text-slate-800 dark:text-slate-200"
            >
              {(['A', 'B', 'C', 'D', 'E'] as GroupId[]).map((g) => (
                <option key={g} value={g}>
                  Group {g} — {TEAM_GROUPS[g].name}
                </option>
              ))}
            </select>
          </div>

          {/* Default Setting */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-sky-600" />
              <span>Hospital Unit / Setting</span>
            </label>
            <input
              type="text"
              list="unit-suggestions"
              value={defaultSetting}
              onChange={(e) => setDefaultSetting(e.target.value)}
              placeholder="e.g. Labor Ward, Triage, OR"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 outline-hidden font-medium"
            />
            <datalist id="unit-suggestions">
              {CLINICAL_SETTINGS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STAGE 1: RAPID RAW OBSERVATIONS ENTRY                                     */}
      {/* ========================================================================= */}
      {workflowStage === 'input' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-sm border border-sky-700/40">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-500/20 text-sky-300 rounded-xl border border-sky-400/30">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white text-slate-900 font-bold text-[11px]">
                    2
                  </span>
                  <h2 className="text-base font-bold">
                    Type Raw Observations
                  </h2>
                  <span className="text-[11px] font-semibold px-2 py-0.5 bg-sky-500/30 text-sky-200 rounded-full border border-sky-400/20">
                    {rawItems.length} {rawItems.length === 1 ? 'Note' : 'Notes'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Type naturally what happened in plain language. Add as many observations as you observed during your shift.
                </p>
              </div>
            </div>

            {/* Quick Sample & Voice Status Buttons */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-[11px] font-semibold text-sky-200 border border-white/10">
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                <span>Voice Dictation Ready</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-300 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Try sample:</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleInsertSample(sampleObservations[0])}
                  className="text-[11px] px-2 py-1 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white rounded-lg transition border border-white/10 cursor-pointer"
                >
                  Triage Monitor
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertSample(sampleObservations[1])}
                  className="text-[11px] px-2 py-1 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white rounded-lg transition border border-white/10 cursor-pointer hidden md:inline-block"
                >
                  OR Board
                </button>
              </div>
            </div>
          </div>

          {/* List of Raw Observation Cards */}
          <div className="space-y-3">
            {rawItems.map((item, idx) => {
              const isCurrentlyDictating = isListening && dictatingIdx === idx;

              return (
                <div
                  key={item.id}
                  className={`bg-white dark:bg-slate-900 border-2 rounded-2xl p-4 sm:p-5 shadow-xs relative transition space-y-3 ${
                    isCurrentlyDictating
                      ? 'border-rose-400 dark:border-rose-600 ring-2 ring-rose-500/20 shadow-md'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-bold text-xs border border-sky-300 dark:border-sky-800">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Observation Note
                      </span>

                      {/* Dictation Button */}
                      {isCurrentlyDictating ? (
                        <button
                          type="button"
                          onClick={stopDictation}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-rose-700 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-700 rounded-lg shadow-2xs animate-pulse cursor-pointer"
                          title="Listening to microphone... Click to stop"
                        >
                          <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                          <MicOff className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          <span>Stop Dictating</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startDictation(idx)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-sky-50 dark:bg-slate-800 dark:hover:bg-slate-700 hover:text-sky-700 dark:hover:text-sky-300 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                          title="Dictate observation hands-free using Web Speech API"
                        >
                          <Mic className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                          <span>Dictate Note</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{item.rawText.trim().split(/\s+/).filter(Boolean).length} words</span>
                      {rawItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isCurrentlyDictating) stopDictation();
                            handleRemoveRawItem(idx);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Remove this observation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    value={item.rawText}
                    onChange={(e) => handleUpdateRawText(idx, e.target.value)}
                    placeholder={`Type or click 'Dictate Note' for note #${idx + 1}... (e.g. In Bay 2, CTG cord kept pulling loose whenever bed was moved, midwife had to replug 3 times while reassuring patient)`}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 outline-hidden leading-relaxed font-medium"
                  />

                  {/* Live Web Speech Dictation Feedback Banner */}
                  {isCurrentlyDictating && (
                    <div className="flex items-center justify-between p-3 bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs text-rose-900 dark:text-rose-200 animate-in fade-in">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Radio className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />
                        <span className="font-bold shrink-0">Live Dictation:</span>
                        <span className="italic truncate text-slate-700 dark:text-slate-300">
                          {interimTranscript
                            ? `"${interimTranscript}"`
                            : 'Listening... Speak your observation clearly into the microphone'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={stopDictation}
                        className="px-2.5 py-1 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-md shrink-0 cursor-pointer shadow-2xs ml-2"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Another Raw Observation Button */}
          <button
            type="button"
            onClick={handleAddRawItem}
            className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 dark:hover:border-sky-500 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 transition bg-slate-50/50 dark:bg-slate-900/50 hover:bg-sky-50/30 dark:hover:bg-sky-950/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Another Observation Note (+ Observation #{rawItems.length + 1})</span>
          </button>

          {/* Primary Action Buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Gemini AI will synthesize each note into the 5 AEIOU dimensions, category tags, and professional clinical phrasing.
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
              {/* Direct Quick Save Button (in case they don't want to review) */}
              <button
                type="button"
                disabled={aiProcessing}
                onClick={() => handleAnalyzeAndRedraft(true)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
                title="Runs AI and directly saves to Firestore without review"
              >
                Quick Save & Auto-Redraft
              </button>

              {/* Main Button: Analyze & Review for Corrections */}
              <button
                type="button"
                disabled={aiProcessing}
                onClick={() => handleAnalyzeAndRedraft(false)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md cursor-pointer disabled:opacity-50"
              >
                {aiProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing & Redrafting with AI...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Redraft & Review AEIOU ({rawItems.filter((r) => r.rawText.trim()).length || 1})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: REVIEW & MAKE CORRECTIONS BEFORE FINAL SAVE                     */}
      {/* ========================================================================= */}
      {workflowStage === 'review' && (
        <div ref={reviewSectionRef} className="space-y-5 animate-in fade-in">
          {/* Review Banner */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-900 to-sky-900 text-white rounded-2xl shadow-md border border-teal-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-400/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">
                  Review & Correct Redrafted Observations
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  AI has structured your {redraftedItems.length} observation{redraftedItems.length > 1 ? 's' : ''} into the AEIOU framework. Make any quick corrections before confirming save.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setWorkflowStage('input')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 transition cursor-pointer self-start sm:self-center"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Edit Raw Notes</span>
            </button>
          </div>

          {/* Redrafted Cards */}
          <div className="space-y-5">
            {redraftedItems.map((item, idx) => {
              const aeiouDef = AEIOU_DEFINITIONS[item.aeiou];

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-teal-600 text-white font-bold text-xs">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Redrafted Clinical Friction Point
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Primary Lens:
                      </span>
                      <span
                        className="px-2 py-0.5 text-xs font-bold text-white rounded-md flex items-center gap-1 shadow-2xs"
                        style={{ backgroundColor: aeiouDef.dotColor }}
                      >
                        <span>{aeiouDef.letter}</span>
                        <span>{aeiouDef.name}</span>
                      </span>
                    </div>
                  </div>

                  {/* Original Raw Reference */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-0.5">
                      What you typed (raw):
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 italic">
                      "{item.originalRaw}"
                    </span>
                  </div>

                  {/* Refined Clinical Observation Headline */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Objective Clinical Statement (Editable):
                    </label>
                    <textarea
                      rows={2}
                      value={item.observation}
                      onChange={(e) => handleUpdateRedraftedItem(idx, 'observation', e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-900 border-2 border-sky-500/40 rounded-xl focus:ring-2 focus:ring-sky-500 outline-hidden font-semibold text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Location & Roles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Location / Setting:
                      </label>
                      <input
                        type="text"
                        value={item.location}
                        onChange={(e) => handleUpdateRedraftedItem(idx, 'location', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 outline-hidden font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        People Involved:
                      </label>
                      <input
                        type="text"
                        value={item.roles}
                        onChange={(e) => handleUpdateRedraftedItem(idx, 'roles', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 outline-hidden font-medium"
                      />
                    </div>
                  </div>

                  {/* Primary AEIOU Lens Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Select Primary AEIOU Lens:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                      {(Object.keys(AEIOU_DEFINITIONS) as AeiouCategory[]).map((catKey) => {
                        const def = AEIOU_DEFINITIONS[catKey];
                        const isSelected = item.aeiou === catKey;

                        return (
                          <button
                            key={catKey}
                            type="button"
                            onClick={() => handleUpdateRedraftedItem(idx, 'aeiou', catKey)}
                            className={`p-2 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 ring-2 ring-sky-500/20 font-bold'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-4 h-4 rounded text-white font-bold text-[10px] flex items-center justify-center shrink-0"
                                style={{ backgroundColor: def.dotColor }}
                              >
                                {def.letter}
                              </span>
                              <span className="text-xs">{def.name}</span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-sky-600" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* AEIOU Dimensions Breakdown (Editable) */}
                  <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      AEIOU Dimension Breakdown (Auto-Filled, Click to adjust):
                    </span>

                    {/* A */}
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-sky-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        A
                      </span>
                      <input
                        type="text"
                        value={item.aeiouDetails?.activities || ''}
                        onChange={(e) => handleUpdateRedraftedAeiou(idx, 'activities', e.target.value)}
                        placeholder="Activities (Task, workflow step, handoff)..."
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-hidden focus:ring-1 focus:ring-sky-500"
                      />
                    </div>

                    {/* E */}
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        E
                      </span>
                      <input
                        type="text"
                        value={item.aeiouDetails?.environment || ''}
                        onChange={(e) => handleUpdateRedraftedAeiou(idx, 'environment', e.target.value)}
                        placeholder="Environment (Space, layout, noise, crowding)..."
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {/* I */}
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-violet-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        I
                      </span>
                      <input
                        type="text"
                        value={item.aeiouDetails?.interactions || ''}
                        onChange={(e) => handleUpdateRedraftedAeiou(idx, 'interactions', e.target.value)}
                        placeholder="Interactions (Communication, handoff, verbal orders)..."
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-hidden focus:ring-1 focus:ring-violet-500"
                      />
                    </div>

                    {/* O */}
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-amber-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        O
                      </span>
                      <input
                        type="text"
                        value={item.aeiouDetails?.objects || ''}
                        onChange={(e) => handleUpdateRedraftedAeiou(idx, 'objects', e.target.value)}
                        placeholder="Objects (Tools, devices, monitors, paper charts)..."
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-hidden focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    {/* U */}
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-pink-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        U
                      </span>
                      <input
                        type="text"
                        value={item.aeiouDetails?.users || ''}
                        onChange={(e) => handleUpdateRedraftedAeiou(idx, 'users', e.target.value)}
                        placeholder="Users (Roles, fatigue, patient emotional state)..."
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-hidden focus:ring-1 focus:ring-pink-500"
                      />
                    </div>
                  </div>

                  {/* Category Tags */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tags:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {FIXED_TAGS.map((tag) => {
                        const isSelected = item.tags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleToggleReviewTag(idx, tag)}
                            className={`text-xs px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                              isSelected
                                ? 'bg-slate-900 text-white border-slate-900 dark:bg-sky-600 dark:border-sky-600 font-semibold shadow-2xs'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {TAG_LABELS[tag].label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Severity & Frequency */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Severity:
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['Low', 'Medium', 'High'] as SeverityLevel[]).map((sev) => (
                          <button
                            key={sev}
                            type="button"
                            onClick={() => handleUpdateRedraftedItem(idx, 'severity', sev)}
                            className={`py-1 text-xs font-semibold rounded-lg border text-center transition cursor-pointer ${
                              item.severity === sev
                                ? sev === 'High'
                                  ? 'bg-rose-600 text-white border-rose-600'
                                  : sev === 'Medium'
                                  ? 'bg-amber-500 text-white border-amber-500'
                                  : 'bg-slate-700 text-white border-slate-700'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {sev}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Frequency:
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['One-off', 'Recurring', 'Not sure'] as FrequencyType[]).map((freq) => (
                          <button
                            key={freq}
                            type="button"
                            onClick={() => handleUpdateRedraftedItem(idx, 'frequency', freq)}
                            className={`py-1 text-xs font-semibold rounded-lg border text-center transition cursor-pointer ${
                              item.frequency === freq
                                ? 'bg-sky-600 text-white border-sky-600'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {freq}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Confirm & Save Button */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setWorkflowStage('input')}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Make Changes to Raw Notes</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => saveRedraftedToFirestore(redraftedItems)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving to Firestore...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>
                    Confirm & Save {redraftedItems.length} Observation
                    {redraftedItems.length > 1 ? 's' : ''} to Firestore
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
