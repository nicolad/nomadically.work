import { describe, it, expect, vi, beforeEach } from "vitest";
import { GraphQLError } from "graphql";
import { jobResolvers } from "./index";
import { enhanceJobFromATS } from "./enhance-job";

vi.mock("@/ingestion/ashby", () => ({
  fetchAshbyJobPostFromUrl: vi.fn(),
  saveAshbyJobData: vi.fn(),
  parseAshbyJobUrl: vi.fn(),
}));

vi.mock("@/ingestion/greenhouse", () => ({
  fetchGreenhouseJobPost: vi.fn(),
  saveGreenhouseJobData: vi.fn(),
}));

// Minimal fake row returned by the DB mock
const fakeJob = {
  id: 1,
  external_id: "17c321ec-8400-4de3-9a40-558a850b90e4",
  title: "Senior Engineer",
  status: "eu-remote",
};

const fakeGreenhouseJob = {
  id: 2,
  external_id: "https://boards.greenhouse.io/company/jobs/7434532002",
  title: "Backend Engineer",
  status: "eu-remote",
};

const fakeBoardOnlyJob = {
  id: 505,
  external_id: "https://jobs.ashbyhq.com/Union/",
  title: "Product Designer",
  status: "new",
};

/**
 * Build a chainable Drizzle mock:
 *   db.select().from().where().limit() → resolves to `rows`
 */
function makeDbMock(rows: object[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
  return { select: vi.fn().mockReturnValue(chain), _chain: chain };
}

describe("job resolver — three-step lookup", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a job on exact external_id match (Ashby UUID)", async () => {
    const { select, _chain } = makeDbMock([fakeJob]);
    // Second call (suffix match) should never be reached, but set it up anyway
    _chain.limit
      .mockResolvedValueOnce([fakeJob]) // exact match hit
      .mockResolvedValueOnce([]); // suffix match (unused)

    const context = { db: { select } } as any;

    const result = await jobResolvers.Query.job(
      null,
      { id: "17c321ec-8400-4de3-9a40-558a850b90e4" },
      context
    );

    expect(result).toEqual(fakeJob);
    expect(select).toHaveBeenCalledTimes(1);
  });

  it("returns a job on suffix external_id match (Greenhouse URL)", async () => {
    const { select, _chain } = makeDbMock([]);
    // First call (exact) returns nothing; second call (suffix) returns the row
    _chain.limit
      .mockResolvedValueOnce([]) // exact match miss
      .mockResolvedValueOnce([fakeGreenhouseJob]); // suffix match hit

    const context = { db: { select } } as any;

    const result = await jobResolvers.Query.job(
      null,
      { id: "7434532002" },
      context
    );

    expect(result).toEqual(fakeGreenhouseJob);
    expect(select).toHaveBeenCalledTimes(2);
  });

  it("returns a job on numeric id fallback (board-only external_id)", async () => {
    const { select, _chain } = makeDbMock([]);
    _chain.limit
      .mockResolvedValueOnce([])              // exact match miss
      .mockResolvedValueOnce([])              // suffix match miss
      .mockResolvedValueOnce([fakeBoardOnlyJob]); // numeric id hit

    const context = { db: { select } } as any;

    const result = await jobResolvers.Query.job(
      null,
      { id: "505" },
      context
    );

    expect(result).toEqual(fakeBoardOnlyJob);
    expect(select).toHaveBeenCalledTimes(3);
  });

  it("returns null when no job is found", async () => {
    const { select, _chain } = makeDbMock([]);
    _chain.limit
      .mockResolvedValueOnce([]) // exact miss
      .mockResolvedValueOnce([]); // suffix miss

    const context = { db: { select } } as any;

    const result = await jobResolvers.Query.job(
      null,
      { id: "nonexistent-uuid" },
      context
    );

    expect(result).toBeNull();
    // Only 2 calls — "nonexistent-uuid" is not numeric, so step 3 is skipped
    expect(select).toHaveBeenCalledTimes(2);
  });

  it("returns null and logs error when the DB throws", async () => {
    const dbError = new Error("D1 connection failure");
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockRejectedValue(dbError),
    };
    const select = vi.fn().mockReturnValue(chain);
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const context = { db: { select } } as any;

    const result = await jobResolvers.Query.job(
      null,
      { id: "any-id" },
      context
    );

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[Job Resolver] Error fetching job:",
      dbError
    );
  });
});

