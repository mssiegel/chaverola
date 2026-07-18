import type {
  ApiErrorCode,
  ApiErrorResponse,
  ApiFieldIssue,
} from "@chaverola/shared";

/*
  Every expected failure is thrown as an HttpError; the error middleware in
  app.ts turns it into the shared envelope. Messages here are wire text for
  developers (curl, logs) — the client renders its own copy per state.
*/

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly issues?: ApiFieldIssue[]
  ) {
    super(message);
    this.name = "HttpError";
  }

  toBody(): ApiErrorResponse {
    const error: ApiErrorResponse["error"] = {
      code: this.code,
      message: this.message,
    };
    if (this.issues !== undefined) error.issues = this.issues;
    return { error };
  }
}

export function notFound(): HttpError {
  return new HttpError(404, "not_found", "No activity there.");
}

export function invalidRequest(issues: ApiFieldIssue[]): HttpError {
  return new HttpError(
    400,
    "invalid_request",
    "The request body failed validation.",
    issues
  );
}

export function invalidJson(): HttpError {
  return new HttpError(400, "invalid_json", "The body is not valid JSON.");
}

export function capacity(): HttpError {
  return new HttpError(
    503,
    "capacity",
    "The server is at capacity. Try again in a few minutes."
  );
}
