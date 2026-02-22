import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock() calls are hoisted to run before any imports, so the mocked task()
// captures the run/handleError functions at module initialisation time.
vi.mock("@trigger.dev/sdk/v3", () => ({
  // Return the raw config object so tests can call .run() and .handleError() directly.
  task: (config: any) => config,
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/db/d1-http", () => ({ createD1HttpClient: vi.fn(() => ({})) }));
vi.mock("drizzle-orm/d1", () => ({
  drizzle: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  })),
}));
vi.mock("@/db/schema", () => ({ jobs: {} }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));
vi.mock("@/ingestion/ashby", () => ({
  fetchAshbyJobPostFromUrl: vi.fn(),
  saveAshbyJobData: vi.fn(),
}));
vi.mock("@/ingestion/greenhouse", () => ({
  fetchGreenhouseJobPost: vi.fn(),
  saveGreenhouseJobData: vi.fn(),
}));

import { enhanceJobTask } from "./enhance-job";
import { fetchAshbyJobPostFromUrl, saveAshbyJobData } from "@/ingestion/ashby";

const boardLevelPayload = {
  jobId: 66,
  source: "ashby",
  url: "https://jobs.ashbyhq.com/kraken.com",
  companyKey: "kraken.com",
};

// Cast once — task() mock returns the raw config, so .run and .handleError exist.
const task = enhanceJobTask as any;

describe("enhanceJobTask — board-level Ashby URL (Fix 2)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("throws for a board-only URL with one path segment (e.g. /kraken.com)", async () => {
    await expect(
      task.run({ ...boardLevelPayload, url: "https://jobs.ashbyhq.com/kraken.com" }),
    ).rejects.toThrow("Board-level Ashby URL cannot be enhanced");
  });

  it("throws for a trailing-slash board URL", async () => {
    await expect(
      task.run({ ...boardLevelPayload, url: "https://jobs.ashbyhq.com/some-company/" }),
    ).rejects.toThrow("Board-level Ashby URL cannot be enhanced");
  });

  it("includes the offending URL in the error message", async () => {
    const url = "https://jobs.ashbyhq.com/kraken.com";
    await expect(task.run({ ...boardLevelPayload, url })).rejects.toThrow(url);
  });

  it("succeeds for a valid posting URL with two path segments", async () => {
    (fetchAshbyJobPostFromUrl as any).mockResolvedValue({ id: "uuid-123" });
    (saveAshbyJobData as any).mockResolvedValue({ title: "Senior Engineer" });

    const result = await task.run({
      ...boardLevelPayload,
      url: "https://jobs.ashbyhq.com/kraken/abc-123-uuid",
      companyKey: "kraken",
    });

    expect(result).toMatchObject({ success: true, jobId: 66, source: "ashby" });
    expect(fetchAshbyJobPostFromUrl).toHaveBeenCalledWith(
      "https://jobs.ashbyhq.com/kraken/abc-123-uuid",
      { includeCompensation: true },
    );
  });
});

describe("enhanceJobTask — handleError routing", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does NOT skip retrying for board-level errors (let it surface as failed)", async () => {
    const boardErr = new Error(
      "Board-level Ashby URL cannot be enhanced (no posting ID in path): https://jobs.ashbyhq.com/kraken.com",
    );
    const result = await task.handleError(boardLevelPayload, boardErr);
    // undefined means: allow default retry behaviour — the failure becomes visible
    expect(result).toBeUndefined();
  });

  it("skips retrying for 404 errors and marks the job as [not-found]", async () => {
    const result = await task.handleError(boardLevelPayload, new Error("404 Not Found"));
    expect(result).toEqual({ skipRetrying: true });
  });

  it("skips retrying when error says 'no longer exists'", async () => {
    const result = await task.handleError(
      boardLevelPayload,
      new Error("The job posting no longer exists"),
    );
    expect(result).toEqual({ skipRetrying: true });
  });
});
