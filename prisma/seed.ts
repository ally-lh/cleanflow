// CleanFlow — Database Seed
// Creates demo users, addresses, price rules, and sample orders.
// Run with: npx prisma db seed

import "dotenv/config";
import { PrismaClient, ClothingCategory, ServiceType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter, log: ["error"] });

async function main() {
  console.log("🌱 Seeding CleanFlow database...");

  // ──────────────────────────────────────────
  // PRICE RULES
  // ──────────────────────────────────────────

  const priceData: Array<{ category: ClothingCategory; serviceType: ServiceType; unitPrice: number }> = [
    // WASH_AND_FOLD
    { category: "SHIRT",       serviceType: "WASH_AND_FOLD", unitPrice: 2.50 },
    { category: "PANTS",       serviceType: "WASH_AND_FOLD", unitPrice: 3.00 },
    { category: "DRESS",       serviceType: "WASH_AND_FOLD", unitPrice: 4.00 },
    { category: "SUIT_JACKET", serviceType: "WASH_AND_FOLD", unitPrice: 6.00 },
    { category: "SUIT_PANTS",  serviceType: "WASH_AND_FOLD", unitPrice: 4.00 },
    { category: "COAT",        serviceType: "WASH_AND_FOLD", unitPrice: 8.00 },
    { category: "SWEATER",     serviceType: "WASH_AND_FOLD", unitPrice: 4.00 },
    { category: "BEDSHEET",    serviceType: "WASH_AND_FOLD", unitPrice: 8.00 },
    { category: "TOWEL",       serviceType: "WASH_AND_FOLD", unitPrice: 4.00 },
    { category: "OTHER",       serviceType: "WASH_AND_FOLD", unitPrice: 3.00 },
    // DRY_CLEANING
    { category: "SHIRT",       serviceType: "DRY_CLEANING",  unitPrice: 5.00 },
    { category: "PANTS",       serviceType: "DRY_CLEANING",  unitPrice: 7.00 },
    { category: "SUIT_JACKET", serviceType: "DRY_CLEANING",  unitPrice: 15.00 },
    { category: "COAT",        serviceType: "DRY_CLEANING",  unitPrice: 20.00 },
    { category: "DRESS",       serviceType: "DRY_CLEANING",  unitPrice: 10.00 },
  ];

  for (const rule of priceData) {
    await db.priceRule.upsert({
      where: { category_serviceType: { category: rule.category, serviceType: rule.serviceType } },
      update: { unitPrice: rule.unitPrice },
      create: { ...rule },
    });
  }
  console.log("✓ Price rules seeded");

  // ──────────────────────────────────────────
  // ADMIN USER
  // ──────────────────────────────────────────

  const adminHash = await bcrypt.hash("password123", 12);
  const admin = await db.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      name: "Admin Staff",
      email: "admin@demo.com",
      passwordHash: adminHash,
      role: "ADMIN",
      adminProfile: {
        create: { staffCode: "STAFF-001", department: "Operations" },
      },
    },
  });
  console.log(`✓ Admin user: ${admin.email}`);

  // ──────────────────────────────────────────
  // DRIVER USER
  // ──────────────────────────────────────────

  const driverHash = await bcrypt.hash("password123", 12);
  const driverUser = await db.user.upsert({
    where: { email: "driver@demo.com" },
    update: {},
    create: {
      name: "Ahmad (Driver)",
      email: "driver@demo.com",
      passwordHash: driverHash,
      role: "DRIVER",
      driverProfile: {
        create: {
          licenseNumber: "S1234567A",
          vehicleType: "Van",
          vehiclePlate: "SGX1234A",
          isActive: true,
        },
      },
    },
  });
  console.log(`✓ Driver user: ${driverUser.email}`);

  // ──────────────────────────────────────────
  // CUSTOMER USERS
  // ──────────────────────────────────────────

  const customerHash = await bcrypt.hash("password123", 12);

  const customer1 = await db.user.upsert({
    where: { email: "customer@demo.com" },
    update: {},
    create: {
      name: "Sarah Tan",
      email: "customer@demo.com",
      passwordHash: customerHash,
      role: "CUSTOMER",
      customerProfile: {
        create: { phone: "+65 9111 2222" },
      },
    },
    include: { customerProfile: true },
  });

  const customer2 = await db.user.upsert({
    where: { email: "customer2@demo.com" },
    update: {},
    create: {
      name: "James Lim",
      email: "customer2@demo.com",
      passwordHash: customerHash,
      role: "CUSTOMER",
      customerProfile: {
        create: { phone: "+65 9333 4444" },
      },
    },
    include: { customerProfile: true },
  });

  console.log(`✓ Customer users: ${customer1.email}, ${customer2.email}`);

  // ──────────────────────────────────────────
  // ADDRESSES
  // ──────────────────────────────────────────

  const profile1 = await db.customerProfile.findUnique({
    where: { userId: customer1.id },
  });
  const profile2 = await db.customerProfile.findUnique({
    where: { userId: customer2.id },
  });

  const addr1 = await db.address.create({
    data: {
      customerId: profile1!.id,
      label: "Home",
      streetLine1: "123 Clementi Avenue 3",
      city: "Singapore",
      postalCode: "120123",
      country: "Singapore",
      lat: 1.3147,
      lng: 103.7653,
      isDefault: true,
    },
  });

  const addr2 = await db.address.create({
    data: {
      customerId: profile2!.id,
      label: "Home",
      streetLine1: "45 Bishan Street 22",
      city: "Singapore",
      postalCode: "570045",
      country: "Singapore",
      lat: 1.3508,
      lng: 103.8485,
      isDefault: true,
    },
  });

  console.log("✓ Addresses seeded");

  // ──────────────────────────────────────────
  // SAMPLE ORDERS
  // ──────────────────────────────────────────

  // Order 1: In progress (washing)
  const order1 = await db.order.create({
    data: {
      orderNumber: "CF-2024-0001",
      customerId: profile1!.id,
      addressId: addr1.id,
      status: "WASHING",
      serviceType: "WASH_AND_FOLD",
      pickupMethod: "SCHEDULED_PICKUP",
      collectionMethod: "SELF_COLLECTION",
      confirmedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      pickedUpAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      receivedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
      items: {
        create: [
          { category: "SHIRT", quantity: 3, unitPrice: 2.50, totalPrice: 7.50, isAiDetected: true, confidence: 0.92 },
          { category: "PANTS", quantity: 2, unitPrice: 3.00, totalPrice: 6.00, isAiDetected: true, confidence: 0.88 },
          { category: "TOWEL", quantity: 2, unitPrice: 4.00, totalPrice: 8.00, isAiDetected: true, confidence: 0.75 },
        ],
      },
    },
  });

  await db.invoice.create({
    data: {
      orderId: order1.id,
      estimatedTotal: 21.50,
      deliveryFee: 0,
      finalTotal: 21.50,
      status: "PENDING_VERIFICATION",
    },
  });

  await db.orderStatusHistory.createMany({
    data: [
      { orderId: order1.id, status: "DRAFT", changedBy: "system" },
      { orderId: order1.id, status: "PHOTO_ANALYZED", changedBy: customer1.id },
      { orderId: order1.id, status: "PENDING_CONFIRMATION", changedBy: customer1.id },
      { orderId: order1.id, status: "PICKUP_SCHEDULED", changedBy: admin.id },
      { orderId: order1.id, status: "PICKED_UP", changedBy: admin.id },
      { orderId: order1.id, status: "RECEIVED_AT_STORE", changedBy: admin.id },
      { orderId: order1.id, status: "WASHING", changedBy: admin.id },
    ],
  });

  // Order 2: Pending pickup scheduling
  const order2 = await db.order.create({
    data: {
      orderNumber: "CF-2024-0002",
      customerId: profile2!.id,
      addressId: addr2.id,
      status: "PENDING_PICKUP_SCHEDULING",
      serviceType: "DRY_CLEANING",
      pickupMethod: "SCHEDULED_PICKUP",
      collectionMethod: "DELIVERY",
      confirmedAt: new Date(),
      items: {
        create: [
          { category: "SUIT_JACKET", quantity: 1, unitPrice: 15.00, totalPrice: 15.00, isAiDetected: true, confidence: 0.94 },
          { category: "SUIT_PANTS", quantity: 1, unitPrice: 10.00, totalPrice: 10.00, isAiDetected: true, confidence: 0.91 },
          { category: "SHIRT", quantity: 2, unitPrice: 5.00, totalPrice: 10.00, isAiDetected: true, confidence: 0.85 },
        ],
      },
    },
  });

  await db.invoice.create({
    data: {
      orderId: order2.id,
      estimatedTotal: 35.00,
      deliveryFee: 5.00,
      finalTotal: 40.00,
      status: "PENDING_VERIFICATION",
    },
  });

  await db.pickupRequest.create({
    data: {
      orderId: order2.id,
      addressId: addr2.id,
      requestedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      requestedSlot: "09:00-11:00",
      status: "PENDING",
    },
  });

  await db.orderStatusHistory.createMany({
    data: [
      { orderId: order2.id, status: "DRAFT", changedBy: "system" },
      { orderId: order2.id, status: "PHOTO_ANALYZED", changedBy: customer2.id },
      { orderId: order2.id, status: "PENDING_PICKUP_SCHEDULING", changedBy: customer2.id },
    ],
  });

  // Order 3: Completed
  const order3 = await db.order.create({
    data: {
      orderNumber: "CF-2024-0003",
      customerId: profile1!.id,
      addressId: addr1.id,
      status: "COMPLETED",
      serviceType: "WASH_AND_FOLD",
      pickupMethod: "CUSTOMER_DROPOFF",
      collectionMethod: "SELF_COLLECTION",
      confirmedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      pickedUpAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      receivedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          { category: "SHIRT", quantity: 5, unitPrice: 2.50, totalPrice: 12.50, isAiDetected: false },
          { category: "BEDSHEET", quantity: 2, unitPrice: 8.00, totalPrice: 16.00, isAiDetected: false },
        ],
      },
    },
  });

  await db.invoice.create({
    data: {
      orderId: order3.id,
      estimatedTotal: 28.50,
      confirmedTotal: 28.50,
      deliveryFee: 0,
      finalTotal: 28.50,
      status: "CONFIRMED",
      confirmedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`✓ Sample orders: ${order1.orderNumber}, ${order2.orderNumber}, ${order3.orderNumber}`);

  console.log("\n✅ Seed complete!");
  console.log("─────────────────────────");
  console.log("Demo accounts:");
  console.log("  Admin:    admin@demo.com    / password123");
  console.log("  Customer: customer@demo.com / password123");
  console.log("  Driver:   driver@demo.com   / password123");
  console.log("─────────────────────────");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