// ---------------------------------------------------------------------------
// publishedAt resolver
// ---------------------------------------------------------------------------

describe("Job.publishedAt field resolver", () => {
  const resolve = (parent: any) =>
    (jobResolvers.Job as any).publishedAt(parent);

  it("returns first_published when available (Greenhouse)", () => {
    expect(
      resolve({
        first_published: "2026-02-04T04:16:43-05:00",
        posted_at: "2026-02-20T06:17:25.713Z",
      }),
    ).toBe("2026-02-04T04:16:43-05:00");
  });

  it("returns first_published for Ashby jobs (mapped from ashby publishedAt)", () => {
    expect(
      resolve({
        first_published: "2023-03-09T17:44:00.817+00:00",
        posted_at: "2026-02-20T06:17:25.713Z",
      }),
    ).toBe("2023-03-09T17:44:00.817+00:00");
  });

  it("falls back to posted_at when first_published is null", () => {
    expect(
      resolve({ first_published: null, posted_at: "2026-02-20T06:17:25.713Z" }),
    ).toBe("2026-02-20T06:17:25.713Z");
  });

  it("falls back to posted_at when first_published is undefined", () => {
    expect(resolve({ posted_at: "2026-01-01T00:00:00Z" })).toBe(
      "2026-01-01T00:00:00Z",
    );
  });

  it("falls back to posted_at when first_published is empty string", () => {
    expect(
      resolve({ first_published: "", posted_at: "2026-01-15T12:00:00Z" }),
    ).toBe("2026-01-15T12:00:00Z");
  });
});

// ---------------------------------------------------------------------------
// enhanceJobFromATS — stored URL preference (Fix 4)
// ---------------------------------------------------------------------------

describe("enhanceJobFromATS — Ashby URL resolution", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  function makeChain(rows: object[]) {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(rows),
    };
    return { select: vi.fn().mockReturnValue(chain) };
  }

  it("uses ashby_job_url when it contains a posting ID (two path segments)", async () => {
    const { fetchAshbyJobPostFromUrl, saveAshbyJobData } = await import("@/ingestion/ashby");
    (fetchAshbyJobPostFromUrl as any).mockResolvedValue({});
    (saveAshbyJobData as any).mockResolvedValue({ title: "Senior Engineer" });

    const jobRow = {
      id: 66,
      external_id: "66",
      ashby_job_url: "https://jobs.ashbyhq.com/kraken/real-posting-uuid",
      url: "https://jobs.ashbyhq.com/kraken.com", // board-level fallback
    };
    const db = makeChain([jobRow]);

    await enhanceJobFromATS(null, { jobId: "66", company: "kraken.com", source: "ashby" }, { db } as any);

    expect(fetchAshbyJobPostFromUrl).toHaveBeenCalledWith(
      "https://jobs.ashbyhq.com/kraken/real-posting-uuid",
      { includeCompensation: true },
    );
  });

  it("uses job.url when ashby_job_url is null and url has a posting ID", async () => {
    const { fetchAshbyJobPostFromUrl, saveAshbyJobData } = await import("@/ingestion/ashby");
    (fetchAshbyJobPostFromUrl as any).mockResolvedValue({});
    (saveAshbyJobData as any).mockResolvedValue({ title: "Engineer" });

    const jobRow = {
      id: 66,
      external_id: "66",
      ashby_job_url: null,
      url: "https://jobs.ashbyhq.com/kraken/stored-uuid",
    };
    const db = makeChain([jobRow]);

    await enhanceJobFromATS(null, { jobId: "66", company: "kraken.com", source: "ashby" }, { db } as any);

    expect(fetchAshbyJobPostFromUrl).toHaveBeenCalledWith(
      "https://jobs.ashbyhq.com/kraken/stored-uuid",
      { includeCompensation: true },
    );
  });

  it("falls back to constructing URL when ashby_job_url is board-level (one segment)", async () => {
    const { fetchAshbyJobPostFromUrl, saveAshbyJobData } = await import("@/ingestion/ashby");
    (fetchAshbyJobPostFromUrl as any).mockResolvedValue({});
    (saveAshbyJobData as any).mockResolvedValue({ title: "Engineer" });

    const jobRow = {
      id: 66,
      external_id: "66",
      ashby_job_url: "https://jobs.ashbyhq.com/kraken.com", // board-level — 1 segment
      url: null,
    };
    const db = makeChain([jobRow]);

    await enhanceJobFromATS(null, { jobId: "my-posting-id", company: "kraken.com", source: "ashby" }, { db } as any);

    // Falls back to constructed URL from args
    expect(fetchAshbyJobPostFromUrl).toHaveBeenCalledWith(
      "https://jobs.ashbyhq.com/kraken.com/my-posting-id",
      { includeCompensation: true },
    );
  });

  it("falls back to constructing URL when both ashby_job_url and url are null", async () => {
    const { fetchAshbyJobPostFromUrl, saveAshbyJobData } = await import("@/ingestion/ashby");
    (fetchAshbyJobPostFromUrl as any).mockResolvedValue({});
    (saveAshbyJobData as any).mockResolvedValue({ title: "Engineer" });

    const jobRow = { id: 66, external_id: "66", ashby_job_url: null, url: null };
    const db = makeChain([jobRow]);

    await enhanceJobFromATS(null, { jobId: "my-uuid", company: "kraken", source: "ashby" }, { db } as any);

    expect(fetchAshbyJobPostFromUrl).toHaveBeenCalledWith(
      "https://jobs.ashbyhq.com/kraken/my-uuid",
      { includeCompensation: true },
    );
  });
});

