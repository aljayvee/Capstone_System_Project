import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    message: "Node.js Express MariaDB Backend Server is running (3NF Compliant)",
    timestamp: new Date().toISOString(),
  });
});

// Authentication Endpoint
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      username.trim() === "" ||
      password.trim() === ""
    ) {
      return res
        .status(400)
        .json({ error: "Username and password must be non-empty strings" });
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const { passwordHash: _, ...sanitizedUser } = user;
    return res.status(200).json(sanitizedUser);
  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// 1. Users Endpoints (3NF Atomic Names)
app.get("/api/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    // Sanitize user list by omitting passwordHash
    const sanitizedUsers = users.map(({ passwordHash: _, ...u }) => u);
    res.json(sanitizedUsers);
  } catch (err: any) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const { username, password, role, name, email, phone, firstName, middleName, lastName } = req.body;

    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      username.trim() === "" ||
      password.trim() === ""
    ) {
      return res
        .status(400)
        .json({ error: "Username and password must be non-empty strings" });
    }

    const nameParts = (name || "").trim().split(" ");
    const fName = firstName || nameParts[0] || "User";
    const lName = lastName || nameParts.slice(1).join(" ") || "Account";

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username,
        passwordHash: hashedPassword,
        role: role ? role.toUpperCase() : "CUSTOMER",
        firstName: fName,
        middleName: middleName || "",
        lastName: lName,
        name: name || `${fName} ${lName}`,
        email,
        phone: phone || "",
      },
    });

    const { passwordHash: _, ...sanitizedUser } = newUser;
    res.status(201).json(sanitizedUser);
  } catch (err: any) {
    console.error("User creation error:", err);
    if (err?.code === "P2002") {
      return res
        .status(400)
        .json({ error: "User already exists with provided username or email" });
    }
    res.status(400).json({ error: "Failed to create user" });
  }
});

// 2. Merchant Categories Endpoints
app.get("/api/merchant-categories", async (req, res) => {
  try {
    const categories = await prisma.merchantCategory.findMany();
    res.json(categories);
  } catch (err: any) {
    console.error("Error fetching merchant categories:", err);
    res.status(500).json({ error: "Failed to fetch merchant categories" });
  }
});

app.post("/api/merchant-categories", async (req, res) => {
  try {
    const { name, description } = req.body;
    const category = await prisma.merchantCategory.create({
      data: { name, description },
    });
    res.status(201).json(category);
  } catch (err: any) {
    console.error("Error creating merchant category:", err);
    res.status(400).json({ error: "Failed to create merchant category" });
  }
});

// 3. Service Rate Configuration Endpoints
app.get("/api/rate-config", async (req, res) => {
  try {
    const config = await prisma.rateConfig.findFirst();
    res.json(config);
  } catch (err: any) {
    console.error("Error fetching rate config:", err);
    res.status(500).json({ error: "Failed to fetch rate config" });
  }
});

app.put("/api/rate-config", async (req, res) => {
  try {
    const { baseFee, perKmRate, serviceFeePercent, nightSurcharge } = req.body;
    const updated = await prisma.rateConfig.upsert({
      where: { id: 1 },
      update: { baseFee, perKmRate, serviceFeePercent, nightSurcharge },
      create: { id: 1, baseFee, perKmRate, serviceFeePercent, nightSurcharge },
    });
    res.json(updated);
  } catch (err: any) {
    console.error("Error updating rate config:", err);
    res.status(400).json({ error: "Failed to update rate config" });
  }
});

// Start Express HTTP Server
app.listen(PORT, () => {
  console.log(`🚀 MariaDB Backend Server running on http://localhost:${PORT}`);
});
