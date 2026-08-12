import { prisma } from "../lib/prisma.js";
import type { Prisma } from "@prisma/client";

// Shared Prisma include shape for errand relations. firstName/lastName are selected
// (not a stored `name` column — see 3NF note on the User model) and combined into a
// display-only `name` field by errandService.attachErrandNames() before the response.
// `customer` is nested under CustomerInformation (split from CustomerAccount) —
// errandService.attachErrandNames() flattens it back to firstName/lastName/phone/name
// so the HTTP response contract the web dashboard consumes is unchanged.
export const ERRAND_INCLUDE = {
  customer: { select: { information: { select: { firstName: true, lastName: true, phone: true } } } },
  rider: { select: { firstName: true, lastName: true, phone: true } },
  pabiliDetails: true,
  pinpoints: { orderBy: { sequence: "asc" as const } },
  dispatchLogs: {
    include: { dispatcher: { select: { firstName: true, lastName: true } } },
    orderBy: { dispatchedAt: "desc" as const },
    take: 1,
  },
} as const;

export const errandRepository = {
  findMany() {
    return prisma.errand.findMany({ include: ERRAND_INCLUDE, orderBy: { createdAt: "desc" } });
  },

  // Dispatcher-scoped queue: every unclaimed (AVAILABLE) errand, plus every errand
  // this dispatcher has personally claimed (any status) — hides other dispatchers'
  // claims while keeping this dispatcher's own in-progress/completed work visible.
  findManyForDispatcher(dispatcherId: number) {
    return prisma.errand.findMany({
      where: { OR: [{ status: "AVAILABLE" }, { dispatchLogs: { some: { dispatcherId } } }] },
      include: ERRAND_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: string) {
    return prisma.errand.findUnique({ where: { id }, include: ERRAND_INCLUDE });
  },

  findByIdWithPabiliDetails(id: string) {
    return prisma.errand.findUnique({ where: { id }, include: { pabiliDetails: true } });
  },

  findByIdBasic(id: string) {
    return prisma.errand.findUnique({ where: { id } });
  },

  findStatusAndRiderById(id: string) {
    return prisma.errand.findUnique({ where: { id }, select: { status: true, riderId: true } });
  },

  findByIdWithDispatchLogs(id: string) {
    return prisma.errand.findUnique({ where: { id }, include: { dispatchLogs: true } });
  },

  findByCustomerId(customerId: number) {
    return prisma.errand.findMany({
      where: { customerId },
      include: ERRAND_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  },

  findByRiderId(riderId: number) {
    return prisma.errand.findMany({
      where: { riderId },
      include: ERRAND_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  },

  // Counts in-progress (not yet DELIVERED/COMPLETED/CANCELLED) errands per rider in one
  // query. Deliberately excludes rather than includes specific "active" status names —
  // sidesteps the documented IN_TRANSIT-vs-DB-enum mismatch (see errandStateMachine.ts)
  // entirely, since it only needs to know what's NOT finished yet.
  countActiveByRider() {
    return prisma.errand.groupBy({
      by: ["riderId"],
      where: { riderId: { not: null }, status: { notIn: ["DELIVERED", "COMPLETED", "CANCELLED"] } },
      _count: { _all: true },
    });
  },

  // Unchecked* input types are used here (not the relation-based CreateInput/UpdateInput)
  // because callers pass scalar foreign keys directly (customerId, riderId), matching the
  // original inline handlers this was migrated from.
  create(data: Prisma.ErrandUncheckedCreateInput) {
    return prisma.errand.create({ data, include: ERRAND_INCLUDE });
  },

  update(id: string, data: Prisma.ErrandUncheckedUpdateInput) {
    return prisma.errand.update({ where: { id }, data, include: ERRAND_INCLUDE });
  },

  // Atomic claim guard: only flips AVAILABLE -> PENDING if it's still AVAILABLE at
  // the moment of the write, closing the TOCTOU race between the read-then-write
  // "already claimed?" check in errandService.claimErrand and this update.
  claimIfAvailable(id: string) {
    return prisma.errand.updateMany({ where: { id, status: "AVAILABLE" }, data: { status: "PENDING" } });
  },
};

export const dispatchLogRepository = {
  findLatestByErrandId(errandId: string) {
    return prisma.dispatchLog.findFirst({
      where: { errandId },
      include: { dispatcher: true },
      orderBy: { dispatchedAt: "desc" },
    });
  },

  create(errandId: string, dispatcherId: number) {
    return prisma.dispatchLog.create({ data: { errandId, dispatcherId } });
  },
};
