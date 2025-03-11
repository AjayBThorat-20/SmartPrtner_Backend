const prisma = require("../config/dbConnect");

// Get all assignment metrics
const getAssignmentMetrics = async (req, res) => {
  try {
    // Fetch all metrics without any filters or pagination
    const metrics = await prisma.assignmentMetrics.findMany({
      include: {
        failureReasons: true, // Include related failure reasons
      },
    });

    // Check if no records were found
    if (metrics.length === 0) {
      return res.status(200).json({
        message: "No records found.",
        data: [],
      });
    }

    // Send response with the fetched metrics
    res.json({
      data: metrics,
    });
  } catch (error) {
    console.error("❌ Error fetching assignment metrics:", error);
    res.status(500).json({ error: "Failed to fetch assignment metrics due to a server error." });
  }
};

const AssignmentStatus = {
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
};


const getAllAssignmentMetrics = async (req, res) => {
  console.log("Attempting to connect to the database...");
  try {
    await prisma.$connect();
    console.log("Database connection successful!");

    const {
      page = 1,
      limit = 10,
      status,
      fromDate,
      toDate,
      search,
    } = req.query;

    console.log("Query parameters:", { page, limit, status, fromDate, toDate, search });

    // Validate page and limit
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    if (isNaN(pageNumber) || isNaN(limitNumber)) {
      return res.status(400).json({ error: "Invalid page or limit value. Must be a number." });
    }

    const offset = (pageNumber - 1) * limitNumber;

    // Build the filter object
    const filters = {};

    // Apply status filter (if provided)
    if (status) {
      // Convert status string to enum values
      const validStatusValues = status.split(",").map(s => s.trim().toUpperCase());
      const enumStatusValues = validStatusValues.filter(s => Object.values(AssignmentStatus).includes(s));

      if (enumStatusValues.length === 0) {
        return res.status(400).json({ error: "Invalid status value. Must be one of: SUCCESS, FAILED." });
      }

      filters.status = { in: enumStatusValues };
    }

    // Apply date range filter
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);

      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
      }

      if (from > to) {
        return res.status(400).json({ error: "fromDate must be before or equal to toDate." });
      }

      filters.timestamp = {
        gte: from,
        lte: to,
      };
    } else if (fromDate || toDate) {
      return res.status(400).json({ error: "Both fromDate and toDate are required for date filtering." });
    }

    // Apply search filter
    if (search) {
      filters.OR = [
        { order: { orderNumber: { contains: search, mode: "insensitive" } } }, // Search by order number
        { order: { id: { contains: search, mode: "insensitive" } } }, // Search by order ID
        { partner: { name: { contains: search, mode: "insensitive" } } }, // Search by partner name
        { partner: { id: { contains: search, mode: "insensitive" } } }, // Search by partner ID
      ];
    }

    console.log("Filters applied:", filters);

    // Fetch assignments with filters and pagination
    const assignments = await prisma.assignment.findMany({
      where: filters,
      include: {
        order: true, // Include related order details
        partner: true, // Include related partner details
      },
      skip: offset,
      take: limitNumber,
    });

    console.log("Assignments fetched:", assignments.length);

    // If no records are found, return an empty response
    if (assignments.length === 0) {
      return res.status(200).json({
        message: "No records found.",
        data: [],
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // Get total count of assignments for pagination metadata
    const totalCount = await prisma.assignment.count({ where: filters });

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limitNumber);

    // Return the response with pagination metadata
    res.status(200).json({
      data: assignments,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: totalCount,
        totalPages: totalPages,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching assignments:", error);

    // Handle specific Prisma errors
    if (error.code === "P2025") {
      return res.status(404).json({ error: "No records found." });
    }

    // Generic server error
    res.status(500).json({ error: "Failed to fetch assignments due to a server error." });
  } finally {
    await prisma.$disconnect();
    console.log("Database connection closed.");
  }
};


const runAssignmentAlgorithm = async (req, res) => {
  try {
    // Fetch all pending orders
    const pendingOrders = await prisma.order.findMany({
      where: { status: "PENDING" },
      include: { items: true },
    });

    // Check if there are no pending orders
    if (pendingOrders.length === 0) {
      return res.status(200).json({ message: "No pending orders found." });
    }

    // Fetch all active delivery partners
    const activePartners = await prisma.deliveryPartner.findMany({
      where: { status: "ACTIVE", currentLoad: { lt: 3 } },
      include: { areas: true, shift: true },
    });

    // Check if there are no active partners
    if (activePartners.length === 0) {
      return res.status(200).json({ message: "No active delivery partners available." });
    }

    for (const order of pendingOrders) {
      const { area, scheduledFor } = order;

      // Find a suitable partner
      const suitablePartner = activePartners.find((partner) => {
        const servesArea = partner.areas.includes(area);
        const isAvailable = isPartnerAvailable(partner, scheduledFor);
        return servesArea && isAvailable;
      });

      if (suitablePartner) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "ASSIGNED", assignedTo: suitablePartner.id },
        });

        await prisma.deliveryPartner.update({
          where: { id: suitablePartner.id },
          data: { currentLoad: { increment: 1 } },
        });

        await prisma.assignment.create({
          data: {
            orderId: order.id,
            partnerId: suitablePartner.id,
            status: "SUCCESS",
            timestamp: new Date(),
          },
        });

        console.log(`✅ Order ${order.orderNumber} assigned to ${suitablePartner.name}`);
      } else {
        await prisma.assignment.create({
          data: {
            orderId: order.id,
            status: "FAILED",
            reason: "No suitable partner available",
            timestamp: new Date(),
          },
        });

        console.log(`❌ No suitable partner found for order ${order.orderNumber}`);
      }
    }

    res.json({ message: "✅ Assignment algorithm executed successfully" });
  } catch (error) {
    console.error("❌ Error running assignment algorithm:", error);
    res.status(500).json({ error: "Failed to run assignment algorithm due to a server error." });
  }
};

// Helper function to check partner availability
const isPartnerAvailable = (partner, scheduledTime) => {
  if (!partner.shift) return false;

  const { start, end } = partner.shift;
  const scheduled = new Date(`1970-01-01T${scheduledTime}:00`);
  const shiftStart = new Date(`1970-01-01T${start}:00`);
  const shiftEnd = new Date(`1970-01-01T${end}:00`);

  return scheduled >= shiftStart && scheduled <= shiftEnd;
};


const getRecentAssignments = async (req, res) => {
  try {
    const recentAssignments = await prisma.assignment.findMany({
      orderBy: { timestamp: "desc" },
      take: 5,
      include: {
        order: {
          select: { id: true, orderNumber: true, status: true },
        },
        partner: {
          select: { id: true, name: true },
        },
      },
    });

    // Always return an array, even if empty
    res.json(recentAssignments || []);
  } catch (error) {
    console.error("❌ Error fetching recent assignments:", error);
    res.status(500).json({ error: "Failed to fetch recent assignments due to a server error." });
  }
};




const getAssignmentHistory = async (req, res) => {
  const { orderId } = req.params;

  try {
    const assignments = await prisma.assignment.findMany({
      where: { orderId },
      include: { partner: true },
    });

    res.json(assignments);
  } catch (error) {
    console.error("Error fetching assignment history:", error);
    res.status(500).json({ error: "Failed to fetch assignment history" });
  }
};


module.exports = { 
  getAssignmentMetrics,
  getRecentAssignments, 
  getAllAssignmentMetrics,  
  runAssignmentAlgorithm,
  getAssignmentHistory 
};