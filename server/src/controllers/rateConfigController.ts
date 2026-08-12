import { asyncHandler } from "../lib/asyncHandler.js";
import * as rateConfigService from "../services/rateConfigService.js";

export const getRateConfig = asyncHandler(async (req, res) => {
  const config = await rateConfigService.getRateConfig();
  res.json(config);
});

export const updateRateConfig = asyncHandler(async (req, res) => {
  const { baseFee, perKmRate, serviceFeePercent, nightSurcharge } = req.body;
  const updated = await rateConfigService.updateRateConfig({ baseFee, perKmRate, serviceFeePercent, nightSurcharge });
  res.json(updated);
});
