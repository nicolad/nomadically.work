/**
 * Ashby API client - safe for client-side use
 */

import { ASHBY_API_DOMAIN } from "../../constants/ats";

export async function fetchAshbyBoardJobs(
  boardName: string,
  includeCompensation: boolean = true,
) {
  const url = new URL(
    `https://${ASHBY_API_DOMAIN}/posting-api/job-board/${boardName}`,
  );

  if (includeCompensation) {
    url.searchParams.set("includeCompensation", "true");
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(
      `Ashby API error for board '${boardName}': ${response.status}`,
    );
  }

  return response.json();
}
