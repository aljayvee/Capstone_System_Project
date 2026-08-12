import { prisma } from "../lib/prisma.js";
import type { Prisma } from "@prisma/client";

export const userRepository = {
  findByUsername(username: string) {
    return prisma.user.findUnique({ where: { username } });
  },

  findById(id: number) {
    return prisma.user.findUnique({ where: { id } });
  },

  findByUsernameOrEmail(username: string, email: string) {
    return prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
  },

  findMany() {
    return prisma.user.findMany();
  },

  findRiders() {
    return prisma.user.findMany({
      where: { role: "RIDER", status: "Active" },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        status: true,
      },
    });
  },

  // Full roster regardless of status — backs the dispatcher/owner fleet-monitoring
  // views, unlike findRiders() above which only returns currently-Active riders.
  findAllRiders() {
    return prisma.user.findMany({
      where: { role: "RIDER" },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        status: true,
      },
    });
  },

  create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data });
  },

  update(id: number, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data });
  },

  updatePushToken(id: number, expoPushToken: string) {
    return prisma.user.update({ where: { id }, data: { expoPushToken } });
  },
};
