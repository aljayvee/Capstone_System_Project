import { z } from "zod";

export const assignRiderSchema = z.object({
  riderId: z.coerce.number().int().positive("riderId is required."),
});

export type AssignRiderInput = z.infer<typeof assignRiderSchema>;

export const declineErrandSchema = z.object({
  reason: z.string().trim().max(300, "Reason must be at most 300 characters.").optional(),
});

export type DeclineErrandInput = z.infer<typeof declineErrandSchema>;
