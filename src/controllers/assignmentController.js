const prisma = require("../config/dbConnect");

// Get all assignment metrics
const getAllAssignmentMetrics = async (req, res) => {
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

// Get filtered assignment metrics
const getFilteredAssignmentMetrics = async (req, res) => {
  try {
    const { 
      status, 
      fromDate, 
      toDate, 
      orderId, 
      partnerId, 
      page = 1, 
      limit = 10 
    } = req.query;

    // Validate page and limit
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    if (isNaN(pageNumber)) {
      return res.status(400).json({ error: "Invalid page number. Must be a number." });
    }
    if (isNaN(limitNumber)) {
      return res.status(400).json({ error: "Invalid limit value. Must be a number." });
    }

    // Calculate pagination offset
    const offset = (pageNumber - 1) * limitNumber;

    // Build the filter object
    const filters = {};

    if (status) {
      filters.status = { in: status.split(",") }; // Support multiple statuses
    }

    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);

      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
      }

      filters.timestamp = {
        gte: from, // Greater than or equal to fromDate
        lte: to,   // Less than or equal to toDate
      };
    }

    if (orderId) {
      filters.orderId = orderId;
    }

    if (partnerId) {
      filters.partnerId = partnerId;
    }

    // Fetch metrics with filters, pagination, and include failureReasons
    const metrics = await prisma.assignmentMetrics.findMany({
      where: filters,
      include: {
        failureReasons: true, // Include related failure reasons
      },
      skip: offset, // Pagination: skip records
      take: limitNumber, // Pagination: limit records per page
    });

    // Check if no records were found
    if (metrics.length === 0) {
      return res.status(200).json({
        message: "No records found.",
        data: [],
        pagination: {
          total: 0,
          page: pageNumber,
          limit: limitNumber,
          totalPages: 0,
        },
      });
    }

    // Get total count for pagination metadata
    const totalCount = await prisma.assignmentMetrics.count({ where: filters });

    // Send response with pagination metadata
    res.json({
      data: metrics,
      pagination: {
        total: totalCount,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalCount / limitNumber),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching assignment metrics:", error);
    res.status(500).json({ error: "Failed to fetch assignment metrics due to a server error." });
  }
};
// Run assignment algorithm
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

module.exports = { 
  getRecentAssignments, 
  getAllAssignmentMetrics, 
  getFilteredAssignmentMetrics, 
  runAssignmentAlgorithm 
};