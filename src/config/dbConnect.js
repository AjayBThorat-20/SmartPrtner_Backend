// const { PrismaClient } = require("@prisma/client");
// const prisma = new PrismaClient();

// const dbConnect = async () => {
//   try {
//     await prisma.$connect();
//     console.log("✅ Database connected successfully");
//   } catch (error) {
//     console.error("❌ Database connection error:", error);
//     process.exit(1); // Exit if the database connection fails
//   }
// };

// dbConnect(); // Automatically connect to the database

// module.exports = prisma; // Export `prisma` directly









const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const dbConnect = async () => {
  try {
    console.log("Connecting to database...");
    await prisma.$connect();
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection error:", error);
    process.exit(1); // Exit if the database connection fails
  }
};

dbConnect(); // Automatically connect to the database

module.exports = prisma; // Export `prisma` directly