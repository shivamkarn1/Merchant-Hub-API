import { db } from "../../db/db";
import { productsTable } from "../../db/products.schema";
import { ApiError } from "../../utils/ApiError";
import Status from "../../utils/HttpStatusCodes";

import type { CreateProductInput } from "../../controllers/products/product.validation";

export async function createProduct(payload: CreateProductInput) {
  try {
    //  returning() to get the created row back (pg driver + drizzle)
    const [created] = await db
      .insert(productsTable)
      .values(payload as any)
      .returning();

    if (!created) {
      throw new ApiError(
        Status.InternalServerError,
        "Failed to create product"
      );
    }

    return created;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      Status.InternalServerError,
      "Error creating product",
      [],
      err?.stack ?? ""
    );
  }
}

export default { createProduct };
