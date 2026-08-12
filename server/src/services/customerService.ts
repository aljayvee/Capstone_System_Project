import { customerRepository } from "../repositories/customerRepository.js";
import { customerTransactionRepository } from "../repositories/customerTransactionRepository.js";
import { ServiceError } from "./ServiceError.js";
import { withFullName } from "./authService.js";
import { flattenCustomerAccount } from "./patterns/customerFactory.js";
import type { CustomerProfileUpdateInput } from "../validators/customerValidators.js";

export async function getProfile(customerId: number) {
  const customer = await customerRepository.findById(customerId);
  if (!customer) {
    throw new ServiceError(404, "Customer not found");
  }
  return withFullName(flattenCustomerAccount(customer));
}

export async function updateProfile(customerId: number, input: CustomerProfileUpdateInput) {
  const existing = await customerRepository.findById(customerId);
  if (!existing) {
    throw new ServiceError(404, "Customer not found");
  }

  const newEmail = input.email && input.email !== "" ? input.email.trim().toLowerCase() : existing.email;
  const newFirstName = input.firstName && input.firstName !== "" ? input.firstName.trim() : existing.information?.firstName;
  const newLastName = input.lastName && input.lastName !== "" ? input.lastName.trim() : existing.information?.lastName;
  const newPhone = input.phone && input.phone !== "" ? input.phone.trim() : existing.information?.phone;

  try {
    const updated = await customerRepository.update(customerId, {
      email: newEmail,
      information: { firstName: newFirstName, lastName: newLastName, phone: newPhone },
    });
    return withFullName(flattenCustomerAccount(updated));
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string };
    if (errorObj?.code === "P2002") {
      throw new ServiceError(400, "Email is already taken by another account");
    }
    throw new ServiceError(400, "Failed to update profile: " + (errorObj?.message || "Unknown error"));
  }
}

export async function listTransactions(customerId: number) {
  const transactions = await customerTransactionRepository.findByCustomerId(customerId);

  const orders = transactions.map((tx) => ({
    id: tx.errandId,
    orderId: tx.errandId,
    status: tx.errand.status,
    categories: tx.errand.pabiliDetails.map((d) => d.itemName).join(", ") || tx.errand.category,
    grandTotal: tx.amount,
    paymentMethod: tx.paymentMethod,
    deliveryAddress: tx.errand.deliveryAddress,
    createdAt: tx.errand.createdAt,
    latitude: tx.errand.deliveryLatitude,
    longitude: tx.errand.deliveryLongitude,
    riderId: tx.errand.riderId,
    riderName: tx.errand.rider ? `${tx.errand.rider.firstName} ${tx.errand.rider.lastName}`.trim() : null,
  }));

  return { orders };
}
