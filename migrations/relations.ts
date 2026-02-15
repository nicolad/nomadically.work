import { relations } from "drizzle-orm/relations";
import { jobSources, jobs, companies, jobSkillTags, companyFacts, companySnapshots, atsBoards } from "./schema";

export const jobsRelations = relations(jobs, ({one, many}) => ({
	jobSource: one(jobSources, {
		fields: [jobs.sourceId],
		references: [jobSources.id]
	}),
	company: one(companies, {
		fields: [jobs.companyId],
		references: [companies.id]
	}),
	jobSkillTags: many(jobSkillTags),
}));

export const jobSourcesRelations = relations(jobSources, ({many}) => ({
	jobs: many(jobs),
}));

export const companiesRelations = relations(companies, ({many}) => ({
	jobs: many(jobs),
	companyFacts: many(companyFacts),
	companySnapshots: many(companySnapshots),
	atsBoards: many(atsBoards),
}));

export const jobSkillTagsRelations = relations(jobSkillTags, ({one}) => ({
	job: one(jobs, {
		fields: [jobSkillTags.jobId],
		references: [jobs.id]
	}),
}));

export const companyFactsRelations = relations(companyFacts, ({one}) => ({
	company: one(companies, {
		fields: [companyFacts.companyId],
		references: [companies.id]
	}),
}));

export const companySnapshotsRelations = relations(companySnapshots, ({one}) => ({
	company: one(companies, {
		fields: [companySnapshots.companyId],
		references: [companies.id]
	}),
}));

export const atsBoardsRelations = relations(atsBoards, ({one}) => ({
	company: one(companies, {
		fields: [atsBoards.companyId],
		references: [companies.id]
	}),
}));