import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError";
import Status from "../utils/HttpStatusCodes";
import { zodToApiError } from "../utils/handleZodError";
import { ApiResponse } from "../utils/ApiResponse";

export default function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // If it's a ZodError, convert to ApiError
  if (err instanceof ZodError) {
    err = zodToApiError(err);
  }

  // If it's already an ApiError, use it
  if (err instanceof ApiError) {
    return res
      .status(err.statusCode || Status.BadRequest)
      .json(
        new ApiResponse(
          err.statusCode || Status.BadRequest,
          err.data,
          err.message
        )
      );
  }

  // Generic fallback
  console.error("Unhandled error:", err);
  return res
    .status(Status.InternalServerError)
    .json(
      new ApiResponse(Status.InternalServerError, null, "Internal Server Error")
    );
}
