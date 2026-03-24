// CleanFlow — Database Seed
// Creates demo users, bulk historical customers, addresses, orders, and supporting data.
// Run with: npx prisma db seed  (expects a clean/reset database)

import "dotenv/config";
import { PrismaClient, ClothingCategory, ServiceType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter, log: ["error"] });

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
    { category: "SUIT_PANTS",  serviceType: "DRY_CLEANING",  unitPrice: 8.00 },
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
  const driver = await db.driver.findUnique({ where: { userId: driverUser.id } });
  console.log(`✓ Driver user: ${driverUser.email}`);

  // ──────────────────────────────────────────
  // ORIGINAL DEMO CUSTOMERS + ORDERS
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

  console.log(`✓ Demo customer users: ${customer1.email}, ${customer2.email}`);

  const profile1 = await db.customerProfile.findUnique({ where: { userId: customer1.id } });
  const profile2 = await db.customerProfile.findUnique({ where: { userId: customer2.id } });

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
          { category: "SUIT_PANTS",  quantity: 1, unitPrice: 10.00, totalPrice: 10.00, isAiDetected: true, confidence: 0.91 },
          { category: "SHIRT",       quantity: 2, unitPrice: 5.00,  totalPrice: 10.00, isAiDetected: true, confidence: 0.85 },
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
          { category: "SHIRT",    quantity: 5, unitPrice: 2.50, totalPrice: 12.50, isAiDetected: false },
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

  console.log(`✓ Demo orders: ${order1.orderNumber}, ${order2.orderNumber}, ${order3.orderNumber}`);

  // ──────────────────────────────────────────
  // BULK CUSTOMERS — near & far regions
  // ──────────────────────────────────────────
  //
  // "Near" region  — within ~3 km of 42 Cambridge Rd, Singapore 210042
  //   (Kallang / Geylang / Lavender / Boon Keng / Bendemeer / Potong Pasir)
  //   Reference point: lat 1.3138, lng 103.8628
  //
  // "Far" region   — distant towns to illustrate expansion potential
  //   (Jurong West, Tampines, Woodlands, Yishun, Bukit Batok, Punggol)

  type CustomerSeed = {
    name: string;
    email: string;
    phone: string;
    streetLine1: string;
    postalCode: string;
    lat: number;
    lng: number;
    region: "near" | "far";
  };

  const customerSeeds: CustomerSeed[] = [
    // ── Near: Cambridge Road ──────────────────────────────────────────────────
    { name: "Wei Ming Chen",        email: "weiming@demo.com",    phone: "+65 9100 0001", streetLine1: "Blk 2 Cambridge Road",          postalCode: "210002", lat: 1.3142, lng: 103.8631, region: "near" },
    { name: "Hui Ling Tan",         email: "huiling@demo.com",    phone: "+65 9100 0002", streetLine1: "Blk 10 Cambridge Road",         postalCode: "210010", lat: 1.3145, lng: 103.8619, region: "near" },
    { name: "Karthik Nair",         email: "karthik@demo.com",    phone: "+65 9100 0003", streetLine1: "Blk 20 Cambridge Road",         postalCode: "210020", lat: 1.3150, lng: 103.8625, region: "near" },
    { name: "Farah Binte Abdullah", email: "farah@demo.com",      phone: "+65 9100 0004", streetLine1: "Blk 30 Cambridge Road",         postalCode: "210030", lat: 1.3135, lng: 103.8640, region: "near" },
    { name: "Jun Wei Lim",          email: "junwei@demo.com",     phone: "+65 9100 0005", streetLine1: "Blk 40 Cambridge Road",         postalCode: "210040", lat: 1.3130, lng: 103.8618, region: "near" },
    { name: "Priya Krishnan",       email: "priya@demo.com",      phone: "+65 9100 0006", streetLine1: "Blk 50 Cambridge Road",         postalCode: "210050", lat: 1.3125, lng: 103.8650, region: "near" },
    // ── Near: Kallang Bahru ───────────────────────────────────────────────────
    { name: "Muhammad Faris",       email: "mfaris@demo.com",     phone: "+65 9100 0007", streetLine1: "Blk 5 Kallang Bahru",           postalCode: "330005", lat: 1.3160, lng: 103.8655, region: "near" },
    { name: "Li Xin Wong",          email: "lixin@demo.com",      phone: "+65 9100 0008", streetLine1: "Blk 15 Kallang Bahru",          postalCode: "330015", lat: 1.3168, lng: 103.8660, region: "near" },
    { name: "Siti Rahimah",         email: "siti@demo.com",       phone: "+65 9100 0009", streetLine1: "Blk 25 Kallang Bahru",          postalCode: "330025", lat: 1.3172, lng: 103.8645, region: "near" },
    { name: "Darren Chua",          email: "darren@demo.com",     phone: "+65 9100 0010", streetLine1: "Blk 35 Kallang Bahru",          postalCode: "330035", lat: 1.3165, lng: 103.8638, region: "near" },
    { name: "Mei Ling Goh",         email: "meiling@demo.com",    phone: "+65 9100 0011", streetLine1: "Blk 45 Kallang Bahru",          postalCode: "330045", lat: 1.3155, lng: 103.8670, region: "near" },
    // ── Near: Bendemeer Road ──────────────────────────────────────────────────
    { name: "Ravi Kumar",           email: "ravi@demo.com",       phone: "+65 9100 0012", streetLine1: "Blk 3 Bendemeer Road",          postalCode: "330003", lat: 1.3180, lng: 103.8615, region: "near" },
    { name: "Nurul Ain",            email: "nurul@demo.com",       phone: "+65 9100 0013", streetLine1: "Blk 13 Bendemeer Road",         postalCode: "330013", lat: 1.3185, lng: 103.8622, region: "near" },
    { name: "Boon Kiat Ng",         email: "boonkiat@demo.com",   phone: "+65 9100 0014", streetLine1: "Blk 23 Bendemeer Road",         postalCode: "330023", lat: 1.3190, lng: 103.8630, region: "near" },
    { name: "Lakshmi Devi",         email: "lakshmi@demo.com",    phone: "+65 9100 0015", streetLine1: "Blk 33 Bendemeer Road",         postalCode: "330033", lat: 1.3195, lng: 103.8640, region: "near" },
    { name: "Ahmad Rizal",          email: "ahrizal@demo.com",    phone: "+65 9100 0016", streetLine1: "Blk 43 Bendemeer Road",         postalCode: "330043", lat: 1.3200, lng: 103.8650, region: "near" },
    // ── Near: Boon Keng Road ──────────────────────────────────────────────────
    { name: "Xiao Ling Fu",         email: "xiaoling@demo.com",   phone: "+65 9100 0017", streetLine1: "Blk 8 Boon Keng Road",          postalCode: "330008", lat: 1.3210, lng: 103.8635, region: "near" },
    { name: "Benjamin Teo",         email: "bjteo@demo.com",      phone: "+65 9100 0018", streetLine1: "Blk 18 Boon Keng Road",         postalCode: "330018", lat: 1.3215, lng: 103.8628, region: "near" },
    { name: "Rashidah Hassan",      email: "rashidah@demo.com",   phone: "+65 9100 0019", streetLine1: "Blk 28 Boon Keng Road",         postalCode: "330028", lat: 1.3220, lng: 103.8620, region: "near" },
    // ── Near: Crawford Lane ───────────────────────────────────────────────────
    { name: "Ping An Yeo",          email: "pingan@demo.com",     phone: "+65 9100 0020", streetLine1: "Blk 6 Crawford Lane",           postalCode: "190006", lat: 1.3115, lng: 103.8605, region: "near" },
    { name: "Deepa Subramaniam",    email: "deepa@demo.com",      phone: "+65 9100 0021", streetLine1: "Blk 16 Crawford Lane",          postalCode: "190016", lat: 1.3108, lng: 103.8610, region: "near" },
    { name: "Khairul Anwar",        email: "khairul@demo.com",    phone: "+65 9100 0022", streetLine1: "Blk 26 Crawford Lane",          postalCode: "190026", lat: 1.3100, lng: 103.8618, region: "near" },
    // ── Near: Lavender Street ─────────────────────────────────────────────────
    { name: "Grace Leong",          email: "grace@demo.com",      phone: "+65 9100 0023", streetLine1: "Blk 4 Lavender Street",         postalCode: "207004", lat: 1.3095, lng: 103.8625, region: "near" },
    { name: "Sunita Pillai",        email: "sunita@demo.com",     phone: "+65 9100 0024", streetLine1: "Blk 14 Lavender Street",        postalCode: "207014", lat: 1.3090, lng: 103.8630, region: "near" },
    // ── Near: Kitchener Road ──────────────────────────────────────────────────
    { name: "Wee Kiat Chan",        email: "weekiat@demo.com",    phone: "+65 9100 0025", streetLine1: "Blk 1 Kitchener Road",          postalCode: "208001", lat: 1.3082, lng: 103.8638, region: "near" },
    { name: "Fiona Ong",            email: "fiona@demo.com",      phone: "+65 9100 0026", streetLine1: "Blk 11 Kitchener Road",         postalCode: "208011", lat: 1.3075, lng: 103.8645, region: "near" },
    { name: "Mohamad Hakim",        email: "hakim@demo.com",      phone: "+65 9100 0027", streetLine1: "Blk 21 Kitchener Road",         postalCode: "208021", lat: 1.3068, lng: 103.8652, region: "near" },
    // ── Near: Geylang Road ────────────────────────────────────────────────────
    { name: "Ying Ying Sia",        email: "yingying@demo.com",   phone: "+65 9100 0028", streetLine1: "Blk 12 Geylang Road",           postalCode: "389012", lat: 1.3178, lng: 103.8688, region: "near" },
    { name: "Sanjeev Menon",        email: "sanjeev@demo.com",    phone: "+65 9100 0029", streetLine1: "Blk 22 Geylang Road",           postalCode: "389022", lat: 1.3185, lng: 103.8700, region: "near" },
    { name: "Nur Hidayah",          email: "nurhidayah@demo.com", phone: "+65 9100 0030", streetLine1: "Blk 32 Geylang Road",           postalCode: "389032", lat: 1.3192, lng: 103.8712, region: "near" },
    { name: "Teck Huat Lau",        email: "teckhuat@demo.com",   phone: "+65 9100 0031", streetLine1: "Blk 42 Geylang Road",           postalCode: "389042", lat: 1.3200, lng: 103.8720, region: "near" },
    { name: "Winnie Ho",            email: "winnie@demo.com",     phone: "+65 9100 0032", streetLine1: "Blk 52 Geylang Road",           postalCode: "389052", lat: 1.3208, lng: 103.8730, region: "near" },
    // ── Near: Lorong Geylang ─────────────────────────────────────────────────
    { name: "Ismail Yusoff",        email: "ismail@demo.com",     phone: "+65 9100 0033", streetLine1: "Blk 7 Lorong 8 Geylang",        postalCode: "388007", lat: 1.3188, lng: 103.8748, region: "near" },
    { name: "Shu Fen Yang",         email: "shufen@demo.com",     phone: "+65 9100 0034", streetLine1: "Blk 17 Lorong 16 Geylang",      postalCode: "388017", lat: 1.3195, lng: 103.8758, region: "near" },
    // ── Near: MacPherson Road ─────────────────────────────────────────────────
    { name: "Prakash Rao",          email: "prakash@demo.com",    phone: "+65 9100 0035", streetLine1: "Blk 3 MacPherson Road",         postalCode: "368003", lat: 1.3255, lng: 103.8718, region: "near" },
    { name: "Noraini Binte Salleh", email: "noraini@demo.com",    phone: "+65 9100 0036", streetLine1: "Blk 13 MacPherson Road",        postalCode: "368013", lat: 1.3260, lng: 103.8725, region: "near" },
    { name: "Aisha Bibi",           email: "aisha@demo.com",      phone: "+65 9100 0037", streetLine1: "Blk 23 MacPherson Road",        postalCode: "368023", lat: 1.3265, lng: 103.8732, region: "near" },
    // ── Near: Serangoon Road ─────────────────────────────────────────────────
    { name: "Zi Wei Chong",         email: "ziwei@demo.com",      phone: "+65 9100 0038", streetLine1: "Blk 9 Serangoon Road",          postalCode: "218009", lat: 1.3060, lng: 103.8668, region: "near" },
    { name: "Jasmine Koo",          email: "jasmine@demo.com",    phone: "+65 9100 0039", streetLine1: "Blk 19 Serangoon Road",         postalCode: "218019", lat: 1.3052, lng: 103.8675, region: "near" },
    { name: "Sameer Ali",           email: "sameer@demo.com",     phone: "+65 9100 0040", streetLine1: "Blk 29 Serangoon Road",         postalCode: "218029", lat: 1.3045, lng: 103.8680, region: "near" },
    // ── Near: Potong Pasir ───────────────────────────────────────────────────
    { name: "Mei Fong Phua",        email: "meifong@demo.com",    phone: "+65 9100 0041", streetLine1: "Blk 6 Potong Pasir Avenue 1",   postalCode: "358006", lat: 1.3318, lng: 103.8688, region: "near" },
    { name: "Jason Toh",            email: "jasontoh@demo.com",   phone: "+65 9100 0042", streetLine1: "Blk 16 Potong Pasir Avenue 1",  postalCode: "358016", lat: 1.3325, lng: 103.8695, region: "near" },

    // ── Far: Jurong West ─────────────────────────────────────────────────────
    { name: "David Tan",            email: "davidtan@demo.com",   phone: "+65 9200 0001", streetLine1: "Blk 123 Jurong West Street 91", postalCode: "640123", lat: 1.3470, lng: 103.7060, region: "far" },
    { name: "Serene Loh",           email: "serene@demo.com",     phone: "+65 9200 0002", streetLine1: "Blk 456 Jurong West Street 52", postalCode: "640456", lat: 1.3462, lng: 103.7082, region: "far" },
    // ── Far: Tampines ────────────────────────────────────────────────────────
    { name: "Shirin Mohd",          email: "shirin@demo.com",     phone: "+65 9200 0003", streetLine1: "Blk 456 Tampines Street 41",    postalCode: "520456", lat: 1.3535, lng: 103.9420, region: "far" },
    { name: "Terrence Yap",         email: "terrence@demo.com",   phone: "+65 9200 0004", streetLine1: "Blk 201 Tampines Street 21",    postalCode: "520201", lat: 1.3520, lng: 103.9440, region: "far" },
    // ── Far: Woodlands ───────────────────────────────────────────────────────
    { name: "Kevin Chia",           email: "kevin@demo.com",      phone: "+65 9200 0005", streetLine1: "Blk 789 Woodlands Avenue 6",    postalCode: "730789", lat: 1.4370, lng: 103.7860, region: "far" },
    // ── Far: Yishun ──────────────────────────────────────────────────────────
    { name: "Anitha Raj",           email: "anitha@demo.com",     phone: "+65 9200 0006", streetLine1: "Blk 321 Yishun Avenue 4",       postalCode: "760321", lat: 1.4295, lng: 103.8360, region: "far" },
    // ── Far: Bukit Batok ─────────────────────────────────────────────────────
    { name: "Hafiz Osman",          email: "hafiz@demo.com",      phone: "+65 9200 0007", streetLine1: "Blk 654 Bukit Batok Street 21", postalCode: "650654", lat: 1.3495, lng: 103.7490, region: "far" },
    // ── Far: Punggol ─────────────────────────────────────────────────────────
    { name: "Lily Chew",            email: "lily@demo.com",       phone: "+65 9200 0008", streetLine1: "Blk 987 Punggol Central",       postalCode: "820987", lat: 1.4040, lng: 103.9020, region: "far" },
  ];

  // Number of orders per customer — 1 to 10, varied deterministically
  // 50 values to cover all 50 customers; sum ≈ 270 completed orders
  const orderCountsPerCustomer = [
    3, 7, 2, 5, 8, 1, 4, 6, 3, 9,
    2, 5, 7, 1, 4, 8, 3, 6, 2, 5,
    9, 1, 4, 7, 3, 8, 2, 5, 6, 1,
    4, 9, 3, 7, 2, 5, 8, 1, 4, 6,
    3, 5, 2, 4, 7, 3, 6, 4, 5, 2,
  ];

  // Unit prices for order total calculation
  const unitPrices: Record<string, Record<string, number>> = {
    WASH_AND_FOLD: {
      SHIRT: 2.50, PANTS: 3.00, DRESS: 4.00, SUIT_JACKET: 6.00,
      SUIT_PANTS: 4.00, COAT: 8.00, SWEATER: 4.00, BEDSHEET: 8.00,
      TOWEL: 4.00, OTHER: 3.00,
    },
    DRY_CLEANING: {
      SHIRT: 5.00, PANTS: 7.00, SUIT_JACKET: 15.00, SUIT_PANTS: 8.00,
      COAT: 20.00, DRESS: 10.00,
    },
  };

  // Predefined item sets per service type — cycled via order index
  const itemSetsByService: Record<string, Array<Array<{ category: string; qty: number }>>> = {
    WASH_AND_FOLD: [
      [{ category: "SHIRT", qty: 3 }, { category: "PANTS", qty: 2 }],
      [{ category: "SHIRT", qty: 5 }, { category: "BEDSHEET", qty: 2 }],
      [{ category: "DRESS", qty: 2 }, { category: "TOWEL", qty: 3 }],
      [{ category: "SHIRT", qty: 4 }, { category: "PANTS", qty: 3 }, { category: "SWEATER", qty: 1 }],
      [{ category: "TOWEL", qty: 4 }, { category: "BEDSHEET", qty: 1 }, { category: "OTHER", qty: 2 }],
      [{ category: "SHIRT", qty: 2 }, { category: "DRESS", qty: 1 }, { category: "PANTS", qty: 2 }],
      [{ category: "COAT", qty: 1 }, { category: "SWEATER", qty: 2 }, { category: "SHIRT", qty: 3 }],
      [{ category: "SHIRT", qty: 6 }, { category: "PANTS", qty: 4 }],
      [{ category: "BEDSHEET", qty: 3 }, { category: "TOWEL", qty: 2 }],
      [{ category: "DRESS", qty: 3 }, { category: "SKIRT", qty: 2 }],
    ],
    DRY_CLEANING: [
      [{ category: "SUIT_JACKET", qty: 1 }, { category: "SUIT_PANTS", qty: 1 }],
      [{ category: "DRESS", qty: 1 }, { category: "COAT", qty: 1 }],
      [{ category: "SHIRT", qty: 2 }, { category: "PANTS", qty: 2 }],
      [{ category: "SUIT_JACKET", qty: 1 }, { category: "SHIRT", qty: 2 }],
      [{ category: "COAT", qty: 1 }, { category: "DRESS", qty: 2 }],
      [{ category: "SUIT_JACKET", qty: 2 }, { category: "SUIT_PANTS", qty: 2 }],
    ],
  };

  const pickupSlots = ["09:00-11:00", "11:00-13:00", "14:00-16:00", "16:00-18:00"];

  // Store reference point (the laundry shop)
  const STORE_LAT = 1.3138;
  const STORE_LNG = 103.8628;
  const STORE_ADDRESS = "42 Cambridge Rd, Singapore 210042";

  let bulkOrderNum = 1;
  let totalOrdersCreated = 0;

  for (let i = 0; i < customerSeeds.length; i++) {
    const cs = customerSeeds[i];

    const user = await db.user.upsert({
      where: { email: cs.email },
      update: {},
      create: {
        name: cs.name,
        email: cs.email,
        passwordHash: customerHash,
        role: "CUSTOMER",
        customerProfile: { create: { phone: cs.phone } },
      },
    });

    const profile = await db.customerProfile.findUnique({ where: { userId: user.id } });
    if (!profile) continue;

    const addr = await db.address.create({
      data: {
        customerId: profile.id,
        label: "Home",
        streetLine1: cs.streetLine1,
        city: "Singapore",
        postalCode: cs.postalCode,
        country: "Singapore",
        lat: cs.lat,
        lng: cs.lng,
        isDefault: true,
      },
    });

    // Straight-line distance from store (rough km approximation)
    const distKm = Math.sqrt(
      Math.pow((cs.lat - STORE_LAT) * 111, 2) +
      Math.pow((cs.lng - STORE_LNG) * 111 * Math.cos((cs.lat * Math.PI) / 180), 2)
    );

    const numOrders = orderCountsPerCustomer[i] ?? randInt(1, 10);

    for (let j = 0; j < numOrders; j++) {
      const orderNum = `CF-2025-${String(bulkOrderNum).padStart(4, "0")}`;
      bulkOrderNum++;

      const serviceType = j % 3 === 0 ? "DRY_CLEANING" : "WASH_AND_FOLD";
      const itemSets = itemSetsByService[serviceType];
      const itemSet = itemSets[j % itemSets.length];
      const prices = unitPrices[serviceType];

      let orderTotal = 0;
      const itemsData = itemSet.map((item) => {
        const unitPrice = prices[item.category] ?? 3.00;
        const totalPrice = unitPrice * item.qty;
        orderTotal += totalPrice;
        return {
          category: item.category as ClothingCategory,
          quantity: item.qty,
          unitPrice,
          totalPrice,
          isAiDetected: j % 2 === 0,
          confidence: j % 2 === 0 ? Math.round((0.82 + (j % 10) * 0.015) * 100) / 100 : undefined,
        };
      });

      const pickupMethod  = j % 4 === 0 ? "CUSTOMER_DROPOFF" : "SCHEDULED_PICKUP";
      const collectionMethod = j % 3 === 0 ? "DELIVERY" : "SELF_COLLECTION";
      const deliveryFee   = collectionMethod === "DELIVERY" ? 5.00 : 0;
      const finalTotal    = orderTotal + deliveryFee;

      // Spread orders across the past ~12 months
      const daysBack   = randInt(10, 360);
      const confirmedAt = daysAgo(daysBack);
      const pickedUpAt  = new Date(confirmedAt.getTime() + 1   * 24 * 60 * 60 * 1000);
      const receivedAt  = new Date(pickedUpAt.getTime()  + 2   * 60 * 60 * 1000);
      const completedAt = new Date(receivedAt.getTime()  + 2   * 24 * 60 * 60 * 1000);

      const order = await db.order.create({
        data: {
          orderNumber: orderNum,
          customerId: profile.id,
          addressId: addr.id,
          status: "COMPLETED",
          serviceType: serviceType as ServiceType,
          pickupMethod:      pickupMethod      as any,
          collectionMethod:  collectionMethod  as any,
          confirmedAt,
          pickedUpAt,
          receivedAt,
          completedAt,
          items: { create: itemsData },
        },
      });

      // Invoice
      await db.invoice.create({
        data: {
          orderId: order.id,
          estimatedTotal: orderTotal,
          confirmedTotal: orderTotal,
          deliveryFee,
          finalTotal,
          status: "PAID",
          confirmedAt: completedAt,
          paidAt: new Date(completedAt.getTime() + 24 * 60 * 60 * 1000),
        },
      });

      // Status history
      await db.orderStatusHistory.createMany({
        data: [
          { orderId: order.id, status: "DRAFT",                    changedBy: "system",   createdAt: new Date(confirmedAt.getTime() - 2  * 60 * 60 * 1000) },
          { orderId: order.id, status: "PHOTO_ANALYZED",           changedBy: user.id,    createdAt: new Date(confirmedAt.getTime() - 1  * 60 * 60 * 1000) },
          { orderId: order.id, status: "PENDING_CONFIRMATION",     changedBy: user.id,    createdAt: confirmedAt },
          { orderId: order.id, status: "PICKUP_SCHEDULED",         changedBy: admin.id,   createdAt: new Date(confirmedAt.getTime() + 12 * 60 * 60 * 1000) },
          { orderId: order.id, status: "PICKED_UP",                changedBy: admin.id,   createdAt: pickedUpAt },
          { orderId: order.id, status: "RECEIVED_AT_STORE",        changedBy: admin.id,   createdAt: receivedAt },
          { orderId: order.id, status: "WASHING",                  changedBy: admin.id,   createdAt: new Date(receivedAt.getTime() + 2   * 60 * 60 * 1000) },
          { orderId: order.id, status: "COMPLETED",                changedBy: admin.id,   createdAt: completedAt },
        ],
      });

      // Pickup request (scheduled pickups only)
      if (pickupMethod === "SCHEDULED_PICKUP" && driver) {
        const pickup = await db.pickupRequest.create({
          data: {
            orderId: order.id,
            addressId: addr.id,
            driverId: driver.id,
            requestedDate: pickedUpAt,
            requestedSlot: pickupSlots[j % pickupSlots.length],
            status: "COMPLETED",
            estimatedDistance: Math.round(distKm * 10) / 10,
            estimatedDuration: Math.round(distKm * 4 + 5),
            scheduledAt: new Date(confirmedAt.getTime() + 12 * 60 * 60 * 1000),
          },
        });

        await db.routeEstimate.create({
          data: {
            pickupRequestId: pickup.id,
            originLat: STORE_LAT,
            originLng: STORE_LNG,
            originAddress: STORE_ADDRESS,
            destLat: cs.lat,
            destLng: cs.lng,
            destAddress: cs.streetLine1,
            distanceKm: Math.round(distKm * 10) / 10,
            durationMinutes: Math.round(distKm * 4 + 5),
          },
        });
      }

      // Delivery request (delivery orders only)
      if (collectionMethod === "DELIVERY" && driver) {
        const delivery = await db.deliveryRequest.create({
          data: {
            orderId: order.id,
            addressId: addr.id,
            driverId: driver.id,
            requestedDate: completedAt,
            requestedSlot: "14:00-16:00",
            status: "COMPLETED",
            deliveryFee,
            estimatedDistance: Math.round(distKm * 10) / 10,
            estimatedDuration: Math.round(distKm * 4 + 5),
            scheduledAt: new Date(completedAt.getTime() - 2 * 60 * 60 * 1000),
            deliveredAt: new Date(completedAt.getTime() + 2 * 60 * 60 * 1000),
          },
        });

        await db.routeEstimate.create({
          data: {
            deliveryRequestId: delivery.id,
            originLat: STORE_LAT,
            originLng: STORE_LNG,
            originAddress: STORE_ADDRESS,
            destLat: cs.lat,
            destLng: cs.lng,
            destAddress: cs.streetLine1,
            distanceKm: Math.round(distKm * 10) / 10,
            durationMinutes: Math.round(distKm * 4 + 5),
          },
        });
      }

      // AI Analysis + uploaded image (every other order)
      if (j % 2 === 0) {
        await db.aIAnalysis.create({
          data: {
            orderId: order.id,
            rawResult: {
              items: itemsData.map((it) => ({
                category: it.category,
                quantity: it.quantity,
                confidence: it.confidence ?? 0.85,
              })),
            },
            totalEstimatedPieces: itemsData.reduce((sum, it) => sum + it.quantity, 0),
            detectedItemsSummary: itemsData
              .map((it) => `${it.quantity}x ${it.category}`)
              .join(", "),
            previewWarnings: [],
            modelUsed: "claude-3-haiku",
            customerConfirmed: true,
            customerConfirmedAt: confirmedAt,
          },
        });

        await db.uploadedImage.create({
          data: {
            orderId: order.id,
            url: `https://storage.cleanflow.demo/orders/${orderNum}/photo.jpg`,
            fileName: `${orderNum}_photo.jpg`,
            fileSize: randInt(102400, 2097152),
            mimeType: "image/jpeg",
          },
        });
      }

      // Notification logs (3 per order)
      await db.notificationLog.createMany({
        data: [
          {
            orderId:   order.id,
            userId:    user.id,
            type:      "ORDER_CREATED",
            message:   `Your order ${orderNum} has been created and confirmed.`,
            sentAt:    confirmedAt,
            delivered: true,
          },
          {
            orderId:   order.id,
            userId:    user.id,
            type:      "ORDER_STATUS_CHANGED",
            message:   `Your order ${orderNum} has been picked up and is at our store.`,
            sentAt:    pickedUpAt,
            delivered: true,
          },
          {
            orderId:   order.id,
            userId:    user.id,
            type:      "INVOICE_READY",
            message:   `Your order ${orderNum} is complete. Invoice: SGD ${finalTotal.toFixed(2)}.`,
            sentAt:    completedAt,
            delivered: true,
          },
        ],
      });

      totalOrdersCreated++;
    }
  }

  const nearCount = customerSeeds.filter((c) => c.region === "near").length;
  const farCount  = customerSeeds.filter((c) => c.region === "far").length;
  console.log(`✓ ${nearCount} near-region customers + ${farCount} far-region customers seeded`);
  console.log(`✓ ${totalOrdersCreated} completed past orders created (CF-2025-xxxx)`);

  // ──────────────────────────────────────────
  // SCHEDULE SLOTS  — 30 days × 4 slots = 120 rows
  // ──────────────────────────────────────────

  const slotDefinitions = [
    { start: "09:00", end: "11:00", label: "Morning" },
    { start: "11:00", end: "13:00", label: "Late Morning" },
    { start: "14:00", end: "16:00", label: "Afternoon" },
    { start: "16:00", end: "18:00", label: "Evening" },
  ];

  for (let d = 0; d < 30; d++) {
    const date = new Date();
    date.setDate(date.getDate() + d);
    date.setHours(0, 0, 0, 0);

    for (const slot of slotDefinitions) {
      await db.scheduleSlot.create({
        data: {
          date,
          startTime:   slot.start,
          endTime:     slot.end,
          label:       slot.label,
          maxCapacity: 3,
          bookedCount: randInt(0, 3),
          status:      "AVAILABLE",
        },
      });
    }
  }
  console.log("✓ 120 schedule slots seeded (30 days × 4 slots)");

  // ──────────────────────────────────────────
  // WORKER AVAILABILITY — 30 days × 4 slots = 120 rows
  // ──────────────────────────────────────────

  if (driver) {
    for (let d = 0; d < 30; d++) {
      const date = new Date();
      date.setDate(date.getDate() + d);
      date.setHours(0, 0, 0, 0);

      for (const slot of slotDefinitions) {
        await db.workerAvailability.create({
          data: {
            driverId:  driver.id,
            date,
            startTime: slot.start,
            endTime:   slot.end,
            isBooked:  false,
          },
        });
      }
    }
    console.log("✓ 120 worker availability rows seeded");
  }

  // ──────────────────────────────────────────
  // DONE
  // ──────────────────────────────────────────

  console.log("\n✅ Seed complete!");
  console.log("────────────────────────────────────────────");
  console.log("Demo accounts (all passwords: password123):");
  console.log("  Admin:    admin@demo.com");
  console.log("  Customer: customer@demo.com");
  console.log("  Driver:   driver@demo.com");
  console.log("────────────────────────────────────────────");
  console.log(`Near-region bulk customers: ${nearCount} (Cambridge Rd / Kallang area)`);
  console.log(`Far-region bulk customers:  ${farCount} (Jurong West, Tampines, Woodlands, etc.)`);
  console.log(`Past completed orders:      ${totalOrdersCreated} (CF-2025-xxxx)`);
  console.log("────────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
