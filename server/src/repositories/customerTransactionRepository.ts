import { prisma } from "../lib/prisma.js";

const WITH_ERRAND_DETAILS = {
  errand: {
    include: {
      pabiliDetails: true,
      rider: { select: { firstName: true, lastName: true } },
    },
  },
} as const;

export const customerTransactionRepository = {
  create(customerId: number, errandId: string, amount: number, paymentMethod: string) {
    return prisma.customerTransaction.create({
      data: { customerId, errandId, amount, paymentMethod },
    });
  },

  findByCustomerId(customerId: number) {
    return prisma.customerTransaction.findMany({
      where: { customerId },
      include: WITH_ERRAND_DETAILS,
      orderBy: { createdAt: "desc" },
    });
  },
};
