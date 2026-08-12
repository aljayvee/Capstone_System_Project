import bcrypt from "bcryptjs";
import type { CustomerCreateData } from "../../repositories/customerRepository.js";

export interface CustomerFactoryInput {
  username: string;
  password: string;
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
}

// Mirrors userFactory.ts's hash-password + build-object logic, but targets the
// two-table CustomerAccount + CustomerInformation shape instead of the flat User row.
export async function buildCustomerAccountCreateData(input: CustomerFactoryInput): Promise<CustomerCreateData> {
  const passwordHash = await bcrypt.hash(input.password.trim(), 10);
  return {
    username: input.username.trim(),
    passwordHash,
    email: input.email.trim().toLowerCase(),
    information: {
      firstName: input.firstName.trim(),
      middleName: input.middleName ? input.middleName.trim() : "",
      lastName: input.lastName.trim(),
      phone: input.phone ? input.phone.trim() : "",
    },
  };
}

type CustomerWithInformation = {
  id: number;
  username: string;
  email: string;
  status: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  information: {
    firstName: string;
    middleName: string | null;
    lastName: string;
    phone: string;
    avatar: string | null;
  } | null;
};

// Collapses the nested CustomerAccount+CustomerInformation Prisma result into the flat
// shape (firstName/lastName/phone at the top level) that callers already expect —
// mirrors the flat `User` row shape so authService/customerService don't need two
// different response contracts for staff vs. customer accounts.
export function flattenCustomerAccount<T extends CustomerWithInformation>(customer: T) {
  const { information, passwordHash: _passwordHash, ...rest } = customer;
  return {
    ...rest,
    firstName: information?.firstName ?? "",
    middleName: information?.middleName ?? "",
    lastName: information?.lastName ?? "",
    phone: information?.phone ?? "",
    avatar: information?.avatar ?? null,
  };
}
