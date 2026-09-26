/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  auth,
  onAuthStateChanged,
  db,
  collection,
  query,
  onSnapshot,
  getDocs,
  addDoc,
  serverTimestamp,
  User,
  isEmailAllowed,
} from './firebase';
import { Navbar, TabType } from './components/Navbar';
import { LogEntryTab } from './components/LogEntryTab';
import { AllEntriesTab } from './components/AllEntriesTab';
import { DashboardTab } from './components/DashboardTab';
import { ExportPdfTab } from './components/ExportPdfTab';
import { TeamGuideTab } from './components/TeamGuideTab';
import { AeiouLegendModal } from './components/AeiouLegendModal';
import { AuthModal } from './components/AuthModal';
import { ObservationDoc, GroupId } from './types';
import { INITIAL_TEAM_ROSTER } from './constants';
import { ShieldCheck, Stethoscope, Sparkles, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('log');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAeiouHelpOpen, setIsAeiouHelpOpen] = useState(false);
  const [deniedEmail, setDeniedEmail] = useState<string | null>(null);

  // Firestore dynamic allowlist
  const [dynamicAllowedEmails, setDynamicAllowedEmails] = useState<string[]>([]);

  // Observations collection
  const [observations, setObservations] = useState<ObservationDoc[]>([]);
  const [observationsLoading, setObservationsLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [entryFilters, setEntryFilters] = useState<{
    group?: string;
    tag?: string;
    status?: string;
    aeiou?: string;
    severity?: string;
    setting?: string;
  }>({});

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const email = currentUser.email?.toLowerCase().trim();
        if (isEmailAllowed(email, dynamicAllowedEmails)) {
          setUser(currentUser);
          setDeniedEmail(null);
        } else {
          // Logged in with unauthorized account
          setUser(null);
          setDeniedEmail(email || 'Unknown');
          setIsAuthModalOpen(true);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [dynamicAllowedEmails]);

  // Listen to Dynamic Team Allowlist
  useEffect(() => {
    try {
      const colRef = collection(db, 'team_allowlist');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const emails: string[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.email) emails.push(data.email.toLowerCase().trim());
          });
          setDynamicAllowedEmails(emails);
        },
        (err) => {
          // Rule denial if not authenticated is expected
          console.warn('Allowlist snapshot notice:', err.message);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Listen to Observations Real-Time via onSnapshot
  useEffect(() => {
    setObservationsLoading(true);
    try {
      const obsCol = collection(db, 'observations');
      // Simple collection query - sorting client side handles pending timestamps gracefully
      const unsubscribe = onSnapshot(
        obsCol,
        (snapshot) => {
          const list: ObservationDoc[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              sessionId: data.sessionId || '',
              date: data.date || '',
              group: data.group || 'A',
              setting: data.setting || 'General',
              roles: data.roles || '',
              observation: data.observation || '',
              description: data.description || '',
              quote: data.quote || '',
              aeiou: data.aeiou || 'Activities',
              aeiouDetails: data.aeiouDetails || undefined,
              severity: data.severity || 'Medium',
              frequency: data.frequency || 'Recurring',
              tags: Array.isArray(data.tags) ? data.tags : [],
              status: data.status || 'New',
              createdAt: data.createdAt,
              createdBy: data.createdBy || '',
              creatorEmail: data.creatorEmail || '',
              creatorName: data.creatorName || '',
              updatedAt: data.updatedAt,
              statusUpdatedAt: data.statusUpdatedAt,
              statusUpdatedBy: data.statusUpdatedBy,
            });
          });

          // Sort newest first by date and created time
          list.sort((a, b) => {
            if (b.date !== a.date) return b.date.localeCompare(a.date);
            const timeA = (a.createdAt as any)?.seconds || 0;
            const timeB = (b.createdAt as any)?.seconds || 0;
            return timeB - timeA;
          });

          setObservations(list);
          setObservationsLoading(false);
        },
        (err) => {
          console.warn('Observations snapshot notice:', err.message);
          setObservationsLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.error('Snapshot registration error:', e);
      setObservationsLoading(false);
    }
  }, [user]);

  // Determine user group from roster
  const userGroup: GroupId | undefined = React.useMemo(() => {
    if (!user?.email) return undefined;
    const clean = user.email.toLowerCase().trim();
    const found = INITIAL_TEAM_ROSTER.find((m) => m.email.toLowerCase().trim() === clean);
    return found?.group || 'A';
  }, [user]);

  // Seed sample clinical observations for Ob/Gyn internship
  const handleSeedSampleData = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    setSeeding(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      const sampleData = [
        {
          sessionId: `sample_sess_${today}_1`,
          date: today,
          group: 'A' as GroupId,
          setting: 'Labor & Delivery Ward (L&D)',
          roles: 'Midwife, Senior Resident, Patient',
          observation: 'CTG monitor battery died mid-pushing phase because the designated charging bay cord was frayed and unplugged.',
          description: 'Staff had to wheel in a backup monitor from triage room 4, interrupting fetal heart rate surveillance for ~4 minutes during active deceleration.',
          quote: 'We submitted a work order for that charging dock two weeks ago, but engineering hasn’t replaced the cord.',
          aeiou: 'Objects' as const,
          aeiouDetails: {
            activities: 'Active second stage pushing and fetal deceleration monitoring',
            environment: 'Delivery Room 3; charger station in corridor bay',
            interactions: 'Midwife calling to unit assistant for replacement monitor',
            objects: 'CTG monitor battery dead, power cord frayed and detached',
            users: 'Laboring patient anxious during pause; midwife stressed',
          },
          severity: 'High' as const,
          frequency: 'Recurring' as const,
          tags: ['equipment', 'safety', 'workflow'] as const,
          status: 'Validated' as const,
        },
        {
          sessionId: `sample_sess_${today}_1`,
          date: today,
          group: 'A' as GroupId,
          setting: 'Obstetric Operating Room (C-Section)',
          roles: 'Scrub Nurse, Attending Surgeon, Intern',
          observation: 'Emergency C-section count board was obstructed by the neonatal resuscitation radiant warmer cart.',
          description: 'The scrub nurse had to verbally pause surgery to ask pediatric nurse to reposition the cart so sponge counts remained visible.',
          quote: 'OR 2 is 20% smaller than OR 1; layout gets crowded during twin deliveries.',
          aeiou: 'Environment' as const,
          severity: 'Medium' as const,
          frequency: 'Recurring' as const,
          tags: ['workflow', 'safety'] as const,
          status: 'Discussed' as const,
        },
        {
          sessionId: `sample_sess_${today}_2`,
          date: today,
          group: 'B' as GroupId,
          setting: 'Antenatal Clinic (OPD)',
          roles: 'Midwife, Patient, Receptionist',
          observation: 'First-trimester ultrasound intake forms are printed on paper, then manually transcribed into the hospital EHR at the end of clinic.',
          description: 'Average backlog of 18 charts at 4:30pm; high risk of transcription typos in gestational age and LMP calculations.',
          quote: 'If the scanner had a direct tablet interface, we would save 45 minutes every afternoon.',
          aeiou: 'Activities' as const,
          severity: 'Medium' as const,
          frequency: 'Recurring' as const,
          tags: ['documentation', 'workflow', 'cost-resources'] as const,
          status: 'New' as const,
        },
        {
          sessionId: `sample_sess_${yesterday}_3`,
          date: yesterday,
          group: 'C' as GroupId,
          setting: 'Triage & Acute Assessment',
          roles: 'Junior Resident, Patient, Midwife',
          observation: 'Telephone handoff from emergency department to Ob/Gyn triage lacked standardized SBAR format, omitting Rh status.',
          description: 'Patient with vaginal bleeding was transferred without blood type documentation; required emergency bedside STAT cross-match.',
          quote: 'ED just said "32 weeks bleeding coming up" without mentioning her anti-D history.',
          aeiou: 'Interactions' as const,
          severity: 'High' as const,
          frequency: 'Recurring' as const,
          tags: ['communication', 'safety', 'patient-experience'] as const,
          status: 'Prioritized' as const,
        },
        {
          sessionId: `sample_sess_${yesterday}_4`,
          date: yesterday,
          group: 'D' as GroupId,
          setting: 'Postpartum / Mother & Baby Ward',
          roles: 'Staff Nurse, New Mother (G1P1), Lactation Consultant',
          observation: 'Postpartum discharge instruction packet is 14 single-spaced pages; mother felt overwhelmed and missed warning signs for preeclampsia.',
          description: 'Discharge was rushed due to bed turnover pressure. Patient expressed high anxiety regarding blood pressure warning triggers.',
          quote: 'There was so much paperwork I didn’t know which symptoms meant I should go straight to the ER.',
          aeiou: 'Users' as const,
          severity: 'Medium' as const,
          frequency: 'Recurring' as const,
          tags: ['patient-experience', 'communication', 'documentation'] as const,
          status: 'Validated' as const,
        },
        {
          sessionId: `sample_sess_${yesterday}_5`,
          date: yesterday,
          group: 'E' as GroupId,
          setting: 'Labor & Delivery Ward (L&D)',
          roles: 'Obstetric Anesthesiologist, Midwife, Scrub Nurse',
          observation: 'Epidural kit disposal biohazard container was overflowing during shift change.',
          description: 'Sharps bin was past the fill line; needle safety mechanism had to be manipulated manually.',
          quote: 'Environmental services only does rounds at 06:00 and 18:00.',
          aeiou: 'Environment' as const,
          severity: 'High' as const,
          frequency: 'One-off' as const,
          tags: ['infection-control', 'safety'] as const,
          status: 'Discussed' as const,
        },
      ];

      const obsCol = collection(db, 'observations');
      for (const item of sampleData) {
        await addDoc(obsCol, {
          ...item,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
          creatorEmail: user.email,
          creatorName: user.displayName || user.email?.split('@')[0] || 'Intern Lead',
          updatedAt: serverTimestamp(),
          statusUpdatedAt: serverTimestamp(),
          statusUpdatedBy: user.uid,
        });
      }
    } catch (e) {
      console.error('Error seeding data:', e);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenAeiouHelp={() => setIsAeiouHelpOpen(true)}
        userGroup={userGroup}
        totalCount={observations.length}
      />

      {/* Main Container */}
      <main className="flex-1 pb-16">
        {/* If user has 0 observations, show friendly seed prompt banner */}
        {!observationsLoading && observations.length === 0 && (
          <div className="max-w-4xl mx-auto px-4 pt-6">
            <div className="p-4 bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 border border-sky-200 dark:border-sky-900 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-600 text-white rounded-xl shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Database is ready for observations
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    You can log your first shadowing round or load sample Ob/Gyn clinical friction records across Groups A–E.
                  </p>
                </div>
              </div>

              {user ? (
                <button
                  onClick={handleSeedSampleData}
                  disabled={seeding}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {seeding ? 'Seeding records...' : 'Load Sample Ob/Gyn Data'}
                </button>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer shrink-0"
                >
                  Sign In to Seed / Log
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab Routing */}
        {activeTab === 'log' && (
          <LogEntryTab
            user={user}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onOpenAeiouHelp={() => setIsAeiouHelpOpen(true)}
            onSuccessSubmit={() => {}}
            onViewEntries={() => setActiveTab('entries')}
            userDefaultGroup={userGroup || 'A'}
          />
        )}

        {activeTab === 'entries' && (
          <AllEntriesTab
            observations={observations}
            loading={observationsLoading}
            user={user}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onOpenAeiouHelp={() => setIsAeiouHelpOpen(true)}
            initialFilters={entryFilters}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardTab
            observations={observations}
            onOpenAeiouHelp={() => setIsAeiouHelpOpen(true)}
            onSelectFilter={(type, val) => {
              setEntryFilters({ [type]: val });
              setActiveTab('entries');
            }}
          />
        )}

        {activeTab === 'export' && <ExportPdfTab observations={observations} />}

        {activeTab === 'team' && (
          <TeamGuideTab
            user={user}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            allowedEmails={dynamicAllowedEmails}
            onRefreshAllowlist={() => {}}
          />
        )}
      </main>

      {/* Clinical Disclaimer Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
            <Stethoscope className="w-4 h-4 text-sky-600" />
            <span>Ob/Gyn Student Internship Observational System</span>
            <span>•</span>
            <span>Groups A–E</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Strict Anonymity Protected • Contains Zero Patient Identifiers
          </div>
        </div>
      </footer>

      {/* AEIOU Educational Modal */}
      <AeiouLegendModal
        isOpen={isAeiouHelpOpen}
        onClose={() => setIsAeiouHelpOpen(false)}
      />

      {/* Team Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        allowedEmails={dynamicAllowedEmails}
        deniedEmail={deniedEmail}
        onClearDenied={() => setDeniedEmail(null)}
      />
    </div>
  );
}
