import React, { useState, useEffect, useRef } from "react";

/* ------------------------------------------------------------------ */
/*  Kindly v4 — rejection emails in under 30 seconds                   */
/*  New in v4: "register interest in similar roles" shell line with    */
/*  dummy link, triggered by tickbox; closings are recruiter-decided   */
/*  chips in both modes.                                               */
/*  Design principle: the human decides, Kindly articulates.           */
/* ------------------------------------------------------------------ */

const css = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

.kb{min-height:100vh;background:#ECF1EF;color:#17312B;
  font-family:'Inter',system-ui,sans-serif;padding:24px 16px 64px;}
.kb *{box-sizing:border-box;}
.kb-wrap{max-width:1100px;margin:0 auto;}
.kb h1,.kb h2,.kb h3{font-family:'Sora',sans-serif;margin:0;}
.kb-top{display:flex;align-items:flex-end;justify-content:space-between;
  gap:16px;flex-wrap:wrap;margin-bottom:20px;}
.kb-title{font-size:26px;font-weight:700;letter-spacing:-0.02em;}
.kb-title span{color:#0E7C66;}
.kb-sub{color:#5D7069;font-size:14px;margin-top:4px;max-width:46ch;}
.kb-timer{font-family:'Sora',sans-serif;font-variant-numeric:tabular-nums;
  background:#fff;border:1px solid #D9E3DF;border-radius:999px;
  padding:8px 16px;font-size:15px;font-weight:600;display:flex;gap:8px;
  align-items:center;white-space:nowrap;}
.kb-timer .dot{width:8px;height:8px;border-radius:50%;background:#0E7C66;}
.kb-timer.done{border-color:#0E7C66;color:#0A5B4B;}
.kb-grid{display:grid;grid-template-columns:1fr;gap:20px;}
@media(min-width:900px){.kb-grid{grid-template-columns:460px 1fr;align-items:start;}}
.kb-setup{display:grid;grid-template-columns:1fr;gap:20px;max-width:720px;}
.kb-card{background:#fff;border:1px solid #D9E3DF;border-radius:16px;padding:20px;}
.kb-step{font-family:'Sora',sans-serif;font-size:11px;font-weight:600;
  letter-spacing:0.12em;text-transform:uppercase;color:#0E7C66;margin-bottom:6px;}
.kb-q{font-size:17px;font-weight:600;font-family:'Sora',sans-serif;margin-bottom:14px;}
.kb-chips{display:flex;flex-wrap:wrap;gap:8px;}
.kb-chip{border:1px solid #D9E3DF;background:#F2F6F4;color:#17312B;
  border-radius:999px;padding:9px 14px;font-size:14px;font-weight:500;
  cursor:pointer;transition:all .12s;font-family:'Inter',sans-serif;text-align:left;}
.kb-chip:hover{border-color:#0E7C66;}
.kb-chip.on{background:#0E7C66;border-color:#0E7C66;color:#fff;}
.kb-chip.sm{padding:6px 11px;font-size:13px;}
.kb-chip:focus-visible{outline:2px solid #0E7C66;outline-offset:2px;}
.kb-mode{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;}
.kb-mode .kb-chip{font-family:'Sora',sans-serif;font-weight:600;}
.kb-input{width:100%;border:1px solid #D9E3DF;border-radius:10px;
  padding:10px 12px;font-size:15px;font-family:'Inter',sans-serif;color:#17312B;
  background:#fff;}
.kb-input:focus{outline:2px solid #0E7C66;border-color:#0E7C66;}
.kb-area{min-height:90px;resize:vertical;}
.kb-btn{border:none;border-radius:10px;padding:12px 18px;font-size:15px;
  font-weight:600;font-family:'Sora',sans-serif;cursor:pointer;transition:all .12s;}
.kb-btn.primary{background:#0E7C66;color:#fff;}
.kb-btn.primary:hover{background:#0A5B4B;}
.kb-btn.primary:disabled{opacity:.45;cursor:default;}
.kb-btn.ghost{background:transparent;color:#0A5B4B;border:1px solid #D9E3DF;}
.kb-btn.ghost:hover{border-color:#0E7C66;}
.kb-btn.ghost:disabled{opacity:.45;cursor:default;}
.kb-btn.amber{background:#FBEFD6;color:#7A5A16;border:1px solid #E9A83B;}
.kb-btn.amber:hover{background:#F7E4BC;}
.kb-btn.amber:disabled{opacity:.45;cursor:default;}
.kb-row{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;}
.kb-label{font-size:12px;font-weight:600;color:#5D7069;margin-bottom:6px;margin-top:14px;
  display:block;text-transform:uppercase;letter-spacing:.06em;}
.kb-label:first-of-type{margin-top:0;}
.kb-skillbar{display:flex;gap:8px;margin-top:10px;}
.kb-note{font-size:13px;color:#5D7069;margin-top:10px;line-height:1.5;}
.kb-preview{font-size:14.5px;line-height:1.65;white-space:pre-wrap;}
.kb-preview .ai{background:#FBEFD6;border-left:3px solid #E9A83B;
  padding:8px 10px;border-radius:6px;display:block;margin:10px 0;}
.kb-preview .ai.waiting{color:#5D7069;font-style:italic;}
.kb-meta{display:flex;justify-content:space-between;align-items:center;
  margin-bottom:12px;gap:10px;flex-wrap:wrap;}
.kb-pill{font-size:12px;font-weight:600;color:#0A5B4B;
  background:#E2F0EC;border-radius:999px;padding:4px 10px;}
.kb-edit{width:100%;min-height:280px;border:1px solid #D9E3DF;border-radius:12px;
  padding:14px;font-size:14.5px;line-height:1.6;font-family:'Inter',sans-serif;resize:vertical;}
.kb-tick{display:flex;align-items:flex-start;gap:8px;font-size:14px;color:#17312B;
  cursor:pointer;user-select:none;margin-top:14px;line-height:1.4;}
.kb-tick input{accent-color:#0E7C66;margin-top:3px;}
.kb-tick .hint{display:block;font-size:12px;color:#5D7069;}
.kb-progress{display:flex;gap:6px;margin-bottom:18px;}
.kb-progress i{height:4px;flex:1;border-radius:99px;background:#D9E3DF;}
.kb-progress i.on{background:#0E7C66;}
.kb-err{color:#A33B2E;font-size:13px;margin-top:10px;}
.kb-shellbox{background:#F7FAF9;border:1px dashed #C4D4CE;border-radius:12px;
  padding:14px;margin-top:14px;}
.kb-triage-row{border:1px solid #D9E3DF;border-radius:12px;padding:12px 14px;
  margin-bottom:10px;background:#fff;}
.kb-triage-row.decided{border-color:#0E7C66;background:#F4FAF8;}
.kb-triage-head{display:flex;justify-content:space-between;align-items:center;
  gap:10px;margin-bottom:8px;flex-wrap:wrap;}
.kb-triage-name{font-family:'Sora',sans-serif;font-weight:600;font-size:15px;}
.kb-subrow{display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;}
.kb-subrow .lbl{font-size:11px;font-weight:600;color:#5D7069;
  text-transform:uppercase;letter-spacing:.06em;}
.kb-enc{font-size:12px;display:flex;align-items:center;gap:6px;color:#5D7069;
  cursor:pointer;user-select:none;white-space:nowrap;}
.kb-enc input{accent-color:#0E7C66;}
.kb-mail{border:1px solid #D9E3DF;border-radius:12px;padding:14px;margin-bottom:12px;
  background:#fff;}
.kb-mail-head{display:flex;justify-content:space-between;align-items:center;gap:10px;
  margin-bottom:8px;}
.kb-mail pre{white-space:pre-wrap;font-family:'Inter',sans-serif;font-size:13.5px;
  line-height:1.6;margin:0;}
.kb-count{font-size:13px;color:#5D7069;}
@media(prefers-reduced-motion:reduce){.kb *{transition:none!important;}}
`;

/* ---------- API helpers ------------------------------------------- */

async function callClaude(prompt, maxTokens = 1000) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return text.replace(/```json|```/g, "").trim();
}

async function extractSkills(jd, roleTitle) {
  const prompt = `From this job description for "${roleTitle}", extract the 5-6 most important skills, experience areas or traits a recruiter would compare candidates on. Keep each one short (2-5 words), concrete, and taken from the JD itself (e.g. "stakeholder management", "TikTok content production", "budget ownership"). Respond ONLY with a JSON array of strings, nothing else — no preamble, no markdown.\n\nJOB DESCRIPTION:\n${jd}`;
  const out = await callClaude(prompt);
  return JSON.parse(out);
}

function profileBlock(p) {
  const parts = [];
  if (p.about?.trim()) parts.push(`- About the company: ${p.about.trim()}`);
  if (p.values?.trim()) parts.push(`- Values & behaviours: ${p.values.trim()}`);
  if (p.voice?.trim()) parts.push(`- Employer brand voice & style: ${p.voice.trim()}`);
  return parts.length
    ? `\nCOMPANY PROFILE (write in this company's voice):\n${parts.join("\n")}\n`
    : "";
}

async function brandShell(p, company) {
  const prompt = `You are writing the FIXED template lines of a candidate rejection email for ${company}. These lines are approved once by the employer brand team and reused for every candidate, so they must be brand-perfect and legally safe.

COMPANY PROFILE:
- About: ${p.about || "not provided"}
- Values & behaviours: ${p.values || "not provided"}
- Employer brand voice & style: ${p.voice || "not provided"}

Write these five lines in the company's voice:
1. "warm_line" — one sentence that follows "Thank you for applying/interviewing for the [role] role at ${company}." and acknowledges the effort candidates put in. Human, not grovelling.
2. "closing_active" — one or two sentences actively encouraging this candidate to apply again (careers page mention welcome).
3. "closing_other" — one sentence warmly leaving the door open for other roles.
4. "closing_no" — one sentence wishing them well, kind but not encouraging reapplication.
5. "talent_line" — one sentence inviting the candidate to register their interest in hearing about similar roles when they come up. It will be followed immediately by a link, so end it naturally leading into a URL (e.g. "...you can register your interest here:").

RULES: UK English. No "unfortunately", "we regret", "after careful consideration". No exclamation marks unless the voice clearly calls for them. Sound like the company, not like HR software. Keep each line short.

Respond ONLY with JSON, no markdown fences: {"warm_line": "...", "closing_active": "...", "closing_other": "...", "closing_no": "...", "talent_line": "..."}`;
  const out = await callClaude(prompt);
  return JSON.parse(out);
}

async function generateMiddle(a, settings) {
  const prompt = `You write the personalised middle section of a candidate rejection email for a UK employer. You will receive structured answers a recruiter tapped in, plus a company profile. Turn the answers into EXACTLY 2-3 warm, human sentences in the company's voice.
${profileBlock(settings)}
HARD RULES:
- UK English. Plain, kind, specific. Write like a thoughtful person at this company, not HR boilerplate.
- Match the employer brand voice and style above. If a company value or behaviour genuinely connects to the candidate's strength, you may echo its language naturally — never bolt values on artificially or name-check them like a checklist.
- BANNED phrases: "unfortunately", "we regret", "after careful consideration", "at this time", "we wish you the best" (the template handles closings).
- NEVER mention or imply age, health, disability, family circumstances, employment gaps, nationality, or any protected characteristic.
- Frame the decision around the strength of the field and the specific requirement — e.g. "other applicants brought more hands-on experience of X" — never as the candidate's personal deficiency or failure.
- Genuinely acknowledge their specific strength; make it feel noticed, not generic.
- Do not promise feedback calls, do not apologise excessively, do not repeat the candidate's name.
- Do not write a greeting or sign-off. Middle sentences only.
- Tone: ${settings.tone === "warm" ? "warm and personal — the recruiter got to know this candidate" : "professional and courteous — contact was limited"}.

RECRUITER'S ANSWERS:
- Role: ${a.roleTitle}
- Stage reached: ${a.stage}
- Reason for rejection: ${a.reasonLabel}${a.reasonSkill ? ` — specifically: ${a.reasonSkill}` : ""}${a.reasonDetail ? ` (recruiter's note: ${a.reasonDetail})` : ""}
- Their standout strength: ${a.strength}${a.strengthDetail ? ` (recruiter's note: ${a.strengthDetail})` : ""}

Respond ONLY with JSON, no markdown fences: {"middle": "your 2-3 sentences"}`;
  const out = await callClaude(prompt);
  return JSON.parse(out).middle;
}

async function generateTriageMiddles(rows, roleTitle, settings) {
  const list = rows
    .map(
      (r, i) =>
        `${i + 1}. ${r.name} — decision came down to: ${
          r.skill === "__changed__"
            ? "the role requirements changed or the role was paused"
            : `other applicants having more hands-on experience of ${r.skill}`
        }`
    )
    .join("\n");
  const prompt = `You write the personalised middle sentences of CV-stage rejection emails for a UK employer. A human recruiter has individually reviewed each application against the job description and tapped the specific reason for each candidate. Write ONE OR TWO short sentences per candidate explaining the decision.
${profileBlock(settings)}
HARD RULES:
- UK English. Plain, kind, specific. Sound like this company, not HR software.
- These candidates were not interviewed — do not invent personal knowledge of them, do not reference strengths, interviews, or conversations. The sentences explain the decision only.
- BANNED phrases: "unfortunately", "we regret", "after careful consideration", "at this time", "we wish you the best".
- NEVER mention or imply age, health, disability, family circumstances, employment gaps, nationality, or any protected characteristic.
- Frame each decision around the strength of the applicant field and the specific requirement. Do not use the word "recent" about experience (it can imply age). Say "more hands-on experience of X" or "deeper experience of X". Never frame it as the candidate's personal deficiency.
- Vary the sentence construction between candidates so identical reasons don't produce identical robotic emails, but keep meaning faithful to the recruiter's tapped reason.
- No greetings, no sign-offs, no candidate names inside the sentences.

ROLE: ${roleTitle}

CANDIDATES:
${list}

Respond ONLY with JSON, no markdown fences: {"middles": ["sentence(s) for candidate 1", "sentence(s) for candidate 2", ...]} — exactly ${rows.length} entries, same order.`;
  const out = await callClaude(prompt, 3000);
  return JSON.parse(out).middles;
}

/* ---------- static options ---------------------------------------- */

const STAGES = [
  "CV / application review",
  "Phone screen",
  "First interview",
  "Final interview",
];

const REASONS = [
  { id: "exp", label: "Others had more hands-on experience in…", needsSkill: true },
  { id: "depth", label: "We needed deeper capability in…", needsSkill: true },
  { id: "evidence", label: "Stronger evidence from others of…", needsSkill: true },
  { id: "changed", label: "Role requirements changed or the role was paused", needsSkill: false },
  { id: "late", label: "A later-stage candidate was already close to offer", needsSkill: false },
];

const STRENGTHS = [
  "Communication",
  "Enthusiasm for the role",
  "Interview preparation",
  "Relevant experience",
  "Portfolio / work examples",
  "Great questions asked",
];

const CLOSING_OPTIONS = [
  { id: "active", label: "Actively encourage reapplying" },
  { id: "other", label: "Door open — other roles" },
  { id: "no", label: "Not right now" },
];

const TRIAGE_CLOSINGS = [
  { id: "other", label: "door open" },
  { id: "no", label: "not now" },
];

const DEFAULT_SHELL = {
  warm_line:
    "We know how much effort goes into every application, and we don't take yours for granted.",
  closing_active:
    "We'd genuinely like to see you apply again — please keep an eye on our careers page, and do mention this application if you do.",
  closing_other:
    "We'd be happy to see your name come up for other roles with us in the future.",
  closing_no: "We wish you every success with your search.",
  talent_line:
    "If you'd like to hear about similar roles when they come up, you can register your interest here:",
};

const DEFAULT_TALENT_LINK = "https://careers.example.com/register-interest";

const REVIEWED_LINE =
  "Your application was individually reviewed by our recruitment team against the requirements for this role.";

/* ---------- component ---------------------------------------------- */

export default function Kindly() {
  /* company profile + settings */
  const [settings, setSettings] = useState({
    company: "",
    sender: "The Talent Team",
    tone: "warm",
    about: "",
    values: "",
    voice: "",
    talentLink: DEFAULT_TALENT_LINK,
  });
  const [shell, setShell] = useState({ ...DEFAULT_SHELL });
  const [branding, setBranding] = useState(false);
  const [branded, setBranded] = useState(false);

  /* role setup */
  const [roleTitle, setRoleTitle] = useState("");
  const [jd, setJd] = useState("");
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");

  /* mode */
  const [mode, setMode] = useState("single");

  /* single-candidate answers */
  const [name, setName] = useState("");
  const [stage, setStage] = useState("");
  const [reason, setReason] = useState(null);
  const [reasonSkill, setReasonSkill] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [strength, setStrength] = useState("");
  const [strengthDetail, setStrengthDetail] = useState("");
  const [closing, setClosing] = useState("");
  const [talentTick, setTalentTick] = useState(false);

  /* single output + timer */
  const [middle, setMiddle] = useState("");
  const [emailText, setEmailText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [timerState, setTimerState] = useState("idle");
  const tick = useRef(null);

  /* triage state */
  const [namesText, setNamesText] = useState("");
  const [triageRows, setTriageRows] = useState([]); // {name, skill, closing, talent}
  const [triageEmails, setTriageEmails] = useState([]);
  const [triageGenerating, setTriageGenerating] = useState(false);
  const [triageElapsed, setTriageElapsed] = useState(0);
  const [triageTimer, setTriageTimer] = useState("idle");
  const triageTick = useRef(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [talentAll, setTalentAll] = useState(false);

  useEffect(() => {
    if (timerState === "running") {
      const start = Date.now() - elapsed * 1000;
      tick.current = setInterval(
        () => setElapsed(Math.floor((Date.now() - start) / 1000)),
        250
      );
      return () => clearInterval(tick.current);
    }
  }, [timerState]); // eslint-disable-line

  useEffect(() => {
    if (triageTimer === "running") {
      const start = Date.now() - triageElapsed * 1000;
      triageTick.current = setInterval(
        () => setTriageElapsed(Math.floor((Date.now() - start) / 1000)),
        250
      );
      return () => clearInterval(triageTick.current);
    }
  }, [triageTimer]); // eslint-disable-line

  const startTimer = () => {
    if (timerState === "idle") setTimerState("running");
  };
  const startTriageTimer = () => {
    if (triageTimer === "idle") setTriageTimer("running");
  };

  const reasonObj = REASONS.find((r) => r.id === reason);
  const answersComplete =
    name.trim() &&
    stage &&
    reason &&
    (!reasonObj?.needsSkill || reasonSkill) &&
    strength &&
    closing;

  const companyName = settings.company.trim() || "[company]";

  const closingText = (c) =>
    c === "active" ? shell.closing_active : c === "other" ? shell.closing_other : shell.closing_no;

  const talentBlock = `${shell.talent_line} ${settings.talentLink}`;

  const singleOpening =
    stage === "CV / application review" || !stage
      ? `Thank you for applying for the ${roleTitle || "[role]"} role with us at ${companyName}.`
      : `Thank you for taking the time to ${
          stage === "Phone screen" ? "speak with us" : "interview with us"
        } for the ${roleTitle || "[role]"} role at ${companyName}.`;

  const buildSingleEmail = (mid) =>
    `Hi ${name.trim() || "[first name]"},\n\n${singleOpening} ${shell.warm_line}\n\n${mid}\n\n${
      closing ? closingText(closing) : ""
    }${talentTick ? `\n\n${talentBlock}` : ""}\n\nThanks again for your interest in ${companyName}.\n\nBest wishes,\n${settings.sender}`;

  const buildTriageEmail = (candName, mid, rowClosing, talent) =>
    `Hi ${candName},\n\nThank you for applying for the ${roleTitle || "[role]"} role at ${companyName}. ${REVIEWED_LINE} ${shell.warm_line}\n\n${mid}\n\n${closingText(
      rowClosing
    )}${talent ? `\n\n${talentBlock}` : ""}\n\nThanks again for your interest in ${companyName}.\n\nBest wishes,\n${settings.sender}`;

  async function handleBrand() {
    setErr("");
    setBranding(true);
    try {
      const s = await brandShell(settings, companyName);
      setShell({ ...DEFAULT_SHELL, ...s });
      setBranded(true);
    } catch {
      setErr("Couldn't draft the branded template — the defaults below are still editable by hand.");
    }
    setBranding(false);
  }

  async function handleExtract() {
    setErr("");
    setExtracting(true);
    try {
      const s = await extractSkills(jd, roleTitle || "this role");
      setSkills(s.slice(0, 6));
      setReady(true);
    } catch {
      setErr("Couldn't extract skills — you can add them manually once you're in.");
    }
    setExtracting(false);
  }

  async function handleGenerate() {
    setErr("");
    setGenerating(true);
    try {
      const mid = await generateMiddle(
        {
          roleTitle,
          stage,
          reasonLabel: reasonObj.label,
          reasonSkill: reasonObj.needsSkill ? reasonSkill : "",
          reasonDetail,
          strength,
          strengthDetail,
        },
        settings
      );
      setMiddle(mid);
      setEmailText(buildSingleEmail(mid));
      setTimerState("done");
      clearInterval(tick.current);
    } catch {
      setErr("Generation failed — try again in a moment.");
    }
    setGenerating(false);
  }

  function buildGrid() {
    const names = namesText
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean)
      .slice(0, 15);
    setTriageRows(
      names.map((n) => ({ name: n, skill: "", closing: "no", talent: talentAll }))
    );
    setTriageEmails([]);
    setTriageElapsed(0);
    setTriageTimer("idle");
  }

  const decidedCount = triageRows.filter((r) => r.skill).length;

  function setAllTalent(v) {
    setTalentAll(v);
    setTriageRows(triageRows.map((r) => ({ ...r, talent: v })));
  }

  async function handleTriageGenerate() {
    setErr("");
    setTriageGenerating(true);
    try {
      const decided = triageRows.filter((r) => r.skill);
      const middles = await generateTriageMiddles(decided, roleTitle, settings);
      setTriageEmails(
        decided.map((r, i) => ({
          name: r.name,
          text: buildTriageEmail(r.name, middles[i] || "", r.closing, r.talent),
          copied: false,
        }))
      );
      setTriageTimer("done");
      clearInterval(triageTick.current);
    } catch {
      setErr("Generation failed — try again in a moment.");
    }
    setTriageGenerating(false);
  }

  function newCandidate() {
    setName(""); setStage(""); setReason(null); setReasonSkill("");
    setReasonDetail(""); setStrength(""); setStrengthDetail("");
    setClosing(""); setTalentTick(false); setMiddle(""); setEmailText("");
    setCopied(false); setElapsed(0); setTimerState("idle"); setErr("");
  }

  function resetTriage() {
    setNamesText(""); setTriageRows([]); setTriageEmails([]);
    setTriageElapsed(0); setTriageTimer("idle"); setErr(""); setCopiedAll(false);
  }

  async function copySingle() {
    try {
      await navigator.clipboard.writeText(emailText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  async function copyOne(i) {
    try {
      await navigator.clipboard.writeText(triageEmails[i].text);
      setTriageEmails(
        triageEmails.map((e, j) => (j === i ? { ...e, copied: true } : e))
      );
      setTimeout(
        () =>
          setTriageEmails((prev) =>
            prev.map((e, j) => (j === i ? { ...e, copied: false } : e))
          ),
        1800
      );
    } catch {}
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(
        triageEmails.map((e) => e.text).join("\n\n---\n\n")
      );
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1800);
    } catch {}
  }

  const answered = [name.trim(), stage, reason, strength, closing].filter(Boolean).length;

  const Chip = ({ on, children, onClick, sm }) => (
    <button type="button" className={`kb-chip${on ? " on" : ""}${sm ? " sm" : ""}`} onClick={onClick}>
      {children}
    </button>
  );

  const shellEditor = (
    <div className="kb-shellbox">
      <div className="kb-step" style={{ marginBottom: 2 }}>
        Your template shell {branded ? "· drafted in your voice — edit freely" : "· defaults — edit freely"}
      </div>
      <label className="kb-label">Warm line (after the thank-you)</label>
      <input className="kb-input" value={shell.warm_line}
        onChange={(e) => setShell({ ...shell, warm_line: e.target.value })} />
      <label className="kb-label">Closing — actively encourage reapplying</label>
      <input className="kb-input" value={shell.closing_active}
        onChange={(e) => setShell({ ...shell, closing_active: e.target.value })} />
      <label className="kb-label">Closing — open door for other roles</label>
      <input className="kb-input" value={shell.closing_other}
        onChange={(e) => setShell({ ...shell, closing_other: e.target.value })} />
      <label className="kb-label">Closing — not right now</label>
      <input className="kb-input" value={shell.closing_no}
        onChange={(e) => setShell({ ...shell, closing_no: e.target.value })} />
      <label className="kb-label">Register-interest invitation (link follows it)</label>
      <input className="kb-input" value={shell.talent_line}
        onChange={(e) => setShell({ ...shell, talent_line: e.target.value })} />
      <label className="kb-label">Register-interest link (dummy for now)</label>
      <input className="kb-input" value={settings.talentLink}
        onChange={(e) => setSettings({ ...settings, talentLink: e.target.value })} />
    </div>
  );

  /* ------------------------------------------------------------ */
  return (
    <div className="kb">
      <style>{css}</style>
      <div className="kb-wrap">
        <div className="kb-top">
          <div>
            <h1 className="kb-title">
              Kindly<span>.</span>
            </h1>
            <p className="kb-sub">
              Rejection emails that respect the candidate — reviewed by a human,
              written in your voice, defensible on the record.
            </p>
          </div>
          {mode === "single" ? (
            <div className={`kb-timer ${timerState === "done" ? "done" : ""}`}>
              <span className="dot" />
              {timerState === "done" ? `Written in ${elapsed}s` : `${elapsed}s`}
            </div>
          ) : (
            <div className={`kb-timer ${triageTimer === "done" ? "done" : ""}`}>
              <span className="dot" />
              {triageTimer === "done"
                ? `${triageEmails.length} emails in ${triageElapsed}s`
                : `${triageElapsed}s`}
            </div>
          )}
        </div>

        {/* -------- SETUP -------- */}
        {!ready && (
          <div className="kb-setup">
            <div className="kb-card">
              <div className="kb-step">Setup 1 of 2 · Your company</div>
              <h2 className="kb-q">Tell us who's writing</h2>
              <label className="kb-label">Company name</label>
              <input className="kb-input" value={settings.company}
                onChange={(e) => setSettings({ ...settings, company: e.target.value })}
                placeholder="e.g. Screwfix" />
              <label className="kb-label">What you do — a line or two</label>
              <textarea className="kb-input kb-area" style={{ minHeight: 60 }} value={settings.about}
                onChange={(e) => setSettings({ ...settings, about: e.target.value })}
                placeholder="e.g. Trade retailer helping tradespeople get the job done — 900+ UK stores, big on pace and practicality." />
              <label className="kb-label">Values & behaviours</label>
              <textarea className="kb-input kb-area" style={{ minHeight: 60 }} value={settings.values}
                onChange={(e) => setSettings({ ...settings, values: e.target.value })}
                placeholder="e.g. Be Brave, Make a Difference, Win Together — we back people who get stuck in." />
              <label className="kb-label">Employer brand voice & style</label>
              <textarea className="kb-input kb-area" style={{ minHeight: 60 }} value={settings.voice}
                onChange={(e) => setSettings({ ...settings, voice: e.target.value })}
                placeholder="e.g. Straight-talking and warm. We say 'colleagues' not 'employees'. Down-to-earth, no corporate jargon, first names always." />
              <label className="kb-label">Sign-off from</label>
              <input className="kb-input" value={settings.sender}
                onChange={(e) => setSettings({ ...settings, sender: e.target.value })} />
              <div className="kb-row">
                <button className="kb-btn amber" disabled={branding ||
                    (!settings.about.trim() && !settings.values.trim() && !settings.voice.trim())}
                  onClick={handleBrand}>
                  {branding ? "Writing in your voice…" : "✍ Draft our template in this voice"}
                </button>
              </div>
              {shellEditor}
              <p className="kb-note">
                These lines are your fixed shell — approved once, reused for every
                candidate. The recruiter chooses which closing fits each candidate,
                and ticks whether to include the register-interest invitation.
              </p>
            </div>

            <div className="kb-card">
              <div className="kb-step">Setup 2 of 2 · The role</div>
              <h2 className="kb-q">Which role is this?</h2>
              <label className="kb-label">Role title</label>
              <input className="kb-input" value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="e.g. Store Manager, Crawley" />
              <label className="kb-label">Paste the job description (or just the requirements)</label>
              <textarea className="kb-input kb-area" value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="The AI pulls out the 5-6 skills you'll compare candidates on, so rejections can say exactly which requirement the decision came down to." />
              <div className="kb-row">
                <button className="kb-btn primary" disabled={!jd.trim() || extracting}
                  onClick={handleExtract}>
                  {extracting ? "Reading the JD…" : "Extract skills & start"}
                </button>
                <button className="kb-btn ghost" onClick={() => setReady(true)}
                  disabled={!roleTitle.trim()}>
                  Skip — I'll add skills myself
                </button>
              </div>
              {err && <div className="kb-err">{err}</div>}
              <p className="kb-note">
                Setup is one-off. Then: five taps per interviewed candidate, or one
                tap per CV in triage mode.
              </p>
            </div>
          </div>
        )}

        {/* -------- MAIN -------- */}
        {ready && (
          <>
            <div className="kb-mode">
              <Chip on={mode === "single"} onClick={() => setMode("single")}>
                Interviewed candidate · 5 taps
              </Chip>
              <Chip on={mode === "triage"} onClick={() => setMode("triage")}>
                CV triage · 1 tap per candidate
              </Chip>
              <span style={{ flex: 1 }} />
              <button className="kb-btn ghost" style={{ padding: "8px 14px", fontSize: 13 }}
                onClick={() => { setReady(false); newCandidate(); resetTriage(); }}>
                Edit setup
              </button>
            </div>

            {/* ---- SINGLE MODE ---- */}
            {mode === "single" && (
              <div className="kb-grid">
                <div>
                  <div className="kb-card">
                    <div className="kb-meta">
                      <span className="kb-pill">
                        {companyName} · {roleTitle || "Untitled role"}
                      </span>
                    </div>

                    <div className="kb-progress">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <i key={i} className={i < answered ? "on" : ""} />
                      ))}
                    </div>

                    <div className="kb-step">Question 1 of 5</div>
                    <h3 className="kb-q">Candidate's first name</h3>
                    <input className="kb-input" value={name}
                      onChange={(e) => { startTimer(); setName(e.target.value); }}
                      placeholder="e.g. Priya" />

                    <div style={{ height: 20 }} />
                    <div className="kb-step">Question 2 of 5</div>
                    <h3 className="kb-q">How far did they get?</h3>
                    <div className="kb-chips">
                      {STAGES.map((s) => (
                        <Chip key={s} on={stage === s} onClick={() => { startTimer(); setStage(s); }}>
                          {s}
                        </Chip>
                      ))}
                    </div>

                    <div style={{ height: 20 }} />
                    <div className="kb-step">Question 3 of 5</div>
                    <h3 className="kb-q">What did the decision come down to?</h3>
                    <div className="kb-chips">
                      {REASONS.map((r) => (
                        <Chip key={r.id} on={reason === r.id}
                          onClick={() => { startTimer(); setReason(r.id); if (!r.needsSkill) setReasonSkill(""); }}>
                          {r.label}
                        </Chip>
                      ))}
                    </div>

                    {reasonObj?.needsSkill && (
                      <>
                        <div style={{ height: 12 }} />
                        <label className="kb-label" style={{ marginTop: 0 }}>…in which skill from the JD?</label>
                        <div className="kb-chips">
                          {skills.length === 0 && (
                            <span className="kb-note" style={{ marginTop: 0 }}>
                              No skills yet — add one below.
                            </span>
                          )}
                          {skills.map((s) => (
                            <Chip key={s} on={reasonSkill === s} onClick={() => setReasonSkill(s)}>
                              {s}
                            </Chip>
                          ))}
                        </div>
                        <div className="kb-skillbar">
                          <input className="kb-input" value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            placeholder="Add a skill…" />
                          <button className="kb-btn ghost"
                            onClick={() => {
                              if (newSkill.trim()) {
                                setSkills([...skills, newSkill.trim()]);
                                setReasonSkill(newSkill.trim());
                                setNewSkill("");
                              }
                            }}>
                            Add
                          </button>
                        </div>
                        <div style={{ height: 10 }} />
                        <input className="kb-input" value={reasonDetail}
                          onChange={(e) => setReasonDetail(e.target.value)}
                          placeholder="Optional: a few words of nuance (e.g. 'multi-site, 200+ heads')" />
                      </>
                    )}

                    <div style={{ height: 20 }} />
                    <div className="kb-step">Question 4 of 5</div>
                    <h3 className="kb-q">What genuinely stood out about them?</h3>
                    <div className="kb-chips">
                      {STRENGTHS.map((s) => (
                        <Chip key={s} on={strength === s} onClick={() => { startTimer(); setStrength(s); }}>
                          {s}
                        </Chip>
                      ))}
                    </div>
                    <div style={{ height: 10 }} />
                    <input className="kb-input" value={strengthDetail}
                      onChange={(e) => setStrengthDetail(e.target.value)}
                      placeholder="Optional: make it specific (e.g. 'her Q4 campaign example')" />

                    <div style={{ height: 20 }} />
                    <div className="kb-step">Question 5 of 5</div>
                    <h3 className="kb-q">How should it end?</h3>
                    <div className="kb-chips">
                      {CLOSING_OPTIONS.map((c) => (
                        <Chip key={c.id} on={closing === c.id}
                          onClick={() => { startTimer(); setClosing(c.id); }}>
                          {c.label}
                        </Chip>
                      ))}
                    </div>
                    <label className="kb-tick">
                      <input type="checkbox" checked={talentTick}
                        onChange={(e) => setTalentTick(e.target.checked)} />
                      <span>
                        Invite them to register interest in similar roles
                        <span className="hint">Adds your register-interest line and link before the sign-off</span>
                      </span>
                    </label>

                    <div className="kb-row">
                      <button className="kb-btn primary" disabled={!answersComplete || generating}
                        onClick={handleGenerate}>
                        {generating ? "Writing…" : "Write the email"}
                      </button>
                      <button className="kb-btn ghost" onClick={newCandidate}>
                        New candidate
                      </button>
                    </div>
                    {err && <div className="kb-err">{err}</div>}
                  </div>
                </div>

                <div className="kb-card">
                  <div className="kb-meta">
                    <h3 className="kb-q" style={{ margin: 0 }}>
                      {middle ? "Ready to send" : "Live preview"}
                    </h3>
                    {emailText && (
                      <button className="kb-btn primary" onClick={copySingle} style={{ padding: "8px 14px" }}>
                        {copied ? "Copied ✓" : "Copy email"}
                      </button>
                    )}
                  </div>

                  {!middle ? (
                    <div className="kb-preview">
                      {`Hi ${name.trim() || "[first name]"},\n\n${singleOpening} ${shell.warm_line}`}
                      <span className="ai waiting">
                        {answersComplete
                          ? "Tap \u201CWrite the email\u201D — the personalised 2\u20133 sentences land here, in your brand voice."
                          : "The AI-written middle appears here once you've answered the five questions."}
                      </span>
                      {`${closing ? closingText(closing) + "\n\n" : ""}${
                        talentTick ? talentBlock + "\n\n" : ""
                      }Thanks again for your interest in ${companyName}.\n\nBest wishes,\n${settings.sender}`}
                    </div>
                  ) : (
                    <>
                      <textarea className="kb-edit" value={emailText}
                        onChange={(e) => setEmailText(e.target.value)} />
                      <p className="kb-note">
                        Edit anything before sending — framed around the strength of
                        the field, never the candidate's shortcomings, with protected
                        characteristics hard-blocked.
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ---- TRIAGE MODE ---- */}
            {mode === "triage" && (
              <div className="kb-grid">
                <div className="kb-card">
                  <div className="kb-meta">
                    <span className="kb-pill">
                      {companyName} · {roleTitle || "Untitled role"} · CV stage
                    </span>
                  </div>

                  {triageRows.length === 0 ? (
                    <>
                      <div className="kb-step">Step 1</div>
                      <h3 className="kb-q">Who are you rejecting at CV stage?</h3>
                      <textarea className="kb-input kb-area" value={namesText}
                        onChange={(e) => setNamesText(e.target.value)}
                        placeholder={"One first name per line, e.g.\nPriya\nMarcus\nSofia\nJake"} />
                      <label className="kb-tick">
                        <input type="checkbox" checked={talentAll}
                          onChange={(e) => setTalentAll(e.target.checked)} />
                        <span>
                          Include the register-interest link for everyone by default
                          <span className="hint">You can still switch it per candidate in the grid</span>
                        </span>
                      </label>
                      <div className="kb-row">
                        <button className="kb-btn primary" disabled={!namesText.trim()}
                          onClick={buildGrid}>
                          Build the triage grid
                        </button>
                      </div>
                      <p className="kb-note">
                        Prototype caps at 15 names per batch. One tap per candidate:
                        which JD requirement did the decision come down to? Your tap
                        is the record of human review — it's what lets the email
                        honestly say a person read the application.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="kb-meta">
                        <div className="kb-step" style={{ marginBottom: 0 }}>
                          Step 2 · Tap the deciding requirement
                        </div>
                        <span className="kb-count">
                          {decidedCount}/{triageRows.length} decided
                        </span>
                      </div>
                      <div className="kb-subrow" style={{ marginBottom: 10, marginTop: 0 }}>
                        <label className="kb-enc">
                          <input type="checkbox" checked={talentAll}
                            onChange={(e) => setAllTalent(e.target.checked)} />
                          register-interest link for all
                        </label>
                      </div>
                      {triageRows.map((row, i) => (
                        <div key={i} className={`kb-triage-row${row.skill ? " decided" : ""}`}>
                          <div className="kb-triage-head">
                            <span className="kb-triage-name">{row.name}</span>
                          </div>
                          <div className="kb-chips">
                            {skills.map((s) => (
                              <Chip key={s} sm on={row.skill === s}
                                onClick={() => {
                                  startTriageTimer();
                                  const next = [...triageRows];
                                  next[i] = { ...row, skill: s };
                                  setTriageRows(next);
                                }}>
                                {s}
                              </Chip>
                            ))}
                            <Chip sm on={row.skill === "__changed__"}
                              onClick={() => {
                                startTriageTimer();
                                const next = [...triageRows];
                                next[i] = { ...row, skill: "__changed__" };
                                setTriageRows(next);
                              }}>
                              role changed / paused
                            </Chip>
                          </div>
                          <div className="kb-subrow">
                            <span className="lbl">Ends:</span>
                            {TRIAGE_CLOSINGS.map((c) => (
                              <Chip key={c.id} sm on={row.closing === c.id}
                                onClick={() => {
                                  const next = [...triageRows];
                                  next[i] = { ...row, closing: c.id };
                                  setTriageRows(next);
                                }}>
                                {c.label}
                              </Chip>
                            ))}
                            <label className="kb-enc">
                              <input type="checkbox" checked={row.talent}
                                onChange={(e) => {
                                  const next = [...triageRows];
                                  next[i] = { ...row, talent: e.target.checked };
                                  setTriageRows(next);
                                }} />
                              🔗 similar roles
                            </label>
                          </div>
                        </div>
                      ))}
                      <div className="kb-row">
                        <button className="kb-btn primary"
                          disabled={decidedCount === 0 || triageGenerating}
                          onClick={handleTriageGenerate}>
                          {triageGenerating
                            ? "Writing…"
                            : `Write ${decidedCount} email${decidedCount === 1 ? "" : "s"}`}
                        </button>
                        <button className="kb-btn ghost" onClick={resetTriage}>
                          New batch
                        </button>
                      </div>
                      {err && <div className="kb-err">{err}</div>}
                    </>
                  )}
                </div>

                <div className="kb-card">
                  <div className="kb-meta">
                    <h3 className="kb-q" style={{ margin: 0 }}>
                      {triageEmails.length ? "Ready to send" : "Emails appear here"}
                    </h3>
                    {triageEmails.length > 0 && (
                      <button className="kb-btn primary" onClick={copyAll}
                        style={{ padding: "8px 14px" }}>
                        {copiedAll ? "Copied ✓" : "Copy all"}
                      </button>
                    )}
                  </div>

                  {triageEmails.length === 0 ? (
                    <div className="kb-preview">
                      <span className="ai waiting">
                        Each candidate gets an individual email naming the requirement
                        their review came down to, the closing the recruiter chose,
                        and — where ticked — an invitation to register interest in
                        similar roles, plus the line every applicant deserves:
                        "{REVIEWED_LINE}"
                      </span>
                    </div>
                  ) : (
                    triageEmails.map((e, i) => (
                      <div key={i} className="kb-mail">
                        <div className="kb-mail-head">
                          <span className="kb-triage-name">{e.name}</span>
                          <button className="kb-btn ghost" style={{ padding: "6px 12px", fontSize: 13 }}
                            onClick={() => copyOne(i)}>
                            {e.copied ? "Copied ✓" : "Copy"}
                          </button>
                        </div>
                        <pre>{e.text}</pre>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
