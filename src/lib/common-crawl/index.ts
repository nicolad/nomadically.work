const CDX_API = "https://index.commoncrawl.org";
const ASHBY_DOMAIN = "jobs.ashbyhq.com/*";
const SYSTEM_ROUTES = new Set(["api", "static", "favicon.ico", "robots.txt", "sitemap.xml"]);

export async function discoverAshbyBoards(): Promise<Set<string>> {
  // 1. Get latest index
  const indexes = await fetch(`${CDX_API}/collinfo.json`).then((r) => r.json());
  const crawlId = indexes[0]?.id ?? "CC-MAIN-2025-52";

  // 2. Get page count
  const countUrl = `${CDX_API}/${crawlId}-index?url=${encodeURIComponent(ASHBY_DOMAIN)}&output=json&showNumPages=true`;
  const { pages } = await fetch(countUrl).then((r) => r.json());

  // 3. Paginate CDX API
  const slugs = new Set<string>();
  for (let page = 0; page < pages; page++) {
    const pageUrl = `${CDX_API}/${crawlId}-index?url=${encodeURIComponent(ASHBY_DOMAIN)}&output=json&filter=statuscode:200&pageSize=500&page=${page}`;
    const text = await fetch(pageUrl).then((r) => r.text());
    for (const line of text.trim().split("\n").filter(Boolean)) {
      try {
        const record = JSON.parse(line);
        const slug = extractSlug(record.url);
        if (slug) slugs.add(slug);
      } catch {
        // skip malformed lines
      }
    }
  }
  return slugs;
}

function extractSlug(url: string): string | null {
  const match = url.match(/jobs\.ashbyhq\.com\/([^/?#]+)/);
  const slug = match?.[1];
  if (!slug || slug.startsWith("?") || slug.startsWith("#") || SYSTEM_ROUTES.has(slug)) return null;
  return slug;
}
