import { PrismaClient, RoleType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding 3NF-compliant MariaDB database schema...");

  // 1. Roles
  const roles = ["OWNER", "DISPATCHER", "RIDER", "CUSTOMER"];
  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r },
      update: {},
      create: { name: r, description: `System role for ${r}` },
    });
  }

  // 2. Payment Modes
  const paymentModes = [
    { name: "Cash on Delivery (COD)", description: "Pay cash upon errand fulfillment" },
    { name: "GCash Mobile Wallet", description: "Direct e-wallet payment transfer" },
    { name: "Bank Transfer", description: "Online banking transfer" },
  ];
  for (const pm of paymentModes) {
    await prisma.paymentMode.upsert({
      where: { name: pm.name },
      update: {},
      create: pm,
    });
  }

  // 3. Merchant Categories
  const merchantCategories = [
    { name: "Groceries & Supermarkets", description: "Food markets, fresh produce, daily essentials", merchantCount: 14 },
    { name: "Pharmacies & Drugstores", description: "Medicines, healthcare, wellness supplies", merchantCount: 8 },
    { name: "Restaurants & Fast Food", description: "Dine-in, takeout, fast food chains", merchantCount: 26 },
    { name: "Hardware & Construction", description: "Tools, building supplies, electricals", merchantCount: 5 },
  ];
  for (const mc of merchantCategories) {
    await prisma.merchantCategory.upsert({
      where: { name: mc.name },
      update: {},
      create: mc,
    });
  }

  // 4. Barangays in Tacurong City
  const barangays = ["Poblacion", "New Isabela", "San Emmanuel", "EJC Montilla", "Grypa", "Lancheta"];
  for (const b of barangays) {
    await prisma.barangay.upsert({
      where: { name: b },
      update: {},
      create: { name: b, city: "Tacurong City", province: "Sultan Kudarat" },
    });
  }

  // 5. 3NF User Accounts (Atomic Name Attributes)
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
      name: "Aljayvee Versola",
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
      name: "Mark Dennis Batcharo",
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
      name: "Al-Dhen Musali",
      email: "ad.musali@company.ph",
      phone: "09391234567",
      avatar: "AM",
      status: "Active",
    },
  });

  // 6. Rate Config
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

  console.log("✅ 3NF MariaDB Seeding Completed Successfully!");
  console.log(`- Owner: ${owner.firstName} ${owner.lastName} (${owner.username})`);
  console.log(`- Dispatcher: ${dispatcher.firstName} ${dispatcher.lastName} (${dispatcher.username})`);
  console.log(`- Rider: ${rider.firstName} ${rider.lastName} (${rider.username})`);
  console.log(`- Base Delivery Fee: ₱${rateConfig.baseFee}, Per KM: ₱${rateConfig.perKmRate}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