// ---------------------------------------------------------------------------
// enhanceJobFromATS — GraphQL error handling
// ---------------------------------------------------------------------------

describe("enhanceJobFromATS error handling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("throws BAD_USER_INPUT for unsupported ATS source", async () => {
    const context = { db: {} } as any;
    await expect(
      enhanceJobFromATS(null, { jobId: "1", company: "x", source: "workday" }, context),
    ).rejects.toThrow(GraphQLError);

    try {
      await enhanceJobFromATS(null, { jobId: "1", company: "x", source: "workday" }, context);
    } catch (e: any) {
      expect(e.extensions.code).toBe("BAD_USER_INPUT");
    }
  });

  it("throws NOT_FOUND when job does not exist in DB", async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    const context = { db: { select: vi.fn().mockReturnValue(chain) } } as any;

    await expect(
      enhanceJobFromATS(null, { jobId: "nonexistent", company: "x", source: "ashby" }, context),
    ).rejects.toThrow(GraphQLError);

    try {
      await enhanceJobFromATS(null, { jobId: "nonexistent", company: "x", source: "ashby" }, context);
    } catch (e: any) {
      expect(e.extensions.code).toBe("NOT_FOUND");
      expect(e.message).toContain("nonexistent");
    }
  });

  it("throws NOT_FOUND for 404 ATS errors", async () => {
    const { fetchAshbyJobPostFromUrl } = await import("@/ingestion/ashby");
    (fetchAshbyJobPostFromUrl as any).mockRejectedValue(
      new Error("Ashby API failed: 404 Not Found"),
    );

    const fakeRow = { id: 1, external_id: "abc" };
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([fakeRow]),
    };
    const context = { db: { select: vi.fn().mockReturnValue(chain) } } as any;

    try {
      await enhanceJobFromATS(null, { jobId: "abc", company: "test", source: "ashby" }, context);
      expect.unreachable("should have thrown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(GraphQLError);
      expect(e.extensions.code).toBe("NOT_FOUND");
      expect(e.extensions.source).toBe("ashby");
      expect(e.extensions.jobId).toBe("abc");
    }
  });

  it("throws RATE_LIMITED for 429 ATS errors", async () => {
    const { fetchAshbyJobPostFromUrl } = await import("@/ingestion/ashby");
    (fetchAshbyJobPostFromUrl as any).mockRejectedValue(
      new Error("429 Too Many Requests"),
    );

    const fakeRow = { id: 1, external_id: "abc" };
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([fakeRow]),
    };
    const context = { db: { select: vi.fn().mockReturnValue(chain) } } as any;

    try {
      await enhanceJobFromATS(null, { jobId: "abc", company: "test", source: "ashby" }, context);
      expect.unreachable("should have thrown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(GraphQLError);
      expect(e.extensions.code).toBe("RATE_LIMITED");
    }
  });
});
