import { prisma } from "../lib/prisma.js";

export const merchantCategoryRepository = {
  findMany() {
    return prisma.merchantCategory.findMany();
  },

  create(data: { name: string; description?: string }) {
    return prisma.merchantCategory.create({ data });
  },
};
