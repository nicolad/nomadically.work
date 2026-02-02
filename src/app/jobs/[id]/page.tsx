"use client";

import { useGetJobQuery } from "@/__generated__/hooks";
import { Card } from "@/components/ui/card";
import { Badge, Skeleton } from "@radix-ui/themes";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function JobPage() {
  const params = useParams();
  const id = params.id as string;

  const { data, loading, error } = useGetJobQuery({
    variables: { id },
  });

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton height="400px" />
      </div>
    );
  }

  if (error || !data?.job) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Job Not Found</h1>
          <p className="text-gray-600 mb-4">
            The job you're looking for doesn't exist or has been removed.
          </p>
          <Link
            href="/jobs"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to Jobs
          </Link>
        </Card>
      </div>
    );
  }

  const job = data.job;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/jobs"
          className="text-blue-600 hover:text-blue-800 underline text-sm"
        >
          ← Back to Jobs
        </Link>
      </div>

      <Card className="p-8">
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
              <div className="flex items-center gap-4 text-gray-600 mb-4">
                {job.company_key && (
                  <span className="font-medium">{job.company_key}</span>
                )}
                {job.location && <span>📍 {job.location}</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {job.status && (
              <Badge
                color={
                  job.status === "eu-remote"
                    ? "green"
                    : job.status === "non-eu"
                      ? "red"
                      : "gray"
                }
              >
                {job.status}
              </Badge>
            )}
            {job.source_kind && <Badge>{job.source_kind}</Badge>}
            {job.score && (
              <Badge color="blue">Score: {(job.score * 100).toFixed(0)}%</Badge>
            )}
          </div>
        </div>

        <div className="prose max-w-none mb-8">
          <h2 className="text-xl font-semibold mb-3">Description</h2>
          <div
            className="text-gray-700 whitespace-pre-wrap"
            dangerouslySetInnerHTML={{
              __html: job.description || "No description available",
            }}
          />
        </div>

        {job.score_reason && (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">
              Classification Reason
            </h2>
            <p className="text-gray-700">{job.score_reason}</p>
          </div>
        )}

        <div className="border-t pt-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-6">
            <div>
              <span className="font-medium">Source:</span> {job.source_kind}
            </div>
            {job.posted_at && (
              <div>
                <span className="font-medium">Posted:</span>{" "}
                {new Date(job.posted_at).toLocaleDateString()}
              </div>
            )}
            {job.created_at && (
              <div>
                <span className="font-medium">Added:</span>{" "}
                {new Date(job.created_at).toLocaleDateString()}
              </div>
            )}
            {job.external_id && (
              <div className="col-span-2">
                <span className="font-medium">External ID:</span>{" "}
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {job.external_id}
                </code>
              </div>
            )}
          </div>

          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Apply Now →
          </a>
        </div>
      </Card>
    </div>
  );
}
