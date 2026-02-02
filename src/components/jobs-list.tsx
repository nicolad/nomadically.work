"use client";

import { useGetJobsQuery } from "@/__generated__/hooks";

export function JobsList() {
  const { loading, error, data, refetch } = useGetJobsQuery({
    variables: {
      limit: 50,
      offset: 0,
    },
    pollInterval: 60000, // Refresh every minute
  });

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="text-gray-500">Loading jobs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="text-red-500">Error loading jobs: {error.message}</div>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  const jobs = data?.jobs || [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Jobs from Cloudflare D1</h1>
        <div className="text-sm text-gray-500">{jobs.length} jobs found</div>
      </div>

      <div className="grid gap-4">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="border rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-xl font-semibold">{job.title}</h2>
              {job.status && (
                <span className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                  {job.status}
                </span>
              )}
            </div>

            <div className="text-gray-600 mb-2">
              {job.company && (
                <span className="font-medium">{job.company}</span>
              )}
              {job.location && <span className="ml-2">• {job.location}</span>}
              {job.salary && <span className="ml-2">• {job.salary}</span>}
            </div>

            {job.employmentType && (
              <div className="text-sm text-gray-500 mb-2">
                {job.employmentType}
                {job.experienceLevel && ` • ${job.experienceLevel}`}
                {job.remoteFriendly && ` • Remote Friendly`}
              </div>
            )}

            {job.techStack && job.techStack.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {job.techStack.map((tech, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}

            {job.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {job.description}
              </p>
            )}

            <div className="flex justify-between items-center mt-4">
              <div className="text-xs text-gray-400">
                {job.sourceType && <span>Source: {job.sourceType}</span>}
                {job.publishedDate && (
                  <span className="ml-3">
                    Posted: {new Date(job.publishedDate).toLocaleDateString()}
                  </span>
                )}
              </div>

              {job.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                >
                  View Job
                </a>
              )}
            </div>

            {job.applied && job.appliedAt && (
              <div className="mt-3 pt-3 border-t text-sm text-green-600">
                ✓ Applied on {new Date(job.appliedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        ))}

        {jobs.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No jobs found in the database.
          </div>
        )}
      </div>
    </div>
  );
}
