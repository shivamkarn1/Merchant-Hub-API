import { z, ZodError } from "zod";
import { ApiError } from "./ApiError";
import Status from "./HttpStatusCodes";

/**
 * Convert a ZodError into an ApiError (HTTP 400) with structured issues
 * so controllers or middleware can throw/send a consistent error shape.
 */
export function zodToApiError(err: ZodError, message?: string) {
  const issues = err.issues ?? [];
  const first = issues[0];
  const msg = message ?? first?.message ?? "Invalid request payload";
  return new ApiError(Status.BadRequest, msg, issues, err.stack ?? "");
}

export default zodToApiError;
