import { PrismaClient, RoleType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database with core accounts...");

  // 1. Roles
  const roles = ["OWNER", "DISPATCHER", "RIDER", "CUSTOMER"];
  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r },
      update: {},
      create: { name: r, description: `System role for ${r}` },
    });
  }

  // 2. User Accounts (Owner, Dispatcher, Rider)
  const hashedOwnerPass = await bcrypt.hash("owner123", 10);
  const hashedDispatchPass = await bcrypt.hash("dispatch123", 10);
  const hashedRiderPass = await bcrypt.hash("password123", 10);

  const owner = await prisma.user.upsert({
    where: { username: "owner" },
    update: { passwordHash: hashedOwnerPass },
    create: {
      username: "owner",
      passwordHash: hashedOwnerPass,
      role: RoleType.OWNER,
      firstName: "Aljayvee",
      middleName: "P.",
      lastName: "Versola",
      email: "aj.versola@company.ph",
      phone: "09171234567",
      avatar: "AV",
      status: "Active",
    },
  });

  const dispatcher = await prisma.user.upsert({
    where: { username: "dispatcher" },
    update: { passwordHash: hashedDispatchPass },
    create: {
      username: "dispatcher",
      passwordHash: hashedDispatchPass,
      role: RoleType.DISPATCHER,
      firstName: "Mark Dennis",
      middleName: "G.",
      lastName: "Batcharo",
      email: "md.batcharo@company.ph",
      phone: "09281234567",
      avatar: "MB",
      status: "Active",
    },
  });

  const rider = await prisma.user.upsert({
    where: { username: "rider01" },
    update: { passwordHash: hashedRiderPass },
    create: {
      username: "rider01",
      passwordHash: hashedRiderPass,
      role: RoleType.RIDER,
      firstName: "Al-Dhen",
      middleName: "M.",
      lastName: "Musali",
      email: "ad.musali@company.ph",
      phone: "09391234567",
      avatar: "AM",
      status: "Active",
    },
  });

  // 3. Rate Config
  const rateConfig = await prisma.rateConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      baseFee: 50,
      perKmRate: 10,
      serviceFeePercent: 5,
      nightSurcharge: 20,
    },
  });

  console.log("✅ Database Seeding Completed Successfully!");
  console.log(`- Owner: ${owner.firstName} ${owner.lastName} (${owner.username})`);
  console.log(`- Dispatcher: ${dispatcher.firstName} ${dispatcher.lastName} (${dispatcher.username})`);
  console.log(`- Rider: ${rider.firstName} ${rider.lastName} (${rider.username})`);
}

main()
  .catch((e) => {
    console.error("❌ Seed Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
