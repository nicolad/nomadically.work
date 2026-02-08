import { parseHTML } from "linkedom";
import { createHash } from "node:crypto";

export type Evidence = {
  sourceType: "commoncrawl";
  sourceUrl: string;
  crawlId: string;
  captureTimestamp: string;
  observedAtISO: string;
  method: "jsonld" | "meta" | "dom" | "heuristic";
};

export type Fact<T> = {
  field: string;
  value: T;
  confidence: number; // 0..1
  evidence: Evidence;
};

export type GoldenRecord = {
  firmId: string;
  canonicalDomain: string;
  websiteUrl?: string;

  name?: string;
  description?: string;

  services?: string[];
  locations?: string[];
  phones?: string[];
  emails?: string[];
  sameAs?: string[];

  score: number;
  reasons: string[];

  lastSeenCaptureTimestamp: string;
  lastSeenCrawlId: string;

  facts: Array<Fact<any>>;
};

export function nowISO(): string {
  return new Date().toISOString();
}

export function sha1Hex(s: string): string {
  return createHash("sha1").update(s).digest("hex");
}

export function normalizeDomain(seed: string): string {
  let s = seed.trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  const u = new URL(s);
  const host = u.hostname.toLowerCase();
  return host.startsWith("www.") ? host.slice(4) : host;
}

export function parseSeedsText(seedsText: string): string[] {
  const domains = seedsText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(normalizeDomain)
    .filter(Boolean);
  return Array.from(new Set(domains));
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function flattenJsonLd(x: any): any[] {
  if (!x) return [];
  if (Array.isArray(x)) return x.flatMap(flattenJsonLd);
  if (typeof x === "object" && Array.isArray(x["@graph"])) return x["@graph"];
  return [x];
}

function isOrgType(t: unknown): boolean {
  const types = Array.isArray(t) ? t.map(String) : t ? [String(t)] : [];
  return types.some((x) =>
    [
      "Organization",
      "ProfessionalService",
      "LocalBusiness",
      "Corporation",
    ].includes(x),
  );
}

export function extractFactsFromHtml(params: {
  html: string;
  crawlId: string;
  captureTimestamp: string;
  sourceUrl: string;
}): Array<Fact<any>> {
  const { html, crawlId, captureTimestamp, sourceUrl } = params;
  const { document } = parseHTML(html);

  const facts: Array<Fact<any>> = [];

  const baseEvidence = (method: Evidence["method"]): Evidence => ({
    sourceType: "commoncrawl",
    sourceUrl,
    crawlId,
    captureTimestamp,
    observedAtISO: nowISO(),
    method,
  });

  // title + meta
  const title = (document.querySelector("title")?.textContent || "").trim();
  if (title) {
    facts.push({
      field: "title",
      value: title,
      confidence: 0.35,
      evidence: baseEvidence("meta"),
    });
  }

  const metaDesc =
    (document.querySelector('meta[name="description"]') as any)
      ?.getAttribute?.("content")
      ?.trim?.() ||
    (document.querySelector('meta[property="og:description"]') as any)
      ?.getAttribute?.("content")
      ?.trim?.() ||
    "";

  if (metaDesc) {
    facts.push({
      field: "description",
      value: metaDesc,
      confidence: 0.6,
      evidence: baseEvidence("meta"),
    });
  }

  const ogSite =
    (document.querySelector('meta[property="og:site_name"]') as any)
      ?.getAttribute?.("content")
      ?.trim?.() || "";
  if (ogSite) {
    facts.push({
      field: "name",
      value: ogSite,
      confidence: 0.7,
      evidence: baseEvidence("meta"),
    });
  }

  // JSON-LD org facts
  const scripts = Array.from(
    document.querySelectorAll('script[type="application/ld+json"]'),
  );
  for (const s of scripts) {
    const raw = (s.textContent || "").trim();
    if (!raw) continue;

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }

    const nodes = flattenJsonLd(parsed);
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      if (!isOrgType((node as any)["@type"])) continue;

      const ev = baseEvidence("jsonld");

      const name = (node as any).name;
      if (typeof name === "string" && name.trim()) {
        facts.push({
          field: "name",
          value: name.trim(),
          confidence: 0.95,
          evidence: ev,
        });
      }

      const websiteUrl = (node as any).url;
      if (typeof websiteUrl === "string" && websiteUrl.trim()) {
        facts.push({
          field: "websiteUrl",
          value: websiteUrl.trim(),
          confidence: 0.9,
          evidence: ev,
        });
      }

      const sameAs = (node as any).sameAs;
      if (sameAs) {
        const links = Array.isArray(sameAs)
          ? sameAs.map(String)
          : [String(sameAs)];
        const cleaned = links.map((x) => x.trim()).filter(Boolean);
        if (cleaned.length) {
          facts.push({
            field: "sameAs",
            value: uniq(cleaned),
            confidence: 0.9,
            evidence: ev,
          });
        }
      }

      const telephone = (node as any).telephone;
      if (telephone) {
        const phones = Array.isArray(telephone)
          ? telephone.map(String)
          : [String(telephone)];
        const cleaned = phones.map((x) => x.trim()).filter(Boolean);
        if (cleaned.length) {
          facts.push({
            field: "phones",
            value: uniq(cleaned),
            confidence: 0.85,
            evidence: ev,
          });
        }
      }

      const email = (node as any).email;
      if (email) {
        const emails = Array.isArray(email)
          ? email.map(String)
          : [String(email)];
        const cleaned = emails.map((x) => x.trim()).filter(Boolean);
        if (cleaned.length) {
          facts.push({
            field: "emails",
            value: uniq(cleaned),
            confidence: 0.85,
            evidence: ev,
          });
        }
      }

      const address = (node as any).address;
      if (address) {
        const addrs = Array.isArray(address) ? address : [address];
        const locs: string[] = [];
        for (const a of addrs) {
          if (!a) continue;
          if (typeof a === "string") locs.push(a);
          else if (typeof a === "object") {
            const parts = [
              (a as any).streetAddress,
              (a as any).addressLocality,
              (a as any).addressRegion,
              (a as any).postalCode,
              (a as any).addressCountry,
            ]
              .filter(Boolean)
              .map(String);
            if (parts.length) locs.push(parts.join(", "));
          }
        }
        if (locs.length) {
          facts.push({
            field: "locations",
            value: uniq(locs),
            confidence: 0.85,
            evidence: ev,
          });
        }
      }
    }
  }

  // Heuristic emails from body text
  const bodyText = (document.body?.textContent || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50_000);
  const emailMatches =
    bodyText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  if (emailMatches.length) {
    facts.push({
      field: "emails",
      value: uniq(emailMatches).slice(0, 10),
      confidence: 0.5,
      evidence: baseEvidence("heuristic"),
    });
  }

  // DOM-ish "services" candidates
  const serviceSet = new Set<string>();
  const headingNodes = Array.from(
    document.querySelectorAll("h1,h2,h3,nav a,a"),
  );
  for (const el of headingNodes) {
    const t = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (t.length < 3 || t.length > 70) continue;
    if (
      /(services|capabilities|what we do|work|case studies|clients|contact|about)/i.test(
        t,
      )
    )
      continue;
    if (
      /(cloud|data|ai|ml|security|devops|platform|product|design|strategy|commerce|transformation)/i.test(
        t,
      )
    ) {
      serviceSet.add(t);
    }
  }
  if (serviceSet.size) {
    facts.push({
      field: "services",
      value: Array.from(serviceSet).slice(0, 25),
      confidence: 0.55,
      evidence: baseEvidence("dom"),
    });
  }

  return facts;
}

