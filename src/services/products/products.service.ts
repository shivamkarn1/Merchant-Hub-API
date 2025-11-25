import { db } from "../../db/db";
import { productsTable } from "../../db/products.schema";
import { ApiError } from "../../utils/ApiError";
import Status from "../../utils/HttpStatusCodes";
import { AuthUser } from "../../types/auth.types";
import { ABACPolicy } from "../../middlewares/abac.middleware";
import { eq, and } from "drizzle-orm";
import type { CreateProductInput } from "../../controllers/products/product.validation";

async function createProduct(payload: CreateProductInput, user: AuthUser) {
  try {
    // Added user context to the product
    const productData = {
      ...payload,
      created_by: user.id,
      merchant_id: user.merchant_id || user.id,
    };
    //  returning() to get the created row back (pg driver + drizzle)
    const [created] = await db
      .insert(productsTable)
      .values(productData as any)
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
async function getProductById(id: number, user: AuthUser) {
  const product = await db.query.productsTable.findFirst({
    where: eq(productsTable.id, id),
  });
  if (!product) {
    throw new ApiError(Status.NotFound, "Product not found");
  }
  const canAccess = ABACPolicy.canAccessResource({
    user,
    resourceOwnerId: product.created_by,
    resourceMerchantId: product.merchant_id,
    action: "read",
  });
  if (!canAccess) {
    throw new ApiError(Status.Forbidden, "Access Denied to this product");
  }
  return product;
}
async function updateProduct(
  id: number,
  payload: Partial<CreateProductInput>,
  user: AuthUser
) {
  // First check product exists and user has access,
  const existing_product = await getProductById(id, user);

  if (!existing_product) {
    throw new ApiError(
      Status.NotFound,
      "Product Doesn't Exist , Can't Modify NonExisting Product"
    );
  }

  const canAccess = ABACPolicy.canAccessResource({
    user,
    resourceOwnerId: existing_product.created_by,
    resourceMerchantId: existing_product.merchant_id,
    action: "update",
  });
  if (!canAccess) {
    throw new ApiError(
      Status.Forbidden,
      "Access Denied to update this product"
    );
  }
  //  Filter out undefined values
  const updateData = Object.fromEntries(
    Object.entries(payload).filter(([_, value]) => value !== undefined)
  );
  const [updated] = await db
    .update(productsTable)
    .set({ ...updateData, updated_at: new Date() })
    .where(eq(productsTable.id, id))
    .returning();

  return updated;
}
async function deleteProduct(id: number, user: AuthUser) {
  const existing = await getProductById(id, user);

  if (!existing) {
    throw new ApiError(Status.NotFound, "Product Doesn't Exist ");
  }

  const canAccess = ABACPolicy.canAccessResource({
    user,
    resourceOwnerId: existing.created_by,
    resourceMerchantId: existing.merchant_id,
    action: "delete",
  });
  if (!canAccess) {
    throw new ApiError(
      Status.Forbidden,
      "Access Denied to Delete this product!"
    );
  }
  // soft delete
  const [deleted] = await db
    .update(productsTable)
    .set({ deleted_at: new Date() })
    .where(eq(productsTable.id, id))
    .returning();
  return deleted;
}

export { createProduct, getProductById, updateProduct, deleteProduct };
