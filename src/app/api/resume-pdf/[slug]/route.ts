export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Dynamic import to avoid bundling issues
  const { renderResumePdf } = await import("./render-resume-pdf");
  const pdf = await renderResumePdf(slug);

  if (!pdf) {
    return new Response("Resume not found", { status: 404 });
  }

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${slug}-resume.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
