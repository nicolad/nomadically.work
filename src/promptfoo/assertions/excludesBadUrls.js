// src/promptfoo/assertions/excludesBadUrls.js
function collectUrls(obj) {
  const all = [];
  for (const bucket of ["worldwide", "europe"]) {
    for (const j of obj[bucket] || []) {
      if (j.sourceUrl) all.push(String(j.sourceUrl));
      if (j.applyUrl) all.push(String(j.applyUrl));
    }
  }
  return all;
}

module.exports = (output, context) => {
  // Support both old format (excludedUrls array) and new format (_excludedUrls.list)
  let excluded = [];
  if (Array.isArray(context?.vars?.excludedUrls)) {
    excluded = context.vars.excludedUrls;
  } else if (Array.isArray(context?.vars?._excludedUrls?.list)) {
    excluded = context.vars._excludedUrls.list;
  }

  if (excluded.length === 0) return true; // nothing to check

  let obj;
  try {
    obj = typeof output === "string" ? JSON.parse(output) : output;
  } catch {
    return false;
  }

  const urls = collectUrls(obj);
  return excluded.every((bad) => !urls.includes(String(bad)));
};
