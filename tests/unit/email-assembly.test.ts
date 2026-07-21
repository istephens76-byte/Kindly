import { describe, expect, it } from "vitest";
import {
  buildSingleEmail,
  buildTriageEmail,
  REVIEWED_LINE,
  type SingleEmailInput,
  type TriageEmailInput,
} from "../../src/lib/email-assembly";

const base: SingleEmailInput = {
  candidateFirstName: "Priya",
  roleTitle: "Social Media Manager",
  stage: "CV / application review",
  companyName: "Acme",
  warmLine: "We know applying takes real effort.",
  middle: "Other applicants brought more hands-on experience of budgeting.",
  closingText: "We wish you every success with your search.",
  talentLine: "Register your interest here:",
  talentLinkUrl: "https://careers.example.com/register-interest",
  talentLinkIncluded: false,
  senderName: "The Talent Team",
};

describe("buildSingleEmail", () => {
  it("never includes the triage reviewed line", () => {
    const email = buildSingleEmail(base);
    expect(email).not.toContain("individually reviewed");
  });

  it("uses the applying opening for CV-stage rejections", () => {
    const email = buildSingleEmail(base);
    expect(email).toContain(
      "Thank you for applying for the Social Media Manager role with us at Acme.",
    );
  });

  it("uses the phone-screen opening verb", () => {
    const email = buildSingleEmail({ ...base, stage: "Phone screen" });
    expect(email).toContain(
      "Thank you for taking the time to speak with us for the Social Media Manager role at Acme.",
    );
  });

  it("uses the interview opening verb for later stages", () => {
    const email = buildSingleEmail({ ...base, stage: "First interview" });
    expect(email).toContain(
      "Thank you for taking the time to interview with us for the Social Media Manager role at Acme.",
    );
    const finalEmail = buildSingleEmail({ ...base, stage: "Final interview" });
    expect(finalEmail).toContain("interview with us");
  });

  it("omits the talent block when not ticked", () => {
    const email = buildSingleEmail({ ...base, talentLinkIncluded: false });
    expect(email).not.toContain(base.talentLine);
    expect(email).not.toContain(base.talentLinkUrl);
  });

  it("includes the talent block when ticked", () => {
    const email = buildSingleEmail({ ...base, talentLinkIncluded: true });
    expect(email).toContain(base.talentLine);
    expect(email).toContain(base.talentLinkUrl);
  });

  it("always includes the greeting, middle, closing and sign-off", () => {
    for (const talentLinkIncluded of [true, false]) {
      const email = buildSingleEmail({ ...base, talentLinkIncluded });
      expect(email).toContain(`Hi ${base.candidateFirstName},`);
      expect(email).toContain(base.middle);
      expect(email).toContain(base.closingText);
      expect(email).toContain(`Best wishes,\n${base.senderName}`);
    }
  });
});

const triageBase: TriageEmailInput = {
  candidateFirstName: "Marcus",
  roleTitle: "Ops Lead",
  companyName: "Acme",
  warmLine: "We know applying takes real effort.",
  middle: "Other applicants brought deeper hands-on experience of budget ownership.",
  closingText: "We'd be happy to see your name for other roles.",
  talentLine: "Register your interest here:",
  talentLinkUrl: "https://careers.example.com/register-interest",
  talentLinkIncluded: false,
  senderName: "The Talent Team",
};

describe("buildTriageEmail", () => {
  it("always includes the reviewed line", () => {
    const email = buildTriageEmail(triageBase);
    expect(email).toContain(REVIEWED_LINE);
  });

  it("uses the CV-stage applying opening regardless of any stage concept", () => {
    const email = buildTriageEmail(triageBase);
    expect(email).toContain(
      "Thank you for applying for the Ops Lead role at Acme.",
    );
  });

  it("omits the talent block when not ticked", () => {
    const email = buildTriageEmail({ ...triageBase, talentLinkIncluded: false });
    expect(email).not.toContain(triageBase.talentLine);
  });

  it("includes the talent block when ticked", () => {
    const email = buildTriageEmail({ ...triageBase, talentLinkIncluded: true });
    expect(email).toContain(triageBase.talentLine);
    expect(email).toContain(triageBase.talentLinkUrl);
  });

  it("always includes the greeting, middle, closing and sign-off", () => {
    for (const talentLinkIncluded of [true, false]) {
      const email = buildTriageEmail({ ...triageBase, talentLinkIncluded });
      expect(email).toContain(`Hi ${triageBase.candidateFirstName},`);
      expect(email).toContain(triageBase.middle);
      expect(email).toContain(triageBase.closingText);
      expect(email).toContain(`Best wishes,\n${triageBase.senderName}`);
    }
  });
});
