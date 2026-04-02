import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter, log: ["error"] });

type DriverSeed = {
  name: string;
  email: string;
  licenseNumber: string;
  vehicleType: string;
  vehiclePlate: string;
};

const DRIVERS: DriverSeed[] = [
  {
    name: "Ahmad (Driver)",
    email: "driver@demo.com",
    licenseNumber: "S1234567A",
    vehicleType: "Van",
    vehiclePlate: "SGX1234A",
  },
  {
    name: "Ben (Driver)",
    email: "driver2@demo.com",
    licenseNumber: "S2345678B",
    vehicleType: "Van",
    vehiclePlate: "SGX2345B",
  },
  {
    name: "Chen (Driver)",
    email: "driver3@demo.com",
    licenseNumber: "S3456789C",
    vehicleType: "Motorbike",
    vehiclePlate: "SGX3456C",
  },
  {
    name: "Deepa (Driver)",
    email: "driver4@demo.com",
    licenseNumber: "S4567890D",
    vehicleType: "Car",
    vehiclePlate: "SGX4567D",
  },
];

async function upsertDrivers() {
  const hash = await bcrypt.hash("password123", 12);
  const driverIds: string[] = [];

  for (const d of DRIVERS) {
    const user = await db.user.upsert({
      where: { email: d.email },
      update: {
        name: d.name,
        role: "DRIVER",
      },
      create: {
        name: d.name,
        email: d.email,
        passwordHash: hash,
        role: "DRIVER",
        driverProfile: {
          create: {
            licenseNumber: d.licenseNumber,
            vehicleType: d.vehicleType,
            vehiclePlate: d.vehiclePlate,
            isActive: true,
          },
        },
      },
      include: { driverProfile: true },
    });

    const driverId = user.driverProfile?.id;
    if (!driverId) throw new Error(`Missing driverProfile for ${d.email}`);
    driverIds.push(driverId);
  }

  return driverIds;
}

async function assignRoundRobin() {
  const driverIds = await upsertDrivers();

  // Prefer redistributing already-assigned requests; if none exist, assign all.
  const pickupAssigned = await db.pickupRequest.count({ where: { driverId: { not: null } } });
  const deliveryAssigned = await db.deliveryRequest.count({ where: { driverId: { not: null } } });

  const pickup = await db.pickupRequest.findMany({
    where: pickupAssigned > 0 ? { driverId: { not: null } } : {},
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  const delivery = await db.deliveryRequest.findMany({
    where: deliveryAssigned > 0 ? { driverId: { not: null } } : {},
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  const ops: Prisma.PrismaPromise<unknown>[] = [];

  pickup.forEach((r, idx) => {
    ops.push(
      db.pickupRequest.update({
        where: { id: r.id },
        data: { driverId: driverIds[idx % driverIds.length] },
      }),
    );
  });
  delivery.forEach((r, idx) => {
    ops.push(
      db.deliveryRequest.update({
        where: { id: r.id },
        data: { driverId: driverIds[idx % driverIds.length] },
      }),
    );
  });

  // Chunk transactions to avoid very large single transactions.
  const chunkSize = 250;
  for (let i = 0; i < ops.length; i += chunkSize) {
    await db.$transaction(ops.slice(i, i + chunkSize));
  }

  const pickupCounts = await db.pickupRequest.groupBy({
    by: ["driverId"],
    _count: { _all: true },
    where: pickupAssigned > 0 ? { driverId: { not: null } } : { driverId: { not: null } },
    orderBy: { driverId: "asc" },
  });
  const deliveryCounts = await db.deliveryRequest.groupBy({
    by: ["driverId"],
    _count: { _all: true },
    where: deliveryAssigned > 0 ? { driverId: { not: null } } : { driverId: { not: null } },
    orderBy: { driverId: "asc" },
  });

  console.log("✅ Assigned drivers (round-robin)");
  console.log("Pickup requests by driverId:", pickupCounts);
  console.log("Delivery requests by driverId:", deliveryCounts);
  console.log("Demo driver accounts:");
  console.log("  driver@demo.com  / password123 (Ahmad)");
  console.log("  driver2@demo.com / password123 (Ben)");
  console.log("  driver3@demo.com / password123 (Chen)");
  console.log("  driver4@demo.com / password123 (Deepa)");
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  await assignRoundRobin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

