import { Response } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { parseOrThrow } from "../validators/validate.js";
import { customerProfileUpdateSchema } from "../validators/customerValidators.js";
import * as customerService from "../services/customerService.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { ServiceError } from "../services/ServiceError.js";

function assertSelfOrOwner(req: AuthenticatedRequest, targetId: number) {
  const callerRole = String(req.user?.role || "").toUpperCase();
  if (callerRole !== "OWNER" && req.user?.id !== targetId) {
    throw new ServiceError(403, "Access denied: You can only access your own customer account.");
  }
}

export const getCustomerProfile = asyncHandler<AuthenticatedRequest>(async (req, res: Response) => {
  const customerId = parseInt(req.params.id, 10);
  if (isNaN(customerId)) {
    throw new ServiceError(400, "Invalid customer ID");
  }
  assertSelfOrOwner(req, customerId);

  const customer = await customerService.getProfile(customerId);
  res.json(customer);
});

export const updateCustomerProfile = asyncHandler<AuthenticatedRequest>(async (req, res: Response) => {
  const customerId = parseInt(req.params.id, 10);
  if (isNaN(customerId)) {
    throw new ServiceError(400, "Invalid customer ID");
  }
  assertSelfOrOwner(req, customerId);

  const input = parseOrThrow(customerProfileUpdateSchema, req.body);
  const customer = await customerService.updateProfile(customerId, input);
  res.status(200).json({ message: "Profile updated successfully", user: customer });
});

export const getCustomerTransactions = asyncHandler<AuthenticatedRequest>(async (req, res: Response) => {
  const customerId = parseInt(req.params.id, 10);
  if (isNaN(customerId)) {
    throw new ServiceError(400, "Invalid customer ID");
  }
  assertSelfOrOwner(req, customerId);

  const transactions = await customerService.listTransactions(customerId);
  res.json(transactions);
});
