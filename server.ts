import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize GoogleGenAI server-side with required telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint: AI Batch Redraft into AEIOU Chart for rapid student entry
app.post('/api/batch-redraft-aeiou', async (req, res) => {
  try {
    const { rawObservations, group, date, studentName, defaultLocation } = req.body;

    if (!Array.isArray(rawObservations) || rawObservations.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one raw observation.' });
    }

    const validNotes = rawObservations
      .map((item: any) => (typeof item === 'string' ? item.trim() : item?.raw?.trim()))
      .filter((text: string) => Boolean(text && text.length > 0));

    if (validNotes.length === 0) {
      return res.status(400).json({ error: 'Observations cannot be empty.' });
    }

    const prompt = `You are a clinical ethnography and medical education AI specialist supporting medical students shadowing in an Obstetrics & Gynecology hospital department.
The student typed a batch of raw, rapid observation notes during their clinical rotation shift:
- Date: "${date || 'Today'}"
- Student Name / Author: "${studentName || 'Student Intern'}"
- Rotation Group: "Group ${group || 'A'}"
- Default Unit Setting: "${defaultLocation || 'Labor & Delivery / Obstetrics'}"

Here are their raw observations:
${validNotes.map((note: string, i: number) => `Observation [${i + 1}]: """${note}"""`).join('\n\n')}

Your task:
Analyze and redraft each raw observation into professional, objective clinical language structured through the AEIOU framework (Activities, Environment, Interactions, Objects, Users).
Refine the language so it captures the systemic bottleneck or friction point objectively without assigning personal blame to healthcare staff or patients.

Strict Anonymity Rule:
Strictly ensure NO patient names, birth dates, or identifiers are used. Refer only to clinical roles (e.g., Midwife, Senior Resident, Intern, Attending Ob/Gyn, Patient, Support Person/Partner, Scrub Nurse, Anesthetist, Unit Clerk).

Return a valid JSON object matching this exact structure:
{
  "redrafted": [
    {
      "index": 0,
      "originalRaw": "Original text as typed",
      "location": "Inferred or extracted clinical room/unit (e.g. Triage Bay 2, Obstetric OR 1, L&D Room 3, Antenatal Clinic)",
      "roles": "Inferred clinical roles involved (e.g. Midwife, Senior Resident, Patient)",
      "observation": "A concise, objective 1-2 sentence friction point or bottleneck statement in clear clinical language without blame",
      "description": "Background context or extra nuance extracted from the note (empty string if none)",
      "quote": "Verbatim quote if student quoted someone (strictly anonymized, empty string if none)",
      "aeiou": "Activities" | "Environment" | "Interactions" | "Objects" | "Users",
      "aeiouDetails": {
        "activities": "What task, process step, or clinical workflow was occurring (e.g. intake triage, sterile prep, fetal deceleration response)",
        "environment": "Physical space factors, room layout, equipment proximity, noise, lighting, crowding",
        "interactions": "Staff-staff, staff-patient, or inter-professional handoffs and verbal orders observed",
        "objects": "Tools, devices, monitors, supplies, charts, medication kits involved, missing, or delayed",
        "users": "Clinical roles involved, patient emotional state, staff fatigue/stress, and unmet human needs"
      },
      "severity": "Low" | "Medium" | "High",
      "frequency": "One-off" | "Recurring" | "Not sure",
      "tags": ["workflow" | "equipment" | "documentation" | "communication" | "patient-experience" | "staffing" | "infection-control" | "cost-resources" | "safety"]
    }
  ]
}

Ensure "tags" are chosen strictly from:
["workflow", "equipment", "documentation", "communication", "patient-experience", "staffing", "infection-control", "cost-resources", "safety"].`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text?.trim() || '{}';
    const parsed = JSON.parse(responseText);

    return res.json(parsed);
  } catch (error: any) {
    console.error('Batch AEIOU Redraft Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process batch AEIOU redrafts with AI.',
    });
  }
});

