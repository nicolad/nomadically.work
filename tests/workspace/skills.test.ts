/**
 * Workspace Skills Tests
 * 
 * Integration tests for workspace skills functionality.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { workspace } from '@/workspace';

describe('Workspace Skills', () => {
  beforeAll(async () => {
    await workspace.init();
  });

  describe('Skill Discovery', () => {
    it('should discover all skills via filesystem', async () => {
      const expectedSkills = [
        'job-analysis',
        'preference-gathering',
        'data-validation',
        'report-generation',
        'ops-debugging'
      ];
      
      for (const skillName of expectedSkills) {
        const content = await workspace.filesystem.readFile(
          `/skills/${skillName}/SKILL.md`
        );
        
        expect(content).toBeDefined();
        expect(content.length).toBeGreaterThan(0);
      }
    });

    it('should have valid skill metadata in frontmatter', async () => {
      const expectedSkills = [
        'job-analysis',
        'preference-gathering',
        'data-validation',
        'report-generation',
        'ops-debugging'
      ];
      
      for (const skillName of expectedSkills) {
        const content = await workspace.filesystem.readFile(
          `/skills/${skillName}/SKILL.md`
        );
        
        // Check frontmatter exists
        expect(content).toMatch(/^---\n/);
        
        // Check required fields
        expect(content).toMatch(/name:\s*.+/);
        expect(content).toMatch(/description:\s*.+/);
        expect(content).toMatch(/version:\s*\d+\.\d+\.\d+/);
        expect(content).toMatch(/tags:\s*\n(?:\s+-\s+.+\n?)+/);
      }
    });
  });

  describe('Skill Content', () => {
    it('should have searchable keywords for job-analysis', async () => {
      const content = await workspace.filesystem.readFile(
        '/skills/job-analysis/SKILL.md'
      );
      
      const keywords = ['remote', 'eu', 'classification', 'job', 'salary'];
      keywords.forEach(keyword => {
        expect(content.toLowerCase()).toContain(keyword);
      });
    });

    it('should have searchable keywords for preference-gathering', async () => {
      const content = await workspace.filesystem.readFile(
        '/skills/preference-gathering/SKILL.md'
      );
      
      const keywords = ['preference', 'conversation', 'user', 'onboarding'];
      keywords.forEach(keyword => {
        expect(content.toLowerCase()).toContain(keyword);
      });
    });

    it('should have searchable keywords for data-validation', async () => {
      const content = await workspace.filesystem.readFile(
        '/skills/data-validation/SKILL.md'
      );
      
      const keywords = ['validate', 'validation', 'quality', 'data'];
      keywords.forEach(keyword => {
        expect(content.toLowerCase()).toContain(keyword);
      });
    });
  });

  describe('Skill Files', () => {
    it('should access SKILL.md files', async () => {
      const skillNames = [
        'job-analysis',
        'preference-gathering',
        'data-validation',
        'report-generation',
        'ops-debugging'
      ];
      
      for (const skillName of skillNames) {
        const content = await workspace.filesystem.readFile(
          `/skills/${skillName}/SKILL.md`
        );
        
        expect(content).toBeDefined();
        expect(content.length).toBeGreaterThan(100);
        
        // Should have frontmatter
        expect(content).toMatch(/^---\n/);
        expect(content).toContain(`name: ${skillName}`);
      }
    });

    it('should access job-analysis references', async () => {
      const references = [
        '/skills/job-analysis/references/remote-work-indicators.md',
        '/skills/job-analysis/references/salary-benchmarks.md',
        '/skills/job-analysis/references/skill-taxonomy.md',
      ];

      for (const ref of references) {
        const content = await workspace.filesystem.readFile(ref);
        expect(content).toBeDefined();
        expect(content.length).toBeGreaterThan(100);
      }
    });

    it('should access preference-gathering references', async () => {
      const schemaContent = await workspace.filesystem.readFile(
        '/skills/preference-gathering/references/preference-schema.json'
      );
      
      expect(schemaContent).toBeDefined();
      
      const schema = JSON.parse(schemaContent);
      expect(schema.$schema).toBeDefined();
      expect(schema.properties.preferences).toBeDefined();
    });

    it('should access data-validation references', async () => {
      const rulesContent = await workspace.filesystem.readFile(
        '/skills/data-validation/references/validation-rules.md'
      );
      
      expect(rulesContent).toBeDefined();
      expect(rulesContent).toContain('Job Posting Validations');
    });
  });

  describe('Skill Scripts', () => {
    it('should execute job analysis validation script', async () => {
      const { validateAnalysis } = await import(
        '@/workspace/skills/job-analysis/scripts/validate-analysis'
      );

      const validAnalysis = {
        title: 'Senior Engineer',
        company: 'Acme',
        remoteEU: 'yes' as const,
        requirements: ['5 years experience'],
        technicalStack: [
          { skill: 'React', priority: 'required' as const }
        ]
      };

      const result = validateAnalysis(validAnalysis);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid analysis', async () => {
      const { validateAnalysis } = await import(
        '@/workspace/skills/job-analysis/scripts/validate-analysis'
      );

      const invalidAnalysis = {
        // Missing required fields
        remoteEU: 'invalid' as any,
      };

      const result = validateAnalysis(invalidAnalysis);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should classify remote EU from text', async () => {
      const { classifyRemoteEU } = await import(
        '@/workspace/skills/job-analysis/scripts/validate-analysis'
      );

      const remoteEUJob = `
        Remote position available across Europe
        CET timezone required
        Work from Germany, France, or Netherlands
      `;

      const result = classifyRemoteEU(remoteEUJob);
      expect(result).toBe('yes');
    });

    it('should classify non-remote EU correctly', async () => {
      const { classifyRemoteEU } = await import(
        '@/workspace/skills/job-analysis/scripts/validate-analysis'
      );

      const nonRemoteJob = `
        In-office position in San Francisco
        Must be local to the Bay Area
        US only
      `;

      const result = classifyRemoteEU(nonRemoteJob);
      expect(resuNames = [
        'job-analysis',
        'preference-gathering',
        'data-validation',
        'report-generation',
        'ops-debugging'
      ];
      
      for (const skillName of skillNames) {
        const content = await workspace.filesystem.readFile(
          `/skills/${skillName}/SKILL.md`
        );
        
        // Should have "When to Use" section
        expect(content).toContain('When to Use');
        
        // Should have substantial content
        expect(content.length).toBeGreaterThan(1000);
      }
    });

    it('should have consistent formatting', async () => {
      const skillNames = [
        'job-analysis',
        'preference-gathering',
        'data-validation',
        'report-generation',
        'ops-debugging'
      ];
      
      for (const skillName of skillNames) {
        const content = await workspace.filesystem.readFile(
          `/skills/${skillN
    it('should have consistent formatting', async () => {
      const skills = await workspace.listSkills();
      
      for (const skill of skills) {
        const content = await workspace.filesystem.readFile(
          `/skills/${skill.name}/SKILL.md`
        );
        
        // Should have frontmatter delimiters
        const frontmatterMatches = content.match(/^---$/gm);
        expect(frontmatterMatches).toBeDefined();
        expect(frontmatterMatches!.length).toBeGreaterThanOrEqual(2);
      }
    });
  });
});
