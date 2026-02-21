import type { RemoteEUTestCase } from "./schema";

/**
 * Labeled test data for Remote EU classification evaluation.
 * 
 * Each case represents a tricky scenario that should be correctly classified.
 * Test cases cover edge cases like:
 * - EMEA vs EU distinction
 * - UK post-Brexit status
 * - Switzerland (not in EU)
 * - EEA vs EU differences
 * - Timezone-based ambiguity
 * - Work authorization requirements
 */
export const remoteEUTestCases: RemoteEUTestCase[] = [
  {
    id: "clear-remote-eu-1",
    description: "Clear Remote EU position",
    jobPosting: {
      title: "Senior Software Engineer",
      location: "Remote - EU",
      description:
        "We are hiring across all EU countries. Work from anywhere in the European Union.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "high",
      reason: "Explicitly states EU remote work",
    },
  },
  {
    id: "emea-vs-eu-1",
    description: "EMEA includes EU as primary work region",
    jobPosting: {
      title: "Product Manager",
      location: "Remote - EMEA",
      description:
        "Looking for candidates across EMEA region including UK, Switzerland, and Middle East.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "medium",
      reason:
        "EU is the primary work region within EMEA",
    },
  },
  {
    id: "emea-restricted-to-eu",
    description: "EMEA but restricted to EU countries only",
    jobPosting: {
      title: "DevOps Engineer",
      location: "Remote - EMEA",
      description:
        "Remote position available for candidates in EU member states only. Must have right to work in EU.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "high",
      reason: "EMEA explicitly restricted to EU member states",
    },
  },
  {
    id: "timezone-cet-1",
    description: "CET timezone + European business hours (targets EU workers)",
    jobPosting: {
      title: "Frontend Developer",
      location: "Remote",
      description:
        "Must work in CET timezone. Flexible hours but need to overlap with European business hours.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "medium",
      reason:
        "European business hours requirement targets EU-based workers",
    },
  },
  {
    id: "uk-only-1",
    description: "UK only (not EU post-Brexit)",
    jobPosting: {
      title: "Backend Engineer",
      location: "Remote - UK",
      description:
        "Must be based in the United Kingdom with right to work in the UK.",
    },
    expectedClassification: {
      isRemoteEU: false,
      confidence: "high",
      reason: "UK is not part of EU since Brexit",
    },
  },
  {
    id: "eu-work-authorization-1",
    description: "Requires EU work authorization",
    jobPosting: {
      title: "Data Scientist",
      location: "Remote - Europe",
      description:
        "Must have EU work authorization. We cannot sponsor visas. EU passport or residence permit required.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "high",
      reason: "Requires EU work authorization/passport",
    },
  },
  {
    id: "specific-eu-countries-1",
    description: "Lists specific EU countries",
    jobPosting: {
      title: "Full Stack Developer",
      location: "Remote - Germany, France, Spain, Italy",
      description:
        "Open to candidates in Germany, France, Spain, or Italy only.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "high",
      reason: "Lists only EU member countries",
    },
  },
  {
    id: "switzerland-1",
    description: "Switzerland only (not EU)",
    jobPosting: {
      title: "Software Architect",
      location: "Remote - Switzerland",
      description: "Must be based in Switzerland. Swiss contract.",
    },
    expectedClassification: {
      isRemoteEU: false,
      confidence: "high",
      reason: "Switzerland is not an EU member state",
    },
  },
  {
    id: "eu-with-uk-switzerland",
    description: "EU plus UK and Switzerland (mixed)",
    jobPosting: {
      title: "Engineering Manager",
      location: "Remote - EU, UK, Switzerland",
      description:
        "Open to candidates across EU member states, United Kingdom, and Switzerland.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "medium",
      reason:
        "Includes EU countries even though also includes non-EU (UK, Switzerland)",
    },
  },
  {
    id: "eea-1",
    description: "EEA (includes non-EU but has overlap)",
    jobPosting: {
      title: "QA Engineer",
      location: "Remote - EEA",
      description: "European Economic Area candidates welcome.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "medium",
      reason:
        "EEA includes all EU countries plus Norway, Iceland, Liechtenstein",
    },
  },
  {
    id: "europe-ambiguous-1",
    description: "Europe (most European remote roles accept EU candidates)",
    jobPosting: {
      title: "Product Designer",
      location: "Remote - Europe",
      description: "Looking for talented designers based anywhere in Europe.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "medium",
      reason: "Most European remote roles accept EU candidates",
    },
  },
  {
    id: "eu-schengen-area-1",
    description: "Schengen area (partially overlaps with EU)",
    jobPosting: {
      title: "Security Engineer",
      location: "Remote - Schengen Area",
      description: "Must be located in a Schengen member country.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "medium",
      reason:
        "Most Schengen countries are EU members, though includes some non-EU",
    },
  },
  {
    id: "multiple-eu-countries-1",
    description: "Multiple specific EU countries listed",
    jobPosting: {
      title: "Senior Backend Developer",
      location: "Remote - France, Germany, Netherlands",
      description:
        "Accepting applications from France, Germany, or Netherlands.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "high",
      reason: "All mentioned locations are EU member states",
    },
  },
  {
    id: "worldwide-position-1",
    description: "Worldwide remote (EU workers can work these roles)",
    jobPosting: {
      title: "Product Manager",
      location: "Remote - Worldwide",
      description:
        "We hire talented professionals from anywhere in the world.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "medium",
      reason: "Worldwide/global remote roles are accessible to EU workers",
    },
  },
  {
    id: "cest-timezone-1",
    description: "CEST timezone (not EU-exclusive)",
    jobPosting: {
      title: "Frontend Developer",
      location: "Remote - CEST timezone",
      description:
        "Must be available during CEST business hours. Flexible arrangements.",
    },
    expectedClassification: {
      isRemoteEU: false,
      confidence: "medium",
      reason: "CEST timezone includes non-EU countries",
    },
  },
  {
    id: "eu-residency-requirement-1",
    description: "Explicit EU residency requirement",
    jobPosting: {
      title: "Compliance Officer",
      location: "Remote - EU",
      description:
        "Must have EU residency. Candidates must be based in an EU country.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "high",
      reason: "Explicit EU residency requirement",
    },
  },
  {
    id: "nordic-countries-only",
    description: "Nordic/Scandinavian countries (all EU except Norway)",
    jobPosting: {
      title: "Data Engineer",
      location: "Remote - Nordic Countries",
      description:
        "Looking for talented engineers in Sweden, Denmark, or Finland.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "medium",
      reason:
        "Sweden, Denmark, Finland are EU members (though may include non-EU Nordic countries)",
    },
  },
  {
    id: "hybrid-office-europe",
    description: "Hybrid role in European office (not fully remote)",
    jobPosting: {
      title: "Software Engineer",
      location: "Berlin, Germany (Hybrid)",
      description:
        "2-3 days per week in office in Berlin, Germany. EU candidates preferred.",
    },
    expectedClassification: {
      isRemoteEU: false,
      confidence: "high",
      reason: "Position is hybrid, not fully remote",
    },
  },
  {
    id: "eu-preferred-not-required",
    description: "EU preferred but not required",
    jobPosting: {
      title: "Frontend Engineer",
      location: "Remote",
      description:
        "EU-based candidates preferred but not required. We work with global teams.",
    },
    expectedClassification: {
      isRemoteEU: false,
      confidence: "medium",
      reason: "EU is preferred but not a requirement - position is open globally",
    },
  },
  {
    id: "eastern-europe-eu-subset",
    description: "Eastern European countries that are EU members",
    jobPosting: {
      title: "Backend Developer",
      location: "Remote - Poland, Czech Republic, Hungary",
      description:
        "Open to candidates from Central and Eastern Europe EU member states.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "high",
      reason: "All mentioned countries are EU members",
    },
  },
  {
    id: "visa-sponsorship-available",
    description: "Visa sponsorship available outside EU",
    jobPosting: {
      title: "Senior Engineer",
      location: "Remote - EU",
      description:
        "Based in EU. Visa sponsorship available for qualified candidates outside EU.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "high",
      reason: "Primary location is EU; sponsorship is secondary",
    },
  },
  {
    id: "southern-europe-subset",
    description: "Southern European countries (all EU)",
    jobPosting: {
      title: "Product Designer",
      location: "Remote - Spain, Italy, Greece, Portugal",
      description:
        "Candidates based in Southern Europe welcome to apply.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "high",
      reason: "Spain, Italy, Greece, and Portugal are all EU members",
    },
  },
  {
    id: "eu-timezone-only-1",
    description: "EU Timezone signal only — not explicit EU residency (Sweatpals real example)",
    jobPosting: {
      title: "Data & Growth Analyst",
      location: "Remote | EU Timezone",
      description:
        "Sweatpals is the community-first fitness platform turning workouts into social experiences. Backed by a16z speedrun, Patron, Kevin Hart, Pear VC, founders of Instacart and Dreamworks Animations.\n\nThe Role\nRemote | EU Timezone\n\nWe're looking for a Data & Growth Analyst to own the analytics backbone of our marketplace. You'll sit within the AI Squad, reporting to the Head of AI, but your work will directly support Product and Growth decisions.\n\nThis is a high-ownership role where you'll shape how we measure success, run experiments, and make decisions. Use AI tools daily to accelerate analysis, debugging, and documentation.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "medium",
      reason: "EU timezone requirement targets EU-based workers but does not require EU residency/work auth",
    },
  },

  // --- New cases: worldwide + exclusion signals ---

  {
    id: "worldwide-us-only-exclusion-1",
    description: "Worldwide posting but requires US work authorization",
    jobPosting: {
      title: "Senior Software Engineer",
      location: "Remote - Worldwide",
      description:
        "We hire globally! However, this role requires US work authorization. Must be legally authorized to work in the United States. No visa sponsorship available.",
    },
    expectedClassification: {
      isRemoteEU: false,
      confidence: "high",
      reason: "Despite worldwide location, US work authorization requirement excludes EU workers",
    },
  },
  {
    id: "worldwide-us-only-exclusion-2",
    description: "Global remote but US-only requirement in description",
    jobPosting: {
      title: "Product Designer",
      location: "Remote",
      description:
        "Fully remote position. Must be based in the US. US citizens and permanent residents only. We do not hire outside the United States.",
    },
    expectedClassification: {
      isRemoteEU: false,
      confidence: "high",
      reason: "Explicit US-only requirement overrides remote status",
    },
  },
  {
    id: "worldwide-eu-office-present",
    description: "Worldwide remote with EU office presence",
    jobPosting: {
      title: "Engineering Manager",
      location: "Remote - Worldwide",
      description:
        "Fully remote role open to candidates worldwide. Our main offices are in Berlin, Germany and Amsterdam, Netherlands. Team syncs happen during European business hours.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "medium",
      reason: "Worldwide remote with EU office presence suggests EU-friendly",
    },
  },
  {
    id: "emea-eu-work-auth",
    description: "EMEA with explicit EU work authorization requirement",
    jobPosting: {
      title: "Backend Engineer",
      location: "Remote - EMEA",
      description:
        "EMEA-based position. Candidates must have EU work authorization or be a citizen of an EU member state. We operate primarily out of our Dublin office.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "high",
      reason: "EMEA + EU work authorization requirement = strong EU signal",
    },
  },
  {
    id: "cet-plus-minus-2-hours",
    description: "CET ± 2 hours overlap requirement",
    jobPosting: {
      title: "Full Stack Developer",
      location: "Remote",
      description:
        "Fully remote position. We require overlap with CET ± 2 hours for daily standups. European business hours preferred. Team is distributed across Europe.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "medium",
      reason: "CET ± 2 hours overlap with European team targets EU-based workers",
    },
  },
  {
    id: "worldwide-cet-offset-in-location",
    description: "Worldwide with ±N hours CET in location field (Ashby pattern, real Peec AI job)",
    jobPosting: {
      title: "Senior Design Engineer (Remote) @ Peec AI",
      location: "Worldwide (±3 hours CET)",
      description:
        "Take ownership of complex frontend features end-to-end. One of Europe's fastest-growing Series A startups. Remote working (applicants must be located within ±3 hours of the Berlin (CET) time).",
      workplace_type: "remote",
      is_remote: true,
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "medium",
      reason: "CET ± N hours timezone overlap in worldwide role targets EU-compatible workers",
    },
  },
  {
    id: "remote-us-based-required",
    description: "Remote but US-based only",
    jobPosting: {
      title: "AI Engineer",
      location: "Remote - US",
      description:
        "Remote position. Must be based in the United States. We offer competitive benefits for US employees. Work from home anywhere in the US.",
    },
    expectedClassification: {
      isRemoteEU: false,
      confidence: "high",
      reason: "Explicitly restricted to US-based candidates",
    },
  },
  {
    id: "eu-preferred-globally-open",
    description: "EU preferred but globally open position",
    jobPosting: {
      title: "DevOps Engineer",
      location: "Remote - Global",
      description:
        "Global remote role. EU-based candidates preferred for timezone alignment, but we welcome applications from anywhere in the world.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "medium",
      reason: "EU preferred in a global role — EU workers can apply",
    },
  },
  {
    id: "global-no-eu-specifics",
    description: "Global remote with no EU-specific mentions",
    jobPosting: {
      title: "Security Analyst",
      location: "Remote - Global",
      description:
        "Work from anywhere in the world. No location requirements. We are a fully distributed company with team members across 30 countries.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "low",
      reason: "Global remote with no EU-specific signals — EU workers can technically apply but no EU focus",
    },
  },
  {
    id: "explicit-no-eu-applicants",
    description: "Explicit 'no EU applicants' restriction",
    jobPosting: {
      title: "Marketing Manager",
      location: "Remote",
      description:
        "Remote position. Due to regulatory requirements, we cannot accept applications from EU member states. Candidates must be based outside the European Union.",
    },
    expectedClassification: {
      isRemoteEU: false,
      confidence: "high",
      reason: "Explicitly excludes EU applicants",
    },
  },
  {
    id: "dach-swiss-only-emphasis",
    description: "DACH region but Swiss-only emphasis",
    jobPosting: {
      title: "Software Engineer",
      location: "Remote - DACH",
      description:
        "DACH region position. Must be based in Switzerland with a valid Swiss work permit. Swiss employment contract. Office in Zurich for optional in-person collaboration.",
    },
    expectedClassification: {
      isRemoteEU: false,
      confidence: "high",
      reason: "Despite DACH label, explicitly requires Swiss work permit — Switzerland is not EU",
    },
  },
  {
    id: "conflicting-signals-eu-and-us",
    description: "Conflicting signals — mentions both EU and US requirements",
    jobPosting: {
      title: "Staff Engineer",
      location: "Remote - US, EU",
      description:
        "We have two open positions: one for US-based and one for EU-based candidates. This posting is for our EU team. Must have right to work in the EU.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "high",
      reason: "Despite US mention, this posting is explicitly for the EU team with EU work auth",
    },
  },
  {
    id: "conflicting-signals-remote-but-office-days",
    description: "Conflicting signals — says remote but requires occasional office visits",
    jobPosting: {
      title: "Product Manager",
      location: "Remote - EU",
      description:
        "Remote-first position based in EU. Quarterly visits to our Paris office required (company covers travel). Otherwise fully remote from any EU country.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "high",
      reason: "Remote-first EU role with only quarterly office visits — still classified as remote EU",
    },
  },
  {
    id: "onsite-disguised-as-remote",
    description: "On-site role listed as remote in title",
    jobPosting: {
      title: "Remote Support Engineer",
      location: "Munich, Germany",
      description:
        "Provide remote support to customers from our Munich office. This is an on-site position requiring 5 days per week in our Munich headquarters. German work authorization required.",
    },
    expectedClassification: {
      isRemoteEU: false,
      confidence: "high",
      reason: "'Remote' refers to remote support, not remote work — this is an on-site position",
    },
  },
  {
    id: "eu-country-code-remote-flag",
    description: "EU country code + explicit remote flag from ATS",
    jobPosting: {
      title: "Frontend Engineer",
      location: "Remote - Netherlands",
      description:
        "Fully remote position based in the Netherlands. We are a Dutch company offering competitive local benefits. EU work permit required.",
      country: "NL",
      workplace_type: "remote",
      is_remote: true,
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "high",
      reason: "EU country code (NL) + ATS remote flag = high-confidence EU remote",
    },
  },
  {
    id: "european-business-hours",
    description: "European business hours requirement without EU mention",
    jobPosting: {
      title: "Support Engineer",
      location: "Remote",
      description:
        "Fully remote role. Must be available during European business hours (9am-6pm CET). Our customers are primarily based in Europe.",
    },
    expectedClassification: {
      isRemoteEU: true,
      confidence: "medium",
      reason: "European business hours requirement targets EU-timezone workers",
    },
  },
];
