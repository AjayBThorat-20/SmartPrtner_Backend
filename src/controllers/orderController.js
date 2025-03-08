const prisma = require('../config/dbConnect');

// Get all orders
const getAllOrders = async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    status, 
    area, 
    assignedTo 
  } = req.query; // Default: page 1, limit 10

  // Validate page and limit
  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);
  if (isNaN(pageNumber) || isNaN(limitNumber)) {
    return res.status(400).json({ error: "Invalid page or limit value" });
  }

  // Calculate offset for pagination
  const offset = (pageNumber - 1) * limitNumber;

  // Build the filter object
  const filters = {};

  if (status) {
    filters.status = status;
  }

  if (area) {
    filters.area = area;
  }

  if (assignedTo) {
    filters.assignedTo = assignedTo;
  }

  try {
    // Fetch orders with filters and pagination
    const orders = await prisma.order.findMany({
      where: filters,
      skip: offset, // Skip records based on offset
      take: limitNumber, // Limit the number of records returned
      include: {
        customer: true, // Include customer details
        items: true,    // Include items
      },
    });

    // Get total count of orders for pagination metadata
    const totalOrders = await prisma.order.count({ where: filters });

    res.json({
      data: orders,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: totalOrders,
        totalPages: Math.ceil(totalOrders / limitNumber),
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

// Create a new order
const createOrder = async (req, res) => {
  const { 
    orderNumber, 
    customer, 
    area, 
    items, 
    status, 
    scheduledFor, 
    assignedTo, 
    totalAmount 
  } = req.body;

  // Validate required fields
  if (!orderNumber || !customer || !area || !items || !status || !scheduledFor || !totalAmount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate items (must be an array)
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Items must be provided as an array' });
  }

  try {
    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        customer: {
          create: customer, // Create a new customer
        },
        area,
        items: {
          create: items, // Create multiple items
        },
        status,
        scheduledFor,
        assignedTo: assignedTo || null, // Optional field
        totalAmount,
      },
      include: {
        customer: true, // Include customer details in the response
        items: true,    // Include items in the response
      },
    });
    res.status(201).json(newOrder); // 201 Created status for successful creation
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Validate required fields
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  // Validate status (must be a valid OrderStatus)
  const validStatuses = ["PENDING", "ASSIGNED", "PICKED", "DELIVERED"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
    });
    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};



// Get all active orders
const getActiveOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ["PENDING", "ASSIGNED", "PICKED"] },
      },
    });

    res.json(orders);
  } catch (error) {
    console.error("Error fetching active orders:", error);
    res.status(500).json({ error: "Failed to fetch active orders" });
  }
};

module.exports = {
  getAllOrders,
  createOrder,
  updateOrderStatus,
  getActiveOrders,
};