export function scoreFromFactsAndHtml(
  html: string,
  facts: Array<Fact<any>>,
): { score: number; reasons: string[] } {
  const { document } = parseHTML(html);
  const reasons: string[] = [];
  let score = 0;

  const hasHighConfOrg = facts.some(
    (f) => f.field === "name" && f.confidence >= 0.9,
  );
  if (hasHighConfOrg) {
    score += 0.18;
    reasons.push("JSON-LD/strong org identity");
  }

  const hrefs = Array.from(document.querySelectorAll("a[href]"))
    .map((a) => (a as any).getAttribute?.("href") || "")
    .map(String);

  const hasServices = hrefs.some((h) =>
    /(\/services\b|\/what-we-do\b|\/capabilit)/i.test(h),
  );
  const hasWork = hrefs.some((h) =>
    /(\/work\b|\/case-?stud|\/clients\b|\/portfolio\b)/i.test(h),
  );
  const hasAbout = hrefs.some((h) =>
    /(\/about\b|\/company\b|\/team\b|\/leadership\b)/i.test(h),
  );
  const hasContact =
    hrefs.some((h) => /(\/contact\b)/i.test(h)) ||
    hrefs.some((h) => /^mailto:|^tel:/i.test(h));

  if (hasServices) {
    score += 0.18;
    reasons.push("Services/capabilities IA");
  }
  if (hasWork) {
    score += 0.18;
    reasons.push("Work/case studies IA");
  }
  if (hasAbout) {
    score += 0.08;
    reasons.push("About/team IA");
  }
  if (hasContact) {
    score += 0.08;
    reasons.push("Contact signals");
  }

  const text = (document.body?.textContent || "")
    .replace(/\s+/g, " ")
    .toLowerCase();
  const intentTerms = [
    "consulting",
    "consultancy",
    "digital transformation",
    "product engineering",
    "modernization",
    "enterprise",
    "platform engineering",
    "data engineering",
    "devops",
    "security",
  ];
  const intentHits = intentTerms.filter((t) => text.includes(t)).length;
  if (intentHits >= 3) {
    score += 0.18;
    reasons.push("Multiple consultancy intent terms");
  } else if (intentHits >= 1) {
    score += 0.1;
    reasons.push("Some consultancy intent terms");
  }

  const maxServices = facts
    .filter((f) => f.field === "services" && Array.isArray(f.value))
    .reduce((acc, f) => Math.max(acc, (f.value as any[]).length), 0);

  if (maxServices >= 6) {
    score += 0.12;
    reasons.push("Service taxonomy breadth");
  } else if (maxServices >= 3) {
    score += 0.07;
    reasons.push("Some service taxonomy");
  }

  const hasLocations = facts.some(
    (f) =>
      f.field === "locations" && Array.isArray(f.value) && f.value.length > 0,
  );
  const hasPhones = facts.some(
    (f) => f.field === "phones" && Array.isArray(f.value) && f.value.length > 0,
  );
  if (hasLocations) {
    score += 0.05;
    reasons.push("Locations/address present");
  }
  if (hasPhones) {
    score += 0.03;
    reasons.push("Phone present");
  }

  if (/(casino|betting|porn|viagra|loan)/i.test(text)) {
    score -= 0.6;
    reasons.push("Spam/irrelevant content penalty");
  }

  score = Math.max(0, Math.min(1, score));
  if (score >= 0.75) reasons.push("High confidence overall");
  if (score < 0.5) reasons.push("Low confidence overall");

  return { score, reasons };
}