// Endpoint: AI Smart-Drafting (single raw stream-of-consciousness input parsing)
app.post('/api/smart-draft', async (req, res) => {
  try {
    const { rawStream, group } = req.body;

    if (!rawStream || !rawStream.trim()) {
      return res.status(400).json({ error: 'Please enter your raw observation notes first.' });
    }

    const prompt = `You are a clinical ethnography and medical education AI assistant for medical students shadowing in an Obstetrics & Gynecology department.
A student typed a raw, rapid stream-of-consciousness note combining what they saw, the location, and the people involved:
"""
${rawStream.trim()}
"""

Your task is to parse this single stream-of-consciousness input and intelligently auto-fill all structured fields for the clinical log entry:
1. location: The clinical setting/unit/room (e.g. "Labor & Delivery Ward", "Triage Bay 2", "Obstetric OR 1", "Antenatal Clinic"). If not explicitly named, infer the most plausible Ob/Gyn clinical setting.
2. roles: The people and clinical roles involved (e.g. "Midwife, Junior Resident, Patient, Support Partner, Scrub Nurse"). NEVER use patient names or personal identifiers.
3. observation: A concise, objective 1-2 sentence friction point or bottleneck statement without assigning personal blame.
4. description: Any relevant background context or extra detail extracted from the note.
5. quote: Any verbatim phrase or quote mentioned, strictly anonymized (empty string if none).
6. aeiou: The primary AEIOU framework lens: "Activities" | "Environment" | "Interactions" | "Objects" | "Users"
7. aeiouDetails:
   - activities: Workflow, task, or process steps occurring (e.g. admission intake, handoff, emergency prep)
   - environment: Physical space, layout, lighting, noise, proximity, or crowding factors
   - interactions: Inter-professional or patient-provider communication, handovers, or orders
   - objects: Tools, devices, monitors, supplies, delivery carts, or paper charts involved
   - users: Clinical roles, patient emotional state, staff fatigue/stress, or unmet human needs
8. severity: "Low" | "Medium" | "High"
9. frequency: "One-off" | "Recurring" | "Not sure"
10. tags: An array of 1 to 3 tags chosen STRICTLY from:
   ["workflow", "equipment", "documentation", "communication", "patient-experience", "staffing", "infection-control", "cost-resources", "safety"]
11. aiSummary: 1 brief sentence explaining the parsing result.

Return a valid JSON object matching that schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text?.trim() || '{}';
    const parsed = JSON.parse(responseText);

    return res.json(parsed);
  } catch (error: any) {
    console.error('Smart-Draft Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to parse stream-of-consciousness note with AI.',
    });
  }
});

// Endpoint: AI Redraft into AEIOU Chart
app.post('/api/redraft-aeiou', async (req, res) => {
  try {
    const { rawObservation, location, roles, group } = req.body;

    if (!rawObservation || !rawObservation.trim()) {
      return res.status(400).json({ error: 'Please provide what was seen / raw observation.' });
    }

    const prompt = `You are a clinical ethnography and medical education expert assisting medical students shadowing in an Obstetrics & Gynecology department.
The student quickly typed what they saw, the clinical location, and the people involved.
Your task is to redraft and synthesize their notes into a rigorous, objective AEIOU framework chart (Activities, Environment, Interactions, Objects, Users) and classify the clinical friction point.

Student Input:
- What they saw: "${rawObservation}"
- Clinical Location: "${location || 'Not specified'}"
- People / Roles involved: "${roles || 'Not specified'}"
- Student Group: "${group || 'A'}"

Strict Anonymity Rule:
Strictly ensure NO patient names, birth dates, or identifiers are used. Refer only to clinical roles (e.g., Midwife, Attending Ob/Gyn, Senior Resident, Patient, Support Person/Partner, Scrub Nurse).

Return a valid JSON object matching this exact structure:
{
  "observation": "A concise, objective 1-2 sentence statement of what friction or bottleneck unfolded without assigning personal blame",
  "aeiou": "Activities" | "Environment" | "Interactions" | "Objects" | "Users",
  "aeiouDetails": {
    "activities": "What task, process step, or clinical workflow was occurring (e.g. triage intake, sterile field prep, handoff, oxytocin titration)",
    "environment": "Physical space factors, layout, room size, noise, lighting, crowding, equipment positioning",
    "interactions": "Staff-staff, staff-patient, or inter-professional communication and handoffs noticed",
    "objects": "Tools, devices, monitors, paper charts, delivery trolleys, supplies used, missing, or delayed",
    "users": "Clinical roles involved, patient emotional state, staff workload/fatigue, and unmet human needs"
  },
  "severity": "Low" | "Medium" | "High",
  "frequency": "One-off" | "Recurring" | "Not sure",
  "tags": ["workflow", "equipment", "documentation", "communication", "patient-experience", "staffing", "infection-control", "cost-resources", "safety"],
  "aiSummary": "1 sentence explaining why this AEIOU classification was selected"
}

Ensure tags are chosen strictly from this list:
["workflow", "equipment", "documentation", "communication", "patient-experience", "staffing", "infection-control", "cost-resources", "safety"].`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text?.trim() || '{}';
    const parsed = JSON.parse(responseText);

    return res.json(parsed);
  } catch (error: any) {
    console.error('AEIOU Redraft Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate AEIOU redraft. Please try again.',
    });
  }
});

// Endpoint: AI Department Debrief & QI Synthesis
app.post('/api/generate-shift-summary', async (req, res) => {
  try {
    const { observations } = req.body;

    if (!Array.isArray(observations) || observations.length === 0) {
      return res.status(400).json({ error: 'No observations provided to analyze.' });
    }

    // Limit to latest 50 observations to stay fast and within tokens
    const sample = observations.slice(0, 50).map((o: any) => ({
      group: o.group,
      setting: o.setting,
      roles: o.roles,
      observation: o.observation,
      aeiou: o.aeiou,
      aeiouDetails: o.aeiouDetails,
      severity: o.severity,
      frequency: o.frequency,
      tags: o.tags,
    }));

    const prompt = `You are a clinical professor of Obstetrics & Gynecology and a Healthcare Systems Engineering expert.
Medical student interns shadowing in an Ob/Gyn department have logged the following clinical observations structured across the AEIOU framework:

Observations:
${JSON.stringify(sample, null, 2)}

Provide an executive, high-impact clinical synthesis and quality improvement (QI) debrief for faculty and student morning huddles.

Strict Anonymity Rule:
Strictly ensure NO patient names, personal details, or identifiers are used. Use only clinical roles (e.g. Midwife, Senior Resident, Intern, Attending Surgeon).

Return a valid JSON object matching this exact structure:
{
  "shiftOverview": "A high-level 2-3 sentence clinical ethnography summary describing the major operational patterns observed across the wards",
  "topBottlenecks": [
    {
      "title": "Short title (e.g. CTG Battery Reliability in Triage)",
      "lens": "Activities",
      "severity": "High",
      "rootCause": "Clear explanation of the systemic root cause without assigning personal blame",
      "impact": "Impact on patient care, safety, or provider cognitive load"
    }
  ],
  "qiRecommendations": [
    {
      "proposal": "Actionable Quality Improvement (QI) recommendation or checklist change",
      "stakeholders": "Roles who would champion this (e.g. Charge Midwife, Clinical Nurse Specialist, Ob/Gyn Chief Resident)",
      "feasibility": "Rapid / 1-Week"
    }
  ],
  "aeiouCoaching": "1-2 sentences of coaching advice for students on which AEIOU dimension was least noticed or needs deeper observation next shift"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text?.trim() || '{}';
    const parsed = JSON.parse(responseText);

    return res.json(parsed);
  } catch (error: any) {
    console.error('AI Shift Debrief Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate AI shift debrief.',
    });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
