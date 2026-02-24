import { describe, it, expect } from "vitest";
import { extractSkillsFromResume, TAXONOMY_KEYS } from "@/lib/skills/extract-from-resume";

// Only skills in the taxonomy are valid outputs
const TAXONOMY_SET = new Set(TAXONOMY_KEYS);

function accuracy(extracted: string[], expected: string[]): number {
  if (expected.length === 0) return extracted.length === 0 ? 1 : 0;
  const matched = extracted.filter((s) => expected.includes(s)).length;
  return matched / expected.length;
}

describe("extractSkillsFromResume", () => {
  it("extracts backend skills from a Go/PostgreSQL/Docker resume", async () => {
    const text = `
      Senior Backend Engineer — 6 years experience
      Languages: Go, Python
      Databases: PostgreSQL, Redis
      Infrastructure: Docker, Kubernetes, AWS
      CI/CD: GitHub Actions
    `;
    const { skills, taxonomyVersion } = await extractSkillsFromResume(text);

    expect(taxonomyVersion).toBe("v1");
    // All returned skills must be in taxonomy
    for (const s of skills) {
      expect(TAXONOMY_SET.has(s)).toBe(true);
    }

    const expected = ["go", "python", "postgresql", "redis", "docker", "kubernetes", "aws"];
    const acc = accuracy(skills, expected);
    expect(acc).toBeGreaterThanOrEqual(0.8);
  });

  it("extracts frontend skills from a React/TypeScript resume", async () => {
    const text = `
      Frontend Developer — 4 years
      Skills: React, TypeScript, JavaScript, Next.js, CSS
      Tools: Git, Webpack, Jest
      Deployment: Vercel
    `;
    const { skills } = await extractSkillsFromResume(text);

    for (const s of skills) {
      expect(TAXONOMY_SET.has(s)).toBe(true);
    }

    const expected = ["react", "typescript", "javascript", "nextjs"];
    const acc = accuracy(skills, expected);
    expect(acc).toBeGreaterThanOrEqual(0.8);
  });

  it("returns empty or near-empty for non-technical text", async () => {
    const text = `
      Marketing Manager with 10 years experience in brand strategy, content marketing,
      and social media campaigns. Strong communicator and team leader.
    `;
    const { skills } = await extractSkillsFromResume(text);

    // Should return very few (or no) technical skills
    expect(skills.length).toBeLessThanOrEqual(2);
    for (const s of skills) {
      expect(TAXONOMY_SET.has(s)).toBe(true);
    }
  });

  it("filters out non-taxonomy skills like Microsoft Word", async () => {
    const text = `
      Junior Developer
      Skills: Microsoft Word, Excel, PowerPoint, JavaScript, React
      Experience: Basic web development with HTML and CSS
    `;
    const { skills } = await extractSkillsFromResume(text);

    // microsoft-word, excel, powerpoint must NOT appear (not in taxonomy)
    expect(skills).not.toContain("microsoft-word");
    expect(skills).not.toContain("excel");
    expect(skills).not.toContain("powerpoint");
    expect(skills).not.toContain("word");

    // All returned skills must be in taxonomy
    for (const s of skills) {
      expect(TAXONOMY_SET.has(s)).toBe(true);
    }

    // javascript and react should be there
    const coreExpected = ["javascript", "react"];
    const acc = accuracy(skills, coreExpected);
    expect(acc).toBeGreaterThanOrEqual(0.8);
  });

  it("produces deterministic results on repeated calls", async () => {
    const text = `
      Full Stack Engineer
      TypeScript, Node.js, React, PostgreSQL, Docker, AWS
    `;
    const [first, second] = await Promise.all([
      extractSkillsFromResume(text),
      extractSkillsFromResume(text),
    ]);

    const s1 = [...first.skills].sort();
    const s2 = [...second.skills].sort();

    // Results should be identical (temperature=0)
    expect(s1).toEqual(s2);
  });

  it("handles a sparse/thin resume without crashing", async () => {
    const text = `
      Software Engineer
      Python, FastAPI
    `;
    const { skills, taxonomyVersion } = await extractSkillsFromResume(text);

    expect(taxonomyVersion).toBe("v1");
    // All returned skills must be in taxonomy — no hallucination
    for (const s of skills) {
      expect(TAXONOMY_SET.has(s)).toBe(true);
    }
    // Should find at least 1 skill (Python is in taxonomy)
    expect(skills.length).toBeGreaterThanOrEqual(1);
  });

  it("returns empty skills for empty text input", async () => {
    const { skills, taxonomyVersion } = await extractSkillsFromResume("");

    expect(skills).toEqual([]);
    expect(taxonomyVersion).toBe("v1");
  });
});
