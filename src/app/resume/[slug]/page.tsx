import { notFound } from "next/navigation";
import type { Metadata } from "next";
import resumeData from "@/apollo/resolvers/resume/resume-data.json";
import "./resume.css";

const SLUGS: Record<string, typeof resumeData> = {
  vadim: resumeData,
};

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = SLUGS[slug];
  if (!data) return {};
  return {
    title: `${data.basics.name} — ${data.basics.label}`,
    description: data.basics.summary,
  };
}

export default async function ResumePdfPage({ params }: Props) {
  const { slug } = await params;
  const data = SLUGS[slug];
  if (!data) notFound();

  const { basics, skills, work, education, activities, volunteer } = data;

  return (
    <div className="resume">
      {/* Header */}
      <header className="resume-header">
        <h1>{basics.name}</h1>
        <p className="label">{basics.label}</p>
        <div className="contact">
          <span>{basics.email}</span>
          <span>{basics.phone}</span>
          {basics.profiles.map((p) => (
            <a key={p.network} href={p.url} target="_blank" rel="noopener noreferrer">
              {p.network === "github" ? "GitHub" : "LinkedIn"}: {p.username}
            </a>
          ))}
          {basics.url && (
            <a href={basics.url} target="_blank" rel="noopener noreferrer">
              {basics.url.replace("https://", "")}
            </a>
          )}
        </div>
      </header>

      {/* Key Skills banner */}
      {basics.keySkills && (
        <div className="resume-key-skills">{basics.keySkills}</div>
      )}

      {/* Summary */}
      <section className="resume-section">
        <h2>Summary</h2>
        <p style={{ fontSize: 12, lineHeight: 1.6 }}>{basics.summary}</p>
      </section>

      {/* Two-column body */}
      <div className="resume-body">
        {/* Left column — experience + projects + open source */}
        <div className="resume-main">
          <section className="resume-section">
            <h2>Experience</h2>
            {work.map((job) => (
              <div key={job.id} className="resume-entry">
                <div className="resume-entry-header">
                  <h3>{job.position}</h3>
                  <span className="dates">{job.startDate} — {job.endDate ?? "Present"}</span>
                </div>
                <div className="company">{job.name}</div>
                <div
                  className="summary"
                  dangerouslySetInnerHTML={{ __html: job.summary }}
                />
              </div>
            ))}
          </section>

          {/* AI / Side Projects */}
          {activities.aiProjects && activities.aiProjects.length > 0 && (
            <section className="resume-section">
              <h2>AI &amp; Side Projects</h2>
              {activities.aiProjects.map((proj) => (
                <div key={proj.id} className="resume-project">
                  <h3>
                    {proj.websiteUrl ? (
                      <a href={proj.websiteUrl} target="_blank" rel="noopener noreferrer">
                        {proj.name}
                      </a>
                    ) : (
                      proj.name
                    )}
                  </h3>
                  <div className="description">{proj.description}</div>
                  {proj.highlights.length > 0 && (
                    <ul>
                      {proj.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Open Source */}
          {volunteer.length > 0 && (
            <section className="resume-section">
              <h2>Open Source</h2>
              {volunteer.map((v) => (
                <div key={v.id} className="resume-volunteer">
                  <h3>
                    {v.url ? (
                      <a href={v.url} target="_blank" rel="noopener noreferrer">
                        {v.organization}
                      </a>
                    ) : (
                      v.organization
                    )}
                  </h3>
                  <div className="role">
                    {v.position} · {v.startDate} — {v.endDate ?? "Present"}
                  </div>
                  <div
                    className="summary"
                    dangerouslySetInnerHTML={{ __html: v.summary }}
                  />
                </div>
              ))}
            </section>
          )}
        </div>

        {/* Right column — skills + education */}
        <div className="resume-sidebar">
          <section className="resume-section">
            <h2>Skills</h2>

            <div className="resume-skill-group">
              <h3>Languages</h3>
              <div className="resume-skill-list">
                {skills.languages.map((s) => (
                  <span key={s.name} className="resume-skill-tag">{s.name}</span>
                ))}
              </div>
            </div>

            <div className="resume-skill-group">
              <h3>Frameworks &amp; Libraries</h3>
              <div className="resume-skill-list">
                {[...skills.frameworks, ...skills.libraries].map((s) => (
                  <span key={s.name} className="resume-skill-tag">{s.name}</span>
                ))}
              </div>
            </div>

            <div className="resume-skill-group">
              <h3>Technologies</h3>
              <div className="resume-skill-list">
                {skills.technologies.map((s) => (
                  <span key={s.name} className="resume-skill-tag">{s.name}</span>
                ))}
              </div>
            </div>

            <div className="resume-skill-group">
              <h3>Databases</h3>
              <div className="resume-skill-list">
                {skills.databases.map((s) => (
                  <span key={s.name} className="resume-skill-tag">{s.name}</span>
                ))}
              </div>
            </div>

            <div className="resume-skill-group">
              <h3>Tools &amp; Platforms</h3>
              <div className="resume-skill-list">
                {skills.tools.map((s) => (
                  <span key={s.name} className="resume-skill-tag">{s.name}</span>
                ))}
              </div>
            </div>

            <div className="resume-skill-group">
              <h3>Practices</h3>
              <div className="resume-skill-list">
                {skills.practices.map((s) => (
                  <span key={s.name} className="resume-skill-tag">{s.name}</span>
                ))}
              </div>
            </div>
          </section>

          <section className="resume-section">
            <h2>Education</h2>
            {education.map((edu) => (
              <div key={edu.id} className="resume-edu">
                <h3>{edu.studyType} — {edu.area}</h3>
                <div className="institution">{edu.institution}</div>
                <div className="dates">{edu.startDate} — {edu.endDate}</div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
