import { asyncHandler } from "../lib/asyncHandler.js";
import * as merchantCategoryService from "../services/merchantCategoryService.js";

export const listMerchantCategories = asyncHandler(async (req, res) => {
  const categories = await merchantCategoryService.listMerchantCategories();
  res.json(categories);
});

export const createMerchantCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const category = await merchantCategoryService.createMerchantCategory(name, description);
  res.status(201).json(category);
});
