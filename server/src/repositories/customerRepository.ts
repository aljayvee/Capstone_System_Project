import { prisma } from "../lib/prisma.js";
import type { Prisma } from "@prisma/client";

const WITH_INFORMATION = { information: true } as const;

export interface CustomerCreateData {
  username: string;
  passwordHash: string;
  email: string;
  status?: string;
  information: {
    firstName: string;
    middleName?: string;
    lastName: string;
    phone?: string;
    avatar?: string;
  };
}

export interface CustomerUpdateData {
  username?: string;
  email?: string;
  status?: string;
  passwordHash?: string;
  information?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    phone?: string;
    avatar?: string;
  };
}

export const customerRepository = {
  findByUsername(username: string) {
    return prisma.customerAccount.findUnique({ where: { username }, include: WITH_INFORMATION });
  },

  findById(id: number) {
    return prisma.customerAccount.findUnique({ where: { id }, include: WITH_INFORMATION });
  },

  findByUsernameOrEmail(username: string, email: string) {
    return prisma.customerAccount.findFirst({
      where: { OR: [{ username }, { email }] },
      include: WITH_INFORMATION,
    });
  },

  create(data: CustomerCreateData) {
    const { information, ...account } = data;
    return prisma.customerAccount.create({
      data: {
        ...account,
        information: { create: information },
      } as Prisma.CustomerAccountCreateInput,
      include: WITH_INFORMATION,
    });
  },

  update(id: number, data: CustomerUpdateData) {
    const { information, ...account } = data;
    return prisma.customerAccount.update({
      where: { id },
      data: {
        ...account,
        ...(information ? { information: { update: information } } : {}),
      } as Prisma.CustomerAccountUpdateInput,
      include: WITH_INFORMATION,
    });
  },
};
