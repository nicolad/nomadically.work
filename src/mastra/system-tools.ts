/**
 * System tools for job classification and data processing
 */

export type ApiResponse<T, K> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: K;
    };

// Future: Add job fetching tools, ATS API integration helpers, etc.
