import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Link,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import resumeData from "@/apollo/resolvers/resume/resume-data.json";

const SLUGS: Record<string, typeof resumeData> = {
  vadim: resumeData,
};

/* ── Colors ───────────────────────────────────────────────── */
const C = {
  primary: "#111",
  secondary: "#555",
  accent: "#2563eb",
  border: "#e5e7eb",
  tagBg: "#f3f4f6",
  white: "#fff",
};

/* ── Styles ───────────────────────────────────────────────── */
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.primary,
    backgroundColor: C.white,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 28,
    lineHeight: 1.45,
  },

  /* Header */
  header: { marginBottom: 6, paddingBottom: 6, borderBottom: `2pt solid ${C.primary}`, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerLeft: {},
  headerRight: { alignItems: "flex-end", justifyContent: "center", gap: 2 },
  name: { fontSize: 22, fontFamily: "Helvetica-Bold", letterSpacing: -0.3, lineHeight: 1.2, marginBottom: 2 },
  label: { fontSize: 12, color: C.secondary, lineHeight: 1.2 },
  contactItem: { fontSize: 8.5, color: C.secondary, textAlign: "right" as const },
  contactLink: { fontSize: 8.5, color: C.accent, textDecoration: "none", textAlign: "right" as const },

  /* Summary */
  summary: { fontSize: 9, lineHeight: 1.5, marginBottom: 6 },

  /* Sections */
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
    borderBottom: `0.5pt solid ${C.border}`,
    paddingBottom: 3,
    marginBottom: 5,
    marginTop: 6,
  },

  /* Skills — inline rows */
  skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 3, marginBottom: 4 },
  skillGroupInline: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 3, marginBottom: 3 },
  skillGroupLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", marginRight: 2 },
  skillTag: { fontSize: 7.5, backgroundColor: C.tagBg, borderRadius: 2, paddingVertical: 1, paddingHorizontal: 4 },

  /* Work entries */
  entry: { marginBottom: 7 },
  entryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 1 },
  entryTitle: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  entryDates: { fontSize: 8, color: C.secondary, flexShrink: 0 },
  company: { fontSize: 9, color: C.secondary, marginBottom: 2 },
  bulletList: { paddingLeft: 10 },
  bullet: { fontSize: 8.5, lineHeight: 1.4, marginBottom: 1 },
  techStack: { fontSize: 8, color: C.secondary, marginTop: 1 },
  techLabel: { fontFamily: "Helvetica-Bold" },

  /* Projects */
  projectTitle: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  projectLink: { color: C.accent, textDecoration: "none" },
  projectDesc: { fontSize: 8.5, color: C.secondary, marginBottom: 2 },

  /* Volunteer / Open Source */
  volRole: { fontSize: 9, color: C.secondary, marginBottom: 2 },

  /* Education */
  eduRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  eduTitle: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  eduInstitution: { fontSize: 9, color: C.secondary },
  eduDates: { fontSize: 8, color: C.secondary },
});

/* ── Helpers ──────────────────────────────────────────────── */

function htmlToBullets(html: string): { bullets: string[]; techStack?: string } {
  let techStack: string | undefined;
  const bullets: string[] = [];

  // Extract each <li>...</li> content, then strip inner tags
  const liRegex = /<li>([\s\S]*?)<\/li>/gi;
  let match;
  while ((match = liRegex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, "").trim();
    if (!text) continue;
    if (text.startsWith("Tech stack:")) {
      techStack = text.replace("Tech stack:", "").trim();
    } else {
      bullets.push(text);
    }
  }

  // Fallback if no <li> tags found
  if (bullets.length === 0 && !techStack) {
    const stripped = html.replace(/<[^>]+>/g, "\n");
    for (const line of stripped.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("Tech stack:")) {
        techStack = trimmed.replace("Tech stack:", "").trim();
      } else {
        bullets.push(trimmed);
      }
    }
  }

  return { bullets, techStack };
}

/* ── Document ─────────────────────────────────────────────── */

