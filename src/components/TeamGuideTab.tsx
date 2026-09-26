import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  db,
  serverTimestamp,
} from '../firebase';
import { GroupId, TeamMember } from '../types';
import {
  TEAM_GROUPS,
  INITIAL_TEAM_ROSTER,
  CLINICAL_PRIVACY_DISCLAIMER,
} from '../constants';
import {
  Users,
  ShieldCheck,
  Lock,
  Plus,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Mail,
  UserCheck,
  Stethoscope,
  FileCode,
} from 'lucide-react';

interface TeamGuideTabProps {
  user: User | null;
  onOpenAuth: () => void;
  allowedEmails: string[];
  onRefreshAllowlist: () => void;
}

export const TeamGuideTab: React.FC<TeamGuideTabProps> = ({
  user,
  onOpenAuth,
  allowedEmails,
  onRefreshAllowlist,
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newGroup, setNewGroup] = useState<GroupId>('A');
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleAddTeammate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !user) return;

    setAdding(true);
    setFeedback(null);
    try {
      const cleanEmail = newEmail.toLowerCase().trim();
      const ref = doc(db, 'team_allowlist', cleanEmail);
      await setDoc(ref, {
        email: cleanEmail,
        name: newMemberName.trim() || 'Intern Student',
        group: newGroup,
        addedBy: user.uid,
        addedAt: serverTimestamp(),
      });

      setFeedback(`Successfully added ${cleanEmail} (Group ${newGroup}) to the team allowlist!`);
      setNewEmail('');
      setNewMemberName('');
      onRefreshAllowlist();
    } catch (err: any) {
      console.error('Error adding teammate:', err);
      setFeedback(`Could not update allowlist: ${err.message}`);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                Team & Security
              </span>
              <span className="text-xs text-slate-500">Access Control & Rules</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              9-Person Internship Roster & Security Architecture
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Structured into 5 groups (A–D pairs, E solo). Zero public open writes; token-verified Firestore rules enforce clinical data protection.
            </p>
          </div>

          <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-semibold shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div>Production Firestore Rules</div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">Active & Deployed</div>
            </div>
          </div>
        </div>
      </div>

      {/* The 5 Internship Groups Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {(['A', 'B', 'C', 'D', 'E'] as GroupId[]).map((grp) => {
          const groupMeta = TEAM_GROUPS[grp];
          return (
            <div
              key={grp}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-sky-600 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                  {grp}
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {groupMeta.memberCount} {groupMeta.memberCount === 1 ? 'Intern' : 'Interns'}
                </span>
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Group {grp}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {grp === 'E' ? 'Solo rotation unit' : 'Paired shadowing buddy'}
                </p>
              </div>
              <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                {groupMeta.defaultStudents.map((st, i) => (
                  <li key={i} className="flex items-center gap-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0"></span>
                    <span className="truncate">{st}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Allowed Emails Roster & Dynamic Management */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-sky-600" />
              <span>Allowlisted Student Accounts</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Only signed-in accounts matching these addresses are permitted to write observations to Firestore.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            Total Authorized: {INITIAL_TEAM_ROSTER.length + allowedEmails.length}
          </span>
        </div>

        {/* Existing allowlist list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {INITIAL_TEAM_ROSTER.map((m, idx) => (
            <div
              key={m.email}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs flex items-center justify-between"
            >
              <div className="min-w-0 pr-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                    {m.group}
                  </span>
                  <span className="truncate">{m.name}</span>
                </div>
                <div className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                  <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{m.email}</span>
                </div>
              </div>
              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded font-semibold text-[10px] shrink-0">
                Allowlisted
              </span>
            </div>
          ))}

          {/* Dynamic added emails */}
          {allowedEmails.map((email) => (
            <div
              key={email}
              className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800 text-xs flex items-center justify-between"
            >
              <div className="min-w-0 pr-2">
                <div className="font-bold text-sky-900 dark:text-sky-200 truncate">
                  Registered Teammate
                </div>
                <div className="text-[11px] text-sky-700 dark:text-sky-300 truncate">
                  {email}
                </div>
              </div>
              <span className="px-1.5 py-0.5 bg-sky-200 text-sky-800 dark:bg-sky-900 dark:text-sky-200 rounded font-semibold text-[10px] shrink-0">
                Dynamic
              </span>
            </div>
          ))}
        </div>

        {/* Add new teammate form */}
        {user ? (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Add Additional Team Member to Firestore Allowlist
            </h3>

            {feedback && (
              <div className="mb-3 p-2.5 bg-slate-100 dark:bg-slate-800 text-xs rounded-xl text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{feedback}</span>
              </div>
            )}

            <form onSubmit={handleAddTeammate} className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="intern.email@hospital.edu"
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden font-medium"
              />
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Intern Name (e.g. Intern B2)"
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden"
              />
              <select
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value as GroupId)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden font-semibold"
              >
                <option value="A">Group A</option>
                <option value="B">Group B</option>
                <option value="C">Group C</option>
                <option value="D">Group D</option>
                <option value="E">Group E</option>
              </select>
              <button
                type="submit"
                disabled={adding}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{adding ? 'Saving...' : 'Authorize Email'}</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">Sign in with an authorized student account to add more team emails.</span>
            <button
              onClick={onOpenAuth}
              className="px-3 py-1.5 bg-sky-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              Sign In
            </button>
          </div>
        )}
      </div>

      {/* Human Setup Checklist Required by Prompt */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <BookOpen className="w-5 h-5 text-sky-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Setup The Human Will Do (Production Checklist)
          </h2>
        </div>

        <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
              1
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white">Create a free Firebase project: </span>
              Visit <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">https://console.firebase.google.com</a> to create your free Spark plan project.
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
              2
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white">Enable Authentication & Firestore: </span>
              In the Firebase Console, enable <strong>Google Sign-in</strong> (and optionally Email/Password) under <em>Build &gt; Authentication</em>, and create Cloud Firestore under <em>Build &gt; Firestore Database</em>.
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
              3
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white">Add the 9 team members' emails to the allowlist: </span>
              Add each teammate's Google email (christapostolicchurchbubiashie@gmail.com and the other 8 students) into the security rules or the <code>team_allowlist</code> collection above.
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
              4
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white">Firebase configuration is already wired: </span>
              The Firebase configuration object is integrated from <code>firebase-applet-config.json</code> with active database ID <code>ai-studio-c94f3ec7-4245-40d1-81f0-b32f6331a083</code>.
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
              5
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white">Production Firestore Security Rules Deployed: </span>
              Zero open writes permitted. Writes and reads require authenticated account verification with server timestamp and UID validation.
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
              6
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white">Deploy via Firebase Hosting: </span>
              Run <code>firebase deploy</code> to host the app on a public URL that still strictly demands student sign-in to write or view clinical friction data.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
