import { describe, it, expect, vi, beforeEach } from "vitest";
import { jobResolvers } from "./index";

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

describe("job resolver — two-step lookup", () => {
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