function pickBestFact<T>(
  facts: Array<Fact<any>>,
  field: string,
): Fact<T> | undefined {
  const candidates = facts.filter((f) => f.field === field);
  if (!candidates.length) return undefined;

  candidates.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    if (b.evidence.captureTimestamp !== a.evidence.captureTimestamp) {
      return b.evidence.captureTimestamp.localeCompare(
        a.evidence.captureTimestamp,
      );
    }
    return b.evidence.observedAtISO.localeCompare(a.evidence.observedAtISO);
  });

  return candidates[0] as Fact<T>;
}

export function buildGoldenRecord(params: {
  domain: string;
  crawlId: string;
  captureTimestamp: string;
  sourceUrl: string;
  html: string;
  facts: Array<Fact<any>>;
}): GoldenRecord {
  const { domain, crawlId, captureTimestamp, html, facts } = params;

  const firmId = sha1Hex(domain);

  const name =
    pickBestFact<string>(facts, "name")?.value ??
    pickBestFact<string>(facts, "title")?.value;
  const description = pickBestFact<string>(facts, "description")?.value;
  const websiteUrl = pickBestFact<string>(facts, "websiteUrl")?.value;

  const services = pickBestFact<string[]>(facts, "services")?.value;
  const locations = pickBestFact<string[]>(facts, "locations")?.value;
  const phones = pickBestFact<string[]>(facts, "phones")?.value;
  const emails = pickBestFact<string[]>(facts, "emails")?.value;
  const sameAs = pickBestFact<string[]>(facts, "sameAs")?.value;

  const { score, reasons } = scoreFromFactsAndHtml(html, facts);

  return {
    firmId,
    canonicalDomain: domain,
    websiteUrl,
    name,
    description,
    services,
    locations,
    phones,
    emails,
    sameAs,
    score,
    reasons,
    lastSeenCaptureTimestamp: captureTimestamp,
    lastSeenCrawlId: crawlId,
    facts,
  };
}

export function keyUrlsForDomain(domain: string, maxPages: number): string[] {
  const base = `https://${domain}`;
  const paths = [
    "/",
    "/about",
    "/company",
    "/services",
    "/what-we-do",
    "/capabilities",
    "/work",
    "/case-studies",
    "/clients",
    "/contact",
    "/locations",
    "/team",
    "/leadership",
  ];
  return paths.slice(0, Math.max(1, maxPages)).map((p) => `${base}${p}`);
}