function ResumeDocument({ data }: { data: typeof resumeData }) {
  const { basics, skills, work, education, activities, volunteer } = data;

  const skillGroups = [
    { title: "Languages:", items: skills.languages },
    { title: "Frameworks:", items: [...skills.frameworks, ...skills.libraries] },
    { title: "Technologies:", items: skills.technologies },
    { title: "Databases:", items: skills.databases },
    { title: "Tools:", items: skills.tools },
    { title: "Practices:", items: skills.practices },
  ];

  return (
    <Document title={`${basics.name} — ${basics.label}`} author={basics.name}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.name}>{basics.name}</Text>
            <Text style={s.label}>{basics.label}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.contactItem}>{basics.email}</Text>
            <Text style={s.contactItem}>{basics.phone}</Text>
            {basics.profiles.map((p) => (
              <Link key={p.network} src={p.url} style={s.contactLink}>
                {p.network === "github" ? "GitHub" : "LinkedIn"}: {p.username}
              </Link>
            ))}
            {basics.url && (
              <Link src={basics.url} style={s.contactLink}>
                {basics.url.replace("https://", "")}
              </Link>
            )}
          </View>
        </View>

        {/* Summary */}
        <Text style={s.sectionTitle}>Summary</Text>
        <Text style={s.summary}>{basics.summary}</Text>

        {/* Skills — compact inline rows */}
        <Text style={s.sectionTitle}>Skills</Text>
        {skillGroups.map((group) => (
          <View key={group.title} style={s.skillGroupInline}>
            <Text style={s.skillGroupLabel}>{group.title}</Text>
            {group.items.map((item) => (
              <Text key={item.name} style={s.skillTag}>{item.name}</Text>
            ))}
          </View>
        ))}

        {/* Experience */}
        <Text style={s.sectionTitle}>Experience</Text>
        {work.map((job) => {
          const { bullets, techStack } = htmlToBullets(job.summary);
          return (
            <View key={job.id} style={s.entry} wrap={false}>
              <View style={s.entryHeader}>
                <Text style={s.entryTitle}>{job.position}</Text>
                <Text style={s.entryDates}>
                  {job.startDate} — {job.endDate ?? "Present"}
                </Text>
              </View>
              <Text style={s.company}>{job.name}</Text>
              <View style={s.bulletList}>
                {bullets.map((b, i) => (
                  <Text key={i} style={s.bullet}>{"•  "}{b}</Text>
                ))}
              </View>
              {techStack && (
                <Text style={s.techStack}>
                  <Text style={s.techLabel}>Tech stack: </Text>
                  {techStack}
                </Text>
              )}
            </View>
          );
        })}

        {/* AI Projects */}
        {activities.aiProjects?.length > 0 && (
          <>
            <Text style={s.sectionTitle}>AI & Side Projects</Text>
            {activities.aiProjects.map((proj) => (
              <View key={proj.id} style={s.entry} wrap={false}>
                {proj.websiteUrl ? (
                  <Link src={proj.websiteUrl} style={[s.projectTitle, s.projectLink]}>
                    {proj.name}
                  </Link>
                ) : (
                  <Text style={s.projectTitle}>{proj.name}</Text>
                )}
                <Text style={s.projectDesc}>{proj.description}</Text>
                <View style={s.bulletList}>
                  {proj.highlights.map((h, i) => (
                    <Text key={i} style={s.bullet}>{"•  "}{h}</Text>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}

        {/* Open Source */}
        {volunteer.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Open Source</Text>
            {volunteer.map((v) => {
              const { bullets } = htmlToBullets(v.summary);
              return (
                <View key={v.id} style={s.entry} wrap={false}>
                  {v.url ? (
                    <Link src={v.url} style={[s.projectTitle, s.projectLink]}>
                      {v.organization}
                    </Link>
                  ) : (
                    <Text style={s.projectTitle}>{v.organization}</Text>
                  )}
                  <Text style={s.volRole}>
                    {v.position} · {v.startDate} — {v.endDate ?? "Present"}
                  </Text>
                  <View style={s.bulletList}>
                    {bullets.map((b, i) => (
                      <Text key={i} style={s.bullet}>{"•  "}{b}</Text>
                    ))}
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Education */}
        <Text style={s.sectionTitle}>Education</Text>
        {education.map((edu) => (
          <View key={edu.id} style={s.eduRow}>
            <View>
              <Text style={s.eduTitle}>{edu.studyType} — {edu.area}</Text>
              <Text style={s.eduInstitution}>{edu.institution}</Text>
            </View>
            <Text style={s.eduDates}>{edu.startDate} — {edu.endDate}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

/* ── Export ────────────────────────────────────────────────── */

export async function renderResumePdf(slug: string): Promise<Buffer | null> {
  const data = SLUGS[slug];
  if (!data) return null;

  const buffer = await renderToBuffer(<ResumeDocument data={data} />);
  return Buffer.from(buffer);
}
