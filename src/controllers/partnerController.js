const prisma = require('../config/dbConnect');

// Get all partners
const getAllPartners = async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    status, // Filter by status
    search // Search by name, email, or area
  } = req.query;

  // Validate page and limit
  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);
  if (isNaN(pageNumber)) {
    return res.status(400).json({ error: "Invalid page value. Must be a number." });
  }
  if (isNaN(limitNumber)) {
    return res.status(400).json({ error: "Invalid limit value. Must be a number." });
  }

  // Calculate offset for pagination
  const offset = (pageNumber - 1) * limitNumber;

  // Build the filter object
  const filters = {};

  // Apply status filter
  if (status) {
    filters.status = status;
  }

  // Apply search query for name, email, or area
  if (search) {
    filters.OR = [
      { name: { contains: search, mode: 'insensitive' } }, // Case-insensitive search by name
      { email: { contains: search, mode: 'insensitive' } }, // Case-insensitive search by email
      { areas: { hasSome: [search] } }, // Search by area
    ];
  }

  try {
    // Fetch partners with filters and pagination
    const partners = await prisma.deliveryPartner.findMany({
      where: filters,
      skip: offset, // Skip records based on offset
      take: limitNumber, // Limit the number of records returned
      include: {
        shift: true,    // Include shift details
        metrics: true,  // Include metrics
        orders: true,   // Include orders
        areas: {        // Include areas (many-to-many relationship)
          include: {
            area: true,
          },
        },
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

    res.json({
      data: partners,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: totalPartners,
        totalPages: Math.ceil(totalPartners / limitNumber),
      },
    });
  } catch (error) {
    console.error("Error fetching partners:", error);
    res.status(500).json({ error: "Failed to fetch partners due to a server error." });
  }
};



const createPartner = async (req, res) => {
  try {
    const { name, email, phone, status, currentLoad, areas, shift, metrics } = req.body;

    // ✅ Validate required fields
    if (!name || !email || !phone || !status || !Array.isArray(areas)) {
      return res.status(400).json({ error: "Missing or invalid required fields." });
    }

    if (currentLoad > 3) {
      return res.status(400).json({ error: "currentLoad must be 3 or less." });
    }

    // ✅ Structure `areas` correctly for Prisma
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
        areas: { create: formattedAreas }, // ✅ Fix: Using structured `areas`
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


// Update a partner
const updatePartner = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, status, currentLoad, areas, shift, metrics } = req.body;

  // Validate currentLoad (must be <= 3)
  if (currentLoad > 3) {
    return res.status(400).json({ error: 'currentLoad must be less than or equal to 3.' });
  }

  try {
    const updatedPartner = await prisma.deliveryPartner.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        status,
        currentLoad,
        areas,
        shift: {
          update: shift, // Update shift details
        },
        metrics: {
          update: metrics, // Update metrics
        },
      },
      include: {
        shift: true,    // Include updated shift details
        metrics: true,  // Include updated metrics
      },
    });
    res.json(updatedPartner);
  } catch (error) {
    console.error('Error updating partner:', error);
    if (error.code === 'P2025') { // Prisma record not found
      res.status(404).json({ error: 'Partner not found.' });
    } else {
      res.status(500).json({ error: 'Failed to update partner due to a server error.' });
    }
  }
};

// Delete a partner
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
        currentLoad: { lt: 3 },
      },
    });

    res.json(partners);
  } catch (error) {
    console.error("Error fetching available partners:", error);
    res.status(500).json({ error: "Failed to fetch available partners due to a server error." });
  }
};

module.exports = {
  getAllPartners,
  createPartner,
  updatePartner,
  deletePartner,
  getAvailablePartners
};