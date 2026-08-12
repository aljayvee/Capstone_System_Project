import { Response } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import * as errandService from "../services/errandService.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { ServiceError } from "../services/ServiceError.js";
import { parseOrThrow } from "../validators/validate.js";
import { assignRiderSchema, declineErrandSchema } from "../validators/errandValidators.js";
import { pinpointsBodySchema } from "../validators/pinpointValidators.js";

export const listErrands = asyncHandler<AuthenticatedRequest>(async (req, res: Response) => {
  const callerRole = String(req.user?.role || "").toUpperCase();
  const errands = await errandService.listErrands({ id: req.user!.id, role: callerRole });
  res.json(errands);
});

export const getErrandById = asyncHandler<AuthenticatedRequest>(async (req, res: Response) => {
  const errand = await errandService.getErrandById(req.params.id);
  if (!errand) {
    throw new ServiceError(404, "Errand not found");
  }

  // IDOR check: customers can only see their own errands; riders can only see errands assigned to them
  const callerRole = String(req.user?.role || "").toUpperCase();
  const callerId = req.user?.id;
  if (callerRole === "CUSTOMER" && errand.customerId !== callerId) {
    throw new ServiceError(403, "Access denied: You can only view your own errands.");
  }
  if (callerRole === "RIDER" && errand.riderId !== callerId) {
    throw new ServiceError(403, "Access denied: You can only view errands assigned to you.");
  }

  res.json(errand);
});

export const listErrandsForUser = asyncHandler<AuthenticatedRequest>(async (req, res: Response) => {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) {
    throw new ServiceError(400, "Invalid user ID");
  }

  // IDOR check: customers can only query their own errand history
  const callerRole = String(req.user?.role || "").toUpperCase();
  const callerId = req.user?.id;
  if (callerRole === "CUSTOMER" && callerId !== userId) {
    throw new ServiceError(403, "Access denied: You can only view your own errand history.");
  }

  const errands = await errandService.listErrandsForCustomer(userId);
  res.json(errands);
});

export const listErrandsForRider = asyncHandler<AuthenticatedRequest>(async (req, res: Response) => {
  const riderId = parseInt(req.params.riderId, 10);
  if (isNaN(riderId)) {
    throw new ServiceError(400, "Invalid rider ID");
  }

  // IDOR check: riders can only query their own assigned errands
  const callerRole = String(req.user?.role || "").toUpperCase();
  const callerId = req.user?.id;
  if (callerRole === "RIDER" && callerId !== riderId) {
    throw new ServiceError(403, "Access denied: You can only view errands assigned to you.");
  }

  const errands = await errandService.listErrandsForRider(riderId);
  res.json(errands);
});

export const createErrand = asyncHandler<AuthenticatedRequest>(async (req, res: Response) => {
  const errand = await errandService.createErrand(req.user!.id, req.body);
  res.status(201).json(errand);
});

export const claimErrand = asyncHandler<AuthenticatedRequest>(async (req, res: Response) => {
  const errand = await errandService.claimErrand(req.params.id, req.user!.id);
  res.json(errand);
});

export const acceptErrand = asyncHandler<AuthenticatedRequest>(async (req, res: Response) => {
  const errand = await errandService.acceptErrand(req.params.id, req.user!.id);
  res.json(errand);
});

export const assignRider = asyncHandler(async (req, res) => {
  const input = parseOrThrow(assignRiderSchema, req.body);
  const errand = await errandService.assignRider(req.params.id, input.riderId);
  res.json({ success: true, errand });
});

export const updateStatus = asyncHandler<AuthenticatedRequest>(async (req, res: Response) => {
  const callerRole = String(req.user?.role || "").toUpperCase();
  const errand = await errandService.updateStatus(req.params.id, req.body.status, {
    id: req.user!.id,
    role: callerRole,
  });
  res.json(errand);
});

export const declineErrand = asyncHandler<AuthenticatedRequest>(async (req, res: Response) => {
  const input = parseOrThrow(declineErrandSchema, req.body ?? {});
  const errand = await errandService.declineErrand(req.params.id, req.user!.id, input.reason);
  res.json(errand);
});

export const setPinpoints = asyncHandler<AuthenticatedRequest>(async (req, res: Response) => {
  const input = parseOrThrow(pinpointsBodySchema, req.body);
  const errand = await errandService.savePinpoints(req.params.id, input.pinpoints);
  res.json({ success: true, errand });
});
