import test from "node:test";
import assert from "node:assert/strict";
import {
  metrics,
  filterProspects,
  EMPLOYEES,
  ROLES,
  exportCSV,
  safeUrl,
} from "../src/model.js";
test("four independent seats for each role", () => {
  assert.equal(new Set(EMPLOYEES.map((e) => e.id)).size, 76);
  for (const [role] of ROLES)
    assert.equal(EMPLOYEES.filter((e) => e.role === role).length, 4);
});
test("no denominator gives unknown rate, not fabricated zero", () => {
  assert.equal(metrics([], []).replyRate, null);
});
test("reply cohort deduplicates accounts and excludes unsolicited replies", () => {
  const es = [
    { type: "outreach", outcome: "Sent", prospectId: "a" },
    { type: "outreach", outcome: "Sent", prospectId: "a" },
    { type: "outreach", outcome: "Sent", prospectId: "b" },
    { type: "outreach", outcome: "Replied", prospectId: "a" },
    { type: "outreach", outcome: "Replied", prospectId: "z" },
  ];
  const m = metrics([], es);
  assert.equal(m.replyRate, 0.5);
  assert.equal(m.reached, 2);
  assert.equal(m.sent, 3);
});
test("filters intersect shortlist, channel and industry", () => {
  const rows = [
    { name: "One", shortlist: true, channel: "Email", industry: "Design" },
    { name: "Two", shortlist: true, channel: "LinkedIn", industry: "Design" },
  ];
  assert.equal(
    filterProspects(rows, {
      priority: "shortlist",
      channel: "Email",
      industry: "Design",
    }).length,
    1,
  );
});
test("exports neutralize spreadsheet formulas and escape quotes", () => {
  const csv = exportCSV([{ name: '=IMPORTXML("x")', phone: "+44123" }]);
  assert.ok(csv.includes("'=IMPORTXML"));
  assert.ok(csv.includes("'+44123"));
});
test("external links reject active URL schemes", () => {
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(safeUrl("https://trayaam.com"), "https://trayaam.com/");
});
