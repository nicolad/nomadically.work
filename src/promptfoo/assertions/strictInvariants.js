// src/promptfoo/assertions/strictInvariants.js
function canonicalUrl(raw) {
  try {
    const u = new URL(raw);
    u.hash = "";
    const drop = new Set([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
      "ref",
      "source",
      "trk",
    ]);
    for (const k of [...u.searchParams.keys()]) {
      if (drop.has(String(k).toLowerCase())) u.searchParams.delete(k);
    }
    const s = u.toString();
    return s.endsWith("/") ? s.slice(0, -1) : s;
  } catch {
    return String(raw || "").trim();
  }
}

function blob(job) {
  return [
    job.title,
    job.company,
    job.locationText || "",
    job.salaryText || "",
    job.sourceUrl,
    job.applyUrl || "",
    ...(job.evidence || []),
  ]
    .join("\n")
    .toLowerCase();
}

function looksHybridOrOnsite(t) {
  return /\b(hybrid|on[-\s]?site|in[-\s]?office|office[-\s]?based)\b/i.test(t);
}

function hasRemotePositive(t) {
  return /\b(fully remote|100% remote|remote[-\s]?first|remote|distributed|work from home|wfh)\b/i.test(
    t,
  );
}

function hasWorldwideSignal(t) {
  return /\b(worldwide|global remote|work from anywhere|remote anywhere|location-agnostic|anywhere in the world)\b/i.test(
    t,
  );
}

function hasEuropeSignal(t) {
  return /\b(europe|emea|european union|\beu\b|eea|\buk\b|united kingdom|ireland|germany|france|spain|portugal|netherlands|poland|romania|bulgaria|cet|cest|eet|eest|gmt|utc\+0|utc\+1|utc\+2|utc\+3)\b/i.test(
    t,
  );
}

function hasRegionLock(t) {
  const hard =
    /\b(us[-\s]?only|united states only|only in the us|must be in the us|remote\s*\(?us\)?|remote\s*-\s*us|canada[-\s]?only|remote\s*\(?canada\)?|australia[-\s]?only|remote\s*\(?australia\)?|india[-\s]?only|philippines[-\s]?only|singapore[-\s]?only|brazil[-\s]?only)\b/i.test(
      t,
    );

  const workAuth =
    /\b(work authorization|authorized to work|must be authorized)\b/i.test(t) &&
    /\b(united states|\bu\.s\.\b|\bus\b)\b/i.test(t);

  const states =
    /\b(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy)\b/i.test(
      t,
    ) && t.includes("remote");

  return hard || workAuth || states;
}

function inferPostedHoursAgo(job) {
  if (typeof job.postedHoursAgo === "number") return job.postedHoursAgo;
  const t = blob(job);

  let m = t.match(/\b(\d{1,3})\s*hours?\s*ago\b/);
  if (m && m[1]) return Math.max(0, Math.min(168, Number(m[1])));

  m = t.match(/\b(\d{1,3})\s*(h|hr|hrs)\b(?:\s*ago)?\b/);
  if (m && m[1]) return Math.max(0, Math.min(168, Number(m[1])));

  m = t.match(/\b(\d{1,3})\s*minutes?\s*ago\b/);
  if (m && m[1]) return 0;

  return null;
}

function within24hStrict(job, nowMs) {
  const h = inferPostedHoursAgo(job);
  if (h != null) return h <= 24;

  if (job.postedAtIso) {
    const ms = Date.parse(job.postedAtIso);
    if (!Number.isFinite(ms)) return false;
    return nowMs - ms <= 24 * 60 * 60 * 1000;
  }
  return false;
}

module.exports = (output, context) => {
  let obj;
  try {
    obj = typeof output === "string" ? JSON.parse(output) : output;
  } catch {
    return 0;
  }

  const nowMs =
    typeof context?.vars?.nowMs === "number" ? context.vars.nowMs : Date.now();

  const worldwide = Array.isArray(obj.worldwide) ? obj.worldwide : [];
  const europe = Array.isArray(obj.europe) ? obj.europe : [];

  const all = [
    ...worldwide.map((j) => ({ bucket: "worldwide", job: j })),
    ...europe.map((j) => ({ bucket: "europe", job: j })),
  ];

  if (all.length === 0) return 1; // invariants hold vacuously

  // dedupe across buckets
  const seen = new Set();
  for (const { job } of all) {
    const key = canonicalUrl(job.applyUrl || job.sourceUrl);
    if (!key) return 0;
    if (seen.has(key)) return 0;
    seen.add(key);
  }

  let ok = 0;

  for (const { bucket, job } of all) {
    const t = blob(job);

    const remoteOk =
      job.isFullyRemote === true &&
      hasRemotePositive(t) &&
      !looksHybridOrOnsite(t);
    const regionOk =
      bucket === "worldwide"
        ? job.remoteRegion === "worldwide" &&
          hasWorldwideSignal(t) &&
          !hasRegionLock(t)
        : job.remoteRegion === "europe" &&
          hasEuropeSignal(t) &&
          !hasRegionLock(t);

    const freshOk = within24hStrict(job, nowMs);

    if (remoteOk && regionOk && freshOk) ok++;
  }

  return ok / all.length;
};
