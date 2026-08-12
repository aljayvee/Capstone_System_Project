import { prisma } from "../lib/prisma.js";

export interface PinpointInput {
  storeName: string;
  latitude: number;
  longitude: number;
}

export const pinpointRepository = {
  findByErrandId(errandId: string) {
    return prisma.errandPinpoint.findMany({ where: { errandId }, orderBy: { sequence: "asc" } });
  },

  // Atomic replace-all: delete existing pins then insert the new set in one
  // transaction, so a dispatcher re-saving pins never leaves stale rows mixed in.
  replaceForErrand(errandId: string, pins: PinpointInput[]) {
    return prisma.$transaction([
      prisma.errandPinpoint.deleteMany({ where: { errandId } }),
      prisma.errandPinpoint.createMany({
        data: pins.map((pin, index) => ({
          errandId,
          sequence: index,
          storeName: pin.storeName,
          latitude: pin.latitude,
          longitude: pin.longitude,
        })),
      }),
    ]);
  },
};
