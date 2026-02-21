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
    description: "CET timezone requirement (ambiguous - includes non-EU)",
    jobPosting: {
      title: "Frontend Developer",
      location: "Remote",
      description:
        "Must work in CET timezone. Flexible hours but need to overlap with European business hours.",
    },
    expectedClassification: {
      isRemoteEU: false,
      confidence: "medium",
      reason:
        "CET timezone is not exclusive to EU (includes Switzerland, some African countries)",
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
];
