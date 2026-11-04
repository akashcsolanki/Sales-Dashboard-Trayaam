import { identityAt } from "./office/identities.js";
export const STAGES = [
  "Not contacted",
  "Researching",
  "Qualified",
  "Draft ready",
  "Contacted",
  "Replied",
  "Meeting booked",
  "Proposal sent",
  "Negotiation",
  "Won",
  "Lost",
  "Nurture",
  "Do not contact",
];
export const CHANNELS = [
  "Unassigned",
  "Email",
  "LinkedIn",
  "Phone",
  "WhatsApp",
  "Website form",
  "Referral",
  "Other",
];
export const ROLES = [
  ['dataresearch','Data researcher','Discover evidence-backed markets, companies and prospect sources','Data lab'],
  ['extraction','Data extraction specialist','Extract structured company and contact fields from approved sources','Data lab'],
  ['dataquality','Data quality analyst','Deduplicate entities, resolve conflicts and validate provenance','Data lab'],
  ['intent','Buying-signal analyst','Monitor dated hiring, funding and relevant demand evidence','Intelligence'],
  ['territory','Territory strategist','Design market coverage and prioritize account segments','Strategy'],
  ['bdr','Business development rep','Develop new outbound opportunities and agency partnerships','Pipeline'],
  ['salesengineer','Solutions engineer','Map technical requirements, demonstrations and solution feasibility','Pipeline'],
  ['enablement','Sales enablement lead','Build playbooks, train specialists and review message quality','Operations'],
  ['partnerships','Partnership manager','Develop white-label channel relationships and joint delivery plans','Retention'],
  ['accountmanager','Account manager','Maintain client relationships, renewals and expansion plans','Retention'],
  ['deliverability','Deliverability specialist','Review sender health, authentication and bounce evidence','Operations'],
  ['automation','Sales automation engineer','Maintain approved workflows, integrations and agent handoffs','Data lab'],
  ['dealdesk','Deal desk specialist','Review commercial terms, pricing and scope acceptance','Pipeline'],
  [
    "orchestrator",
    "Sales director",
    "Prioritize work, route handoffs and balance capacity",
    "Strategy",
  ],
  [
    "research",
    "Account researcher",
    "Validate company, industry, location and service fit",
    "Intelligence",
  ],
  [
    "enrichment",
    "Contact researcher",
    "Find published decision makers and source every field",
    "Intelligence",
  ],
  [
    "hiring",
    "Hiring analyst",
    "Recheck official vacancies and candidate fit",
    "Intelligence",
  ],
  [
    "qualification",
    "Qualification specialist",
    "Assess fit, buying signals and readiness",
    "Intelligence",
  ],
  [
    "compliance",
    "Outreach reviewer",
    "Review suppression, channel eligibility and claims",
    "Operations",
  ],
  [
    "email",
    "Email specialist",
    "Research and draft personalized email sequences",
    "Outbound",
  ],
  [
    "linkedin",
    "LinkedIn specialist",
    "Prepare connection notes and relevant follow-ups",
    "Outbound",
  ],
  [
    "phone",
    "Calling specialist",
    "Prepare discovery call research and scripts",
    "Outbound",
  ],
  [
    "whatsapp",
    "WhatsApp specialist",
    "Prepare permission-based business conversations",
    "Outbound",
  ],
  [
    "forms",
    "Application specialist",
    "Match profile and review official opening forms",
    "Outbound",
  ],
  [
    "copy",
    "Sales copywriter",
    "Develop evidence-based messaging and experiments",
    "Creative",
  ],
  [
    "portfolio",
    "Portfolio strategist",
    "Select relevant case studies and supporting assets",
    "Creative",
  ],
  [
    "sdr",
    "Sales development rep",
    "Qualify replies and prepare meeting handoffs",
    "Pipeline",
  ],
  [
    "ae",
    "Account executive",
    "Run discovery, proposals and commercial negotiation",
    "Pipeline",
  ],
  [
    "proposal",
    "Proposal specialist",
    "Prepare fixed-price scopes, milestones and acceptance",
    "Pipeline",
  ],
  [
    "revops",
    "Revenue operations",
    "Maintain records, task hygiene and stage accuracy",
    "Operations",
  ],
  [
    "analytics",
    "Performance analyst",
    "Analyze channel cohorts and experiment outcomes",
    "Operations",
  ],
  [
    "success",
    "Client success specialist",
    "Prepare onboarding and partnership expansion",
    "Retention",
  ],
];
export const EMPLOYEES = ROLES.flatMap(([role, title, mission, team], roleIndex) =>
  Array.from({ length: 4 }, (_, i) => ({
    id: `${role}-${i + 1}`,
    role,
    title,
    mission,
    team,
    ...identityAt(roleIndex * 4 + i),
  })),
);
export function metrics(prospects, events = []) {
  const sent = events.filter(
    (e) => e.type === "outreach" && e.outcome === "Sent",
  );
  const replied = new Set(
    events
      .filter((e) => e.type === "outreach" && e.outcome === "Replied")
      .map((e) => e.prospectId),
  );
  const reached = new Set(sent.map((e) => e.prospectId));
  const replyCohort = [...replied].filter((id) => reached.has(id));
  return {
    total: prospects.length,
    shortlist: prospects.filter((p) => p.shortlist).length,
    sent: sent.length,
    reached: reached.size,
    replies: replied.size,
    replyRate: reached.size ? replyCohort.length / reached.size : null,
    meetings: prospects.filter((p) => p.stage === "Meeting booked").length,
    won: prospects.filter((p) => p.stage === "Won").length,
    pipeline: prospects
      .filter((p) => !["Won", "Lost", "Do not contact"].includes(p.stage))
      .reduce((s, p) => s + (Number(p.value) || 0), 0),
    suppressed: prospects.filter((p) => p.suppressed).length,
    due: prospects.filter(
      (p) =>
        p.nextDate &&
        p.nextDate <= new Date().toISOString().slice(0, 10) &&
        !["Won", "Lost", "Do not contact"].includes(p.stage),
    ).length,
  };
}
export function filterProspects(rows, f) {
  return rows.filter(
    (p) =>
      (!f.search ||
        [p.name, p.city, p.services, p.email, p.job?.["Live advertised role"]]
          .join(" ")
          .toLowerCase()
          .includes(f.search.toLowerCase())) &&
      (!f.stage || p.stage === f.stage) &&
      (!f.channel || p.channel === f.channel) &&
      (!f.industry || p.industry === f.industry) &&
      (!f.city || p.city === f.city) &&
      (!f.priority ||
        (f.priority === "shortlist" ? p.shortlist : !p.shortlist)) &&
      (!f.hiring || p.shortlist),
  );
}
export function safeUrl(value) {
  try {
    const u = new URL(value);
    return ["http:", "https:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}
export function exportCSV(rows) {
  const columns = [
    "id",
    "name",
    "city",
    "country",
    "industry",
    "priority",
    "stage",
    "channel",
    "owner",
    "email",
    "phone",
    "website",
    "nextAction",
    "nextDate",
    "suppressed",
    "eligibility",
  ];
  const escape = (v) =>
    '"' +
    String(v ?? "")
      .replace(/^[\s]*[=+@\-\t\r\n]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  return [
    columns.join(","),
    ...rows.map((r) => columns.map((c) => escape(r[c])).join(",")),
  ].join("\r\n");
}
