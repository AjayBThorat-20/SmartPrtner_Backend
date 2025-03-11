const prisma = require('../config/dbConnect');


const getPartners = async (req, res) => {
  try {
    const partners = await prisma.deliveryPartner.findMany();
    console.log(partners)
    res.status(200).json(partners);
  } catch (error) {
    console.error("Error fetching partners:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


// Get all partners
const getAllPartners = async (req, res) => {
  const {
    page = 1, // Default page is 1
    limit = 10, // Default limit is 10
    status, // Filter by status (ACTIVE or INACTIVE)
    search, // Search by name, email, or area
  } = req.query;

  // Validate page and limit
  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);
  if (isNaN(pageNumber) || isNaN(limitNumber)) {
    return res.status(400).json({ error: "Invalid page or limit value. Must be a number." });
  }

  // Calculate offset for pagination
  const offset = (pageNumber - 1) * limitNumber;

  // Build the filter object
  const filters = {};

  // Apply status filter
  if (status) {
    filters.status = status;
  }

  // Apply search query for name, email, or area ONLY if search is not empty
  if (search) {
    filters.OR = [
      { name: { contains: search, mode: "insensitive" } }, // Case-insensitive search by name
      { email: { contains: search, mode: "insensitive" } }, // Case-insensitive search by email
      { areas: { some: { area: { name: { contains: search, mode: "insensitive" } } } }}, // Search by area name
    ];
  }

  try {
    // Fetch partners with filters and pagination
    const partners = await prisma.deliveryPartner.findMany({
      where: filters,
      skip: offset, // Skip records based on offset
      take: limitNumber, // Limit the number of records returned
      include: {
        areas: {
          include: {
            area: true, // Include area details
          },
        },
        shift: true, // Include shift details
        metrics: true, // Include metrics
        orders: true, // Include orders
      },
    });

    // Check if no records were found
    if (partners.length === 0) {
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

    // Get total count of partners for pagination metadata
    const totalPartners = await prisma.deliveryPartner.count({ where: filters });

    // Calculate total pages
    const totalPages = Math.ceil(totalPartners / limitNumber);

    // Return the response with pagination metadata
    res.status(200).json({
      data: partners,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: totalPartners,
        totalPages: totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching partners:", error);
    res.status(500).json({ error: "Failed to fetch partners due to a server error." });
  } finally {
    await prisma.$disconnect(); // Disconnect Prisma client
  }
};

const createPartner = async (req, res) => {
  try {
    const { name, email, phone, status, currentLoad, areas, shift, metrics } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !status || !Array.isArray(areas)) {
      return res.status(400).json({ error: "Missing or invalid required fields." });
    }

    if (currentLoad > 3) {
      return res.status(400).json({ error: "currentLoad must be 3 or less." });
    }

    // Structure `areas` correctly for Prisma
    const formattedAreas = areas.map(areaObj => ({
      area: {
        connectOrCreate: {
          where: { name: areaObj.area.connectOrCreate.where.name }, 
          create: { name: areaObj.area.connectOrCreate.create.name }
        }
      }
    }));

    const newPartner = await prisma.deliveryPartner.create({
      data: {
        name,
        email,
        phone,
        status,
        currentLoad: currentLoad || 0,
        areas: { create: formattedAreas }, // Using structured `areas`
        shift: shift ? { create: { start: shift.start, end: shift.end } } : undefined,
        metrics: metrics ? { 
          create: { 
            rating: metrics.rating || 0.0, 
            completedOrders: metrics.completedOrders || 0, 
            cancelledOrders: metrics.cancelledOrders || 0 
          } 
        } : undefined,
      },
      include: { areas: { include: { area: true } }, shift: true, metrics: true },
    });

    res.status(201).json(newPartner);
  } catch (error) {
    console.error("Error creating partner:", error);

    if (error.code === "P2002") {
      return res.status(400).json({ error: "A partner with this email already exists." });
    }

    return res.status(500).json({ error: `Failed to create partner: ${error.message}` });
  }
};


const updatePartner = async (req, res) => {
  const { id } = req.params; // Partner ID to update
  const {
    name,
    email,
    phone,
    status,
    currentLoad,
    areas, // Array of area names to link/unlink
    shift,
    metrics,
  } = req.body;

  try {
    // Validate required fields
    if (!name || !email || !phone || !status || currentLoad === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate areas (must be an array of strings)
    if (!Array.isArray(areas)) {
      return res.status(400).json({ error: 'Areas must be an array of strings' });
    }

    // Fetch existing partner with linked areas
    const existingPartner = await prisma.deliveryPartner.findUnique({
      where: { id },
      include: { areas: { include: { area: true } }, shift: true, metrics: true },
    });

    if (!existingPartner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Get current linked area names
    const currentAreaNames = existingPartner.areas.map((link) => link.area.name);

    // Determine areas to link (new areas not already linked)
    const areasToLink = areas.filter((areaName) => !currentAreaNames.includes(areaName));

    // Determine areas to unlink (existing areas not in the request)
    const areasToUnlink = existingPartner.areas
      .filter((link) => !areas.includes(link.area.name))
      .map((link) => link.areaId);

    // Update partner details
    const updatedPartner = await prisma.deliveryPartner.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        status,
        currentLoad,
        areas: {
          // Unlink areas that are no longer in the request
          deleteMany: { areaId: { in: areasToUnlink } },
          // Link new areas
          create: areasToLink.map((areaName) => ({
            area: {
              connectOrCreate: {
                where: { name: areaName },
                create: { name: areaName },
              },
            },
          })),
        },
        shift: {
          // Update shift
          upsert: {
            create: { start: shift.start, end: shift.end },
            update: { start: shift.start, end: shift.end },
          },
        },
        metrics: {
          // Update metrics
          upsert: {
            create: {
              rating: metrics.rating,
              completedOrders: metrics.completedOrders,
              cancelledOrders: metrics.cancelledOrders,
            },
            update: {
              rating: metrics.rating,
              completedOrders: metrics.completedOrders,
              cancelledOrders: metrics.cancelledOrders,
            },
          },
        },
      },
      include: { areas: { include: { area: true } }, shift: true, metrics: true }, // Include related data in the response
    });

    // Send success response
    res.status(200).json(updatedPartner);
  } catch (error) {
    console.error('Error updating partner:', error);
    res.status(500).json({ error: 'Failed to update partner' });
  }
};


const deletePartner = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.deliveryPartner.delete({
      where: { id },
    });
    res.json({ message: 'Partner deleted successfully.' });
  } catch (error) {
    console.error('Error deleting partner:', error);
    if (error.code === 'P2025') { // Prisma record not found
      res.status(404).json({ error: 'Partner not found.' });
    } else {
      res.status(500).json({ error: 'Failed to delete partner due to a server error.' });
    }
  }
};

// Get available partners
const getAvailablePartners = async (req, res) => {
  try {
    const partners = await prisma.deliveryPartner.findMany({
      where: {
        status: "ACTIVE",
        currentLoad: { lte: 3 }, // Use `lte` instead of `lt`
      },
    });
    console.log("Fetched partners:", partners);
    res.json(partners);
  } catch (error) {
    console.error("Error fetching available partners:", error);
    res.status(500).json({ error: "Failed to fetch available partners due to a server error." });
  }
};



// Endpoint: GET /api/partners/:partnerId/metrics
const getDeliveryPartnerMetrics = async (req, res) => {
  const { id } = req.params;

  try {
    const metrics = await prisma.metrics.findUnique({
      where: { deliveryPartnerId: id },
    });

    if (!metrics) {
      return res.status(404).json({ error: "Metrics not found for the delivery partner." });
    }

    res.json(metrics);
  } catch (error) {
    console.error("Error fetching delivery partner metrics:", error);
    res.status(500).json({ error: "Failed to fetch delivery partner metrics." });
  }
};
module.exports = {
  getPartners,
  getAllPartners,
  createPartner,
  updatePartner,
  deletePartner,
  getAvailablePartners,
  getDeliveryPartnerMetrics
};