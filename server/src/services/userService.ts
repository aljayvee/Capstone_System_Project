import bcrypt from "bcryptjs";
import { userRepository } from "../repositories/userRepository.js";
import { errandRepository } from "../repositories/errandRepository.js";
import { ServiceError } from "./ServiceError.js";
import { withFullName } from "./authService.js";
import { buildUserCreateData } from "./patterns/userFactory.js";
import type { CreateUserInput, UpdateUserInput, ProfileUpdateInput } from "../validators/userValidators.js";
import type { PushTokenInput } from "../validators/pushTokenValidators.js";

function sanitize<T extends { passwordHash: string }>(user: T) {
  const { passwordHash: _, ...rest } = user;
  return rest;
}

export async function listUsers() {
  const users = await userRepository.findMany();
  return users.map((u) => withFullName(sanitize(u)));
}

export async function createUser(input: CreateUserInput) {
  try {
    const createData = await buildUserCreateData(input);
    const newUser = await userRepository.create(createData);
    return withFullName(sanitize(newUser));
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string };
    if (errorObj?.code === "P2002") {
      throw new ServiceError(400, "User already exists with provided username or email");
    }
    throw new ServiceError(400, "Failed to create user: " + (errorObj?.message || "Unknown error"));
  }
}

export async function updateUser(userId: number, input: UpdateUserInput) {
  const existingUser = await userRepository.findById(userId);
  if (!existingUser) {
    throw new ServiceError(404, "User not found");
  }

  const updateData: Record<string, unknown> = {};
  if (input.username !== undefined) updateData.username = input.username.trim();
  if (input.firstName !== undefined) updateData.firstName = input.firstName.trim();
  if (input.middleName !== undefined) updateData.middleName = input.middleName.trim();
  if (input.lastName !== undefined) updateData.lastName = input.lastName.trim();
  if (input.email !== undefined) updateData.email = input.email.trim();
  if (input.phone !== undefined) updateData.phone = input.phone.trim();
  if (input.role !== undefined) updateData.role = input.role.toUpperCase();
  if (input.status !== undefined) updateData.status = input.status;

  if (input.password && input.password.trim() !== "") {
    updateData.passwordHash = await bcrypt.hash(input.password, 10);
  }

  try {
    const updatedUser = await userRepository.update(userId, updateData);
    return withFullName(sanitize(updatedUser));
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string };
    if (errorObj?.code === "P2002") {
      throw new ServiceError(400, "Username or email is already taken by another account");
    }
    throw new ServiceError(400, "Failed to update user: " + (errorObj?.message || "Unknown error"));
  }
}

export async function updateProfile(targetUserId: number, input: ProfileUpdateInput) {
  const existingUser = await userRepository.findById(targetUserId);
  if (!existingUser) {
    throw new ServiceError(404, "User not found");
  }

  const newFirstName = input.firstName && input.firstName !== "" ? input.firstName : existingUser.firstName;
  const newLastName = input.lastName && input.lastName !== "" ? input.lastName : existingUser.lastName;
  const newEmail = input.email && input.email !== "" ? input.email : existingUser.email;
  const newPhone = input.phone && input.phone !== "" ? input.phone : existingUser.phone;

  const updatedUser = await userRepository.update(targetUserId, {
    firstName: newFirstName,
    lastName: newLastName,
    email: newEmail,
    phone: newPhone,
  });

  return withFullName(sanitize(updatedUser));
}

export async function registerPushToken(riderId: number, input: PushTokenInput) {
  const existingUser = await userRepository.findById(riderId);
  if (!existingUser) {
    throw new ServiceError(404, "User not found");
  }
  await userRepository.updatePushToken(riderId, input.token);
}

export async function getRiderProfile(riderId: number) {
  const user = await userRepository.findById(riderId);
  if (!user) {
    throw new ServiceError(404, "Rider user not found in database");
  }
  return withFullName(sanitize(user));
}

export async function listOnlineRiders() {
  const riders = await userRepository.findRiders();
  return riders.map((r) => ({
    id: r.id,
    name: `${r.firstName} ${r.lastName}`.trim(),
    phone: r.phone,
    status: "Available",
    activeOrdersCount: 0,
  }));
}

// Full fleet roster (all statuses, real active-order counts) — backs dispatcher/owner
// rider-monitoring views, replacing the frontend's dead mock rider list.
export async function listAllRiders() {
  const [riders, activeCounts] = await Promise.all([
    userRepository.findAllRiders(),
    errandRepository.countActiveByRider(),
  ]);

  const countByRiderId = new Map<number, number>();
  for (const entry of activeCounts) {
    if (entry.riderId !== null) {
      countByRiderId.set(entry.riderId, entry._count._all);
    }
  }

  return riders.map((r) => ({
    id: r.id,
    name: `${r.firstName} ${r.lastName}`.trim(),
    phone: r.phone,
    avatar: r.avatar,
    status: r.status,
    activeOrdersCount: countByRiderId.get(r.id) ?? 0,
  }));
}
