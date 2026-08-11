import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/prisma";

async function main() {
  console.log("Seeding database...");

  const users = [
    { name: "Admin User", email: "admin@fundsroom.demo", password: "Admin@123", role: "ADMIN" as const },
    { name: "Sales User", email: "sales@fundsroom.demo", password: "Sales@123", role: "SALES" as const },
    { name: "Warehouse User", email: "warehouse@fundsroom.demo", password: "Warehouse@123", role: "WAREHOUSE" as const },
    { name: "Accounts User", email: "accounts@fundsroom.demo", password: "Accounts@123", role: "ACCOUNTS" as const },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, password: hash, role: u.role },
      create: { name: u.name, email: u.email, password: hash, role: u.role },
    });
  }

  const admin = await prisma.user.findUnique({ where: { email: "admin@fundsroom.demo" } });

  const customers = [
    {
      name: "ABC Electronics",
      mobile: "9876543210",
      email: "contact@abcelectronics.com",
      businessName: "ABC Electronics Pvt Ltd",
      gstNumber: "29ABCDE1234F1Z5",
      type: "WHOLESALE" as const,
      address: "MG Road, Bangalore",
      status: "ACTIVE" as const,
    },
    {
      name: "Bangalore Traders",
      mobile: "9876543211",
      email: "info@bangaloretraders.com",
      businessName: "Bangalore Traders",
      type: "DISTRIBUTOR" as const,
      address: "Whitefield, Bangalore",
      status: "ACTIVE" as const,
    },
    {
      name: "Metro Distributors",
      mobile: "9876543212",
      businessName: "Metro Distributors",
      type: "DISTRIBUTOR" as const,
      address: "Electronic City, Bangalore",
      status: "LEAD" as const,
    },
    {
      name: "Sri Lakshmi Retail",
      mobile: "9876543213",
      email: "sales@srilakshmi.com",
      businessName: "Sri Lakshmi Retail Store",
      type: "RETAIL" as const,
      address: "Jayanagar, Bangalore",
      status: "ACTIVE" as const,
    },
  ];

  for (const c of customers) {
    const existing = await prisma.customer.findFirst({ where: { mobile: c.mobile } });
    if (!existing) {
      await prisma.customer.create({ data: c });
    }
  }

  const products = [
    { name: "Dell Laptop", sku: "LAP-001", category: "Electronics", unitPrice: 55000, currentStock: 25, minStock: 5, warehouse: "Bangalore Warehouse" },
    { name: "HP Monitor", sku: "MON-001", category: "Electronics", unitPrice: 12500, currentStock: 40, minStock: 10, warehouse: "Bangalore Warehouse" },
    { name: "Logitech Mouse", sku: "MOU-001", category: "Accessories", unitPrice: 800, currentStock: 100, minStock: 20, warehouse: "Bangalore Warehouse" },
    { name: "Mechanical Keyboard", sku: "KEY-001", category: "Accessories", unitPrice: 3500, currentStock: 3, minStock: 5, warehouse: "Bangalore Warehouse" },
    { name: "Network Router", sku: "NET-001", category: "Networking", unitPrice: 4500, currentStock: 15, minStock: 5, warehouse: "Bangalore Warehouse" },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: p,
      create: p,
    });
  }

  const keyboard = await prisma.product.findUnique({ where: { sku: "KEY-001" } });
  if (keyboard && admin) {
    const hasMovement = await prisma.stockMovement.findFirst({ where: { productId: keyboard.id } });
    if (!hasMovement) {
      await prisma.stockMovement.create({
        data: {
          productId: keyboard.id,
          quantity: 3,
          type: "IN",
          reason: "Initial seed stock",
          createdById: admin.id,
        },
      });
    }
  }

  console.log("Seed completed successfully!");
  console.log("\nDemo credentials:");
  for (const u of users) {
    console.log(`  ${u.role}: ${u.email} / ${u.password}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
