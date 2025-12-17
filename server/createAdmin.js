import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createAdmin() {
  const email = "admin@example.com";
  const password = "admin123";

  const hashed = await bcrypt.hash(password, 10);

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      console.log("⚠️ Admin already exists.");
      process.exit(0);
    }

    const user = await prisma.user.create({
      data: {
        name: "Super Admin",
        email,
        password: hashed,
        role: "superteacher",
        approved: true,
      },
    });

    console.log("✅ Superteacher created:");
    console.log(user);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
