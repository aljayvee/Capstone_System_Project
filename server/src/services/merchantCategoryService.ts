import { merchantCategoryRepository } from "../repositories/merchantCategoryRepository.js";

export function listMerchantCategories() {
  return merchantCategoryRepository.findMany();
}

export function createMerchantCategory(name: string, description?: string) {
  return merchantCategoryRepository.create({ name, description });
}
