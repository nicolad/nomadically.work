// src/promptfoo/assertions/noAggregatorListingPages.js
// Ensures no job aggregator listing pages (that list MULTIPLE jobs) are included.
//
// ALLOWED:
// - Direct company career pages (e.g., company.com/careers/job-id)
// - Individual ATS job postings (e.g., jobs.ashbyhq.com/company/job, boards.greenhouse.io/company/jobs/123)
//
// BLOCKED:
// - Job board listing/search pages (e.g., turing.com/jobs/remote-*, builtin.com/jobs/search, ziprecruiter.com)

function isJobAggregatorListingPage(url) {
  const urlLower = url.toLowerCase();

  // Job board/aggregator domains that list MULTIPLE jobs (not single postings)
  // Note: Individual ATS postings (ashbyhq.com/company/job) are NOT in this list
  const aggregatorDomains = [
    "turing.com/jobs", // Turing job board
    "builtin.com/jobs", // Built In search results
    "builtinchicago.org/jobs", // Built In Chicago
    "ziprecruiter.com", // ZipRecruiter listings
    "glassdoor.com/job", // Glassdoor search
    "remotive.com/remote", // Remotive listings
    "remoteok.com", // RemoteOK listings
    "weworkremotely.com/remote-jobs", // WeWorkRemotely
    "wellfound.com/jobs", // Wellfound search
    "indeed.com/jobs", // Indeed search
    "linkedin.com/jobs/search", // LinkedIn search
  ];

  // Check for known aggregator domains
  if (aggregatorDomains.some((domain) => urlLower.includes(domain))) {
    return true;
  }

  // URL patterns that indicate multi-job listing pages (not single postings)
  const listingPatterns = [
    "/jobs/remote-", // e.g., /jobs/remote-ai-engineer-jobs
    "/remote-jobs/", // e.g., /remote-jobs/category
    "/jobs/search", // e.g., /jobs/search?q=remote
    "/remote-job-search",
    "/browse",
  ];

  // Check for multi-job listing URL patterns
  if (listingPatterns.some((pattern) => urlLower.includes(pattern))) {
    return true;
  }

  return false;
}

function collectUrls(obj) {
  const all = [];
  for (const bucket of ["worldwide", "europe"]) {
    for (const j of obj[bucket] || []) {
      if (j.sourceUrl)
        all.push({
          url: String(j.sourceUrl),
          type: "sourceUrl",
          job: j.title || "unknown",
        });
      if (j.applyUrl)
        all.push({
          url: String(j.applyUrl),
          type: "applyUrl",
          job: j.title || "unknown",
        });
    }
  }
  return all;
}

module.exports = (output, context) => {
  let obj;
  try {
    obj = typeof output === "string" ? JSON.parse(output) : output;
  } catch {
    return {
      pass: false,
      score: 0,
      reason: "Invalid JSON output",
    };
  }

  const urlData = collectUrls(obj);
  const aggregatorUrls = urlData.filter((item) =>
    isJobAggregatorListingPage(item.url),
  );

  if (aggregatorUrls.length > 0) {
    const examples = aggregatorUrls
      .slice(0, 3)
      .map((item) => `"${item.job}": ${item.url}`)
      .join(", ");

    return {
      pass: false,
      score: 0,
      reason: `Found ${aggregatorUrls.length} job aggregator listing page(s) that list multiple jobs instead of single postings. Examples: ${examples}. Only direct company career pages or individual job posting URLs are allowed.`,
    };
  }

  return {
    pass: true,
    score: 1,
    reason: `All URLs are direct job postings (${urlData.length} URLs checked, 0 aggregator listing pages)`,
  };
};
