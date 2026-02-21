import { describe, it, expect } from "vitest";
import { extractJobSlug, isBoardOnlyUrl } from "./job-utils";

describe("extractJobSlug", () => {
  it("returns bare UUID as-is", () => {
    expect(extractJobSlug("abc-123-def-456")).toBe("abc-123-def-456");
  });

  it("returns numeric ID as-is", () => {
    expect(extractJobSlug("12345")).toBe("12345");
  });

  it("extracts slug from Greenhouse URL", () => {
    expect(
      extractJobSlug("https://boards.greenhouse.io/company/jobs/12345"),
    ).toBe("12345");
  });

  it("extracts slug from Ashby URL", () => {
    expect(
      extractJobSlug("https://jobs.ashbyhq.com/company/abc-123-def"),
    ).toBe("abc-123-def");
  });

  it("extracts slug from Lever URL", () => {
    expect(
      extractJobSlug("https://jobs.lever.co/company/uuid-here"),
    ).toBe("uuid-here");
  });

  it("handles trailing slash correctly", () => {
    expect(
      extractJobSlug("https://jobs.ashbyhq.com/company/abc-123/"),
    ).toBe("abc-123");
  });

  it("handles multiple trailing slashes", () => {
    expect(
      extractJobSlug("https://jobs.ashbyhq.com/company/abc-123///"),
    ).toBe("abc-123");
  });

  it("falls back for board-only URL (no job segment)", () => {
    // Board-only URL has only 1 path segment (company name) — must use fallback
    expect(
      extractJobSlug("https://jobs.ashbyhq.com/neuroscale/", 42),
    ).toBe("42");
  });

  it("falls back for board-only URL without fallback", () => {
    // Without fallback, returns the original URL as last resort
    expect(
      extractJobSlug("https://jobs.ashbyhq.com/elicit/"),
    ).toBe("https://jobs.ashbyhq.com/elicit/");
  });

  it("falls back for board-only URL with just host", () => {
    expect(
      extractJobSlug("https://jobs.ashbyhq.com/", 42),
    ).toBe("42");
  });

  it("returns fallback for null", () => {
    expect(extractJobSlug(null, 99)).toBe("99");
  });

  it("returns fallback for undefined", () => {
    expect(extractJobSlug(undefined, "fallback-id")).toBe("fallback-id");
  });

  it("returns empty string when null and no fallback", () => {
    expect(extractJobSlug(null)).toBe("");
  });

  it("returns empty string for empty string input", () => {
    expect(extractJobSlug("", 42)).toBe("42");
  });
});

describe("isBoardOnlyUrl", () => {
  it("returns false for non-URL strings", () => {
    expect(isBoardOnlyUrl("abc-123-def")).toBe(false);
    expect(isBoardOnlyUrl("12345")).toBe(false);
  });

  it("returns true for board-only Ashby URL", () => {
    expect(isBoardOnlyUrl("https://jobs.ashbyhq.com/neuroscale/")).toBe(true);
  });

  it("returns true for board-only URL without trailing slash", () => {
    expect(isBoardOnlyUrl("https://jobs.ashbyhq.com/neuroscale")).toBe(true);
  });

  it("returns false for URL with job ID", () => {
    expect(
      isBoardOnlyUrl("https://jobs.ashbyhq.com/neuroscale/abc-123"),
    ).toBe(false);
  });

  it("returns false for Greenhouse job URL", () => {
    expect(
      isBoardOnlyUrl("https://boards.greenhouse.io/company/jobs/12345"),
    ).toBe(false);
  });

  it("returns true for bare host URL", () => {
    expect(isBoardOnlyUrl("https://jobs.ashbyhq.com/")).toBe(true);
  });
});
