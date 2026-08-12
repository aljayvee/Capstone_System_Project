import { z } from "zod";

export const customerProfileUpdateSchema = z.object({
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
});
export type CustomerProfileUpdateInput = z.infer<typeof customerProfileUpdateSchema>;
