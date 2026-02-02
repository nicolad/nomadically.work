/**
 * Labeled test data for Remote EU classification
 * Each case represents a tricky scenario that should be correctly classified
 */

export type RemoteEUTestCase = {
  id: string;
  description: string;
  jobPosting: {
    title: string;
    location: string;
    description: string;
  };
  expectedClassification: {
    isRemoteEU: boolean;
    confidence: "high" | "medium" | "low";
    reason: string;
  };
};

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
    description: "EMEA includes non-EU countries (should be false)",
    jobPosting: {
      title: "Product Manager",
      location: "Remote - EMEA",
      description:
        "Looking for candidates across EMEA region including UK, Switzerland, and Middle East.",
    },
    expectedClassification: {
      isRemoteEU: false,
      confidence: "high",
      reason:
        "EMEA includes non-EU countries like UK post-Brexit, Switzerland, Middle East",
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
    description: "Europe (too ambiguous without context)",
    jobPosting: {
      title: "Product Designer",
      location: "Remote - Europe",
      description: "Looking for talented designers based anywhere in Europe.",
    },
    expectedClassification: {
      isRemoteEU: false,
      confidence: "low",
      reason: "Europe is too broad - includes non-EU countries",
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
];
