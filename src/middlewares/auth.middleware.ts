import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import Status from "../utils/HttpStatusCodes";
import { AuthUser } from "../types/auth.types";
import * as jwt from "jsonwebtoken";

const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(Status.Unauthorized, "Authentication token required");
    }

    // Just toEnsure JWT_SECRET exists
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new ApiError(
        Status.InternalServerError,
        "JWT secret not configured"
      );
    }

    const decoded = jwt.verify(token, secret);

    // Type guard to ensure decoded is an object and not a string
    if (typeof decoded === "string") {
      throw new ApiError(Status.Unauthorized, "Invalid token format");
    }

    req.user = decoded as AuthUser;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new ApiError(Status.Unauthorized, "Invalid Token"));
    }
    next(error);
  }
};

export { authenticate };
