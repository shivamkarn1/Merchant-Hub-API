import { z } from "zod";

// minimal validation but production level
export const createProductSchema = z.object({
  sku: z.string().min(1).max(64),
  name: z.string().min(1).max(255),
  description: z.string().optional(),

  price: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),

  stock: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional(),

  image_url: z.string().url().optional(),
  image_alt: z.string().optional(),

  // metadata can be any JSON object
  metadata: z.any().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export default createProductSchema;
