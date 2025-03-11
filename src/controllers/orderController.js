const prisma = require('../config/dbConnect');

// const getOrderById = async (req, res) => {
//   const { id } = req.params;

//   try {
//     const order = await prisma.order.findUnique({
//       where: { id},
//       include: {
//         customer: true,
//         area: true,
//         items: true,
//         deliveryPartner: true,
//         orderStatusHistory: true,
//       },
//     });

//     if (!order) {
//       return res.status(404).json({ error: "Order not found." });
//     }

//     res.json(order);
//   } catch (error) {
//     console.error("Error fetching order:", error);
//     res.status(500).json({ error: "Failed to fetch order." });
//   }
// };

// const getOrderById = async (req, res) => {
//   const { id } = req.params;

//   try {
//     const order = await prisma.order.findUnique({
//       where: { id },
//       include: {
//         customer: true,
//         area: true,
//         items: true,
//         deliveryPartner: true,
//         orderStatusHistory: true, 
//       },
//     });

//     if (!order) {
//       return res.status(404).json({ error: "Order not found." });
//     }

//     res.json(order);
//   } catch (error) {
//     console.error("Error fetching order:", error);
//     res.status(500).json({ error: "Failed to fetch order." });
//   }
// };



const getOrderById = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        area: true,
        items: true,
        deliveryPartner: {
          include: {
            metrics: true, // Include delivery partner metrics
          },
        },
        statusHistory: true, // Include status history
        assignments: {
          include: {
            partner: true, // Include delivery partner details for assignments
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    // Transform assignments into assignment history
    const assignmentHistory = order.assignments.map((assignment) => ({
      id: assignment.id,
      partner: assignment.partner,
      status: assignment.status,
      timestamp: assignment.timestamp,
    }));

    // Include status history and assignment history in the response
    const response = {
      ...order,
      statusHistory: order.statusHistory,
      assignmentHistory,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Failed to fetch order." });
  }
};

// const getAllOrders = async (req, res) => {
//   const { 
//     page = 1, 
//     limit = 10, 
//     status, 
//     areaId, 
//     assignedTo,
//     scheduledFrom, // New filter: Start date for scheduledFor
//     scheduledTo,   // New filter: End date for scheduledFor
//     search 
//   } = req.query;

//   // Validate page and limit
//   const pageNumber = parseInt(page);
//   const limitNumber = parseInt(limit);
//   if (isNaN(pageNumber) || isNaN(limitNumber)) {
//     return res.status(400).json({ error: "Invalid page or limit value. Must be a number." });
//   }

//   // Build the filter object
//   const filters = {};

//   if (status) filters.status = status;
//   if (areaId) filters.areaId = areaId;
//   if (assignedTo) filters.assignedTo = assignedTo;

//   // Add date range filter for scheduledFor
//   if (scheduledFrom && scheduledTo) {
//     filters.scheduledFor = {
//       gte: new Date(scheduledFrom).toISOString(),
//       lte: new Date(scheduledTo).toISOString(),
//     };
//   }

//   // Add search functionality
//   if (search) {
//     filters.OR = [
//       { orderNumber: { contains: search, mode: 'insensitive' } },
//       { customer: { name: { contains: search, mode: 'insensitive' } } },
//       { assignedTo: { contains: search, mode: 'insensitive' } },
//     ];
//   }

//   try {
//     // Fetch orders with filters and pagination
//     const orders = await prisma.order.findMany({
//       where: filters,
//       skip: (pageNumber - 1) * limitNumber,
//       take: limitNumber,
//       include: {
//         area: true,
//         customer: true,
//         items: true,
//         deliveryPartner: {
//           include: { metrics: true }, // Include delivery partner metrics
//         },
//         orderStatusHistory: true,
//       },
//     });

//     // Get total count of orders for pagination metadata
//     const totalOrders = await prisma.order.count({ where: filters });

//     res.status(200).json({
//       data: orders,
//       pagination: {
//         page: pageNumber,
//         limit: limitNumber,
//         total: totalOrders,
//         totalPages: Math.ceil(totalOrders / limitNumber),
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching orders:", error);
//     res.status(500).json({ error: "Failed to fetch orders due to a server error." });
//   }
// };


const getAllOrders = async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    status, 
    areaId, 
    assignedTo,
    scheduledFrom, 
    scheduledTo,   
    search 
  } = req.query;

  // Validate page and limit
  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);
  if (isNaN(pageNumber) || isNaN(limitNumber)) {
    return res.status(400).json({ error: "Invalid page or limit value. Must be a number." });
  }

  // Build the filter object
  const filters = {};

  if (status) filters.status = status;
  if (areaId) filters.areaId = areaId;
  if (assignedTo) filters.assignedTo = assignedTo;

  // Add date range filter for scheduledFor
  if (scheduledFrom && scheduledTo) {
    filters.scheduledFor = {
      gte: new Date(scheduledFrom).toISOString(),
      lte: new Date(scheduledTo).toISOString(),
    };
  }

  // Add search functionality
  if (search) {
    filters.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { assignedTo: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    // Fetch orders with filters and pagination
    const orders = await prisma.order.findMany({
      where: filters,
      skip: (pageNumber - 1) * limitNumber,
      take: limitNumber,
      include: {
        area: true,
        customer: true,
        items: true,
        deliveryPartner: {
          include: { metrics: true },
        },
        statusHistory: true, // Corrected field name
      },
    });

    // Get total count of orders for pagination metadata
    const totalOrders = await prisma.order.count({ where: filters });

    res.status(200).json({
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
    res.status(500).json({ error: "Failed to fetch orders due to a server error." });
  }
};


// const createOrder = async (req, res) => {
//   const { 
//     customer, 
//     area, 
//     items, 
//     status, 
//     scheduledFor, 
//     assignedTo, 
//     totalAmount 
//   } = req.body;

//   console.log("Request body received:", req.body);

//   // Validate required fields
//   if (!customer || !area || !items || !status || !scheduledFor || !totalAmount) {
//     console.log("Validation failed: Missing required fields");
//     return res.status(400).json({ error: 'Missing required fields.' });
//   }

//   // Validate customer object
//   if (!customer.name || !customer.phone || !customer.address) {
//     console.log("Validation failed: Invalid customer object");
//     return res.status(400).json({ error: 'Customer must have name, phone, and address.' });
//   }

//   // Validate items array
//   if (!Array.isArray(items) || items.length === 0) {
//     console.log("Validation failed: Invalid items array");
//     return res.status(400).json({ error: 'Items must be provided as a non-empty array.' });
//   }

//   for (const item of items) {
//     if (!item.name || !item.quantity || !item.price) {
//       console.log("Validation failed: Invalid item");
//       return res.status(400).json({ error: 'Each item must have name, quantity, and price.' });
//     }
//   }

//   // Validate assignedTo (if provided)
//   if (assignedTo) {
//     console.log("Validating assignedTo:", assignedTo);
//     const deliveryPartner = await prisma.deliveryPartner.findUnique({
//       where: { id: assignedTo },
//     });

//     if (!deliveryPartner) {
//       console.log("Validation failed: Invalid delivery partner ID");
//       return res.status(400).json({ error: 'Invalid delivery partner ID.' });
//     }
//   }

//   try {
//     console.log("Generating orderNumber...");

//     // Fetch the last order to determine the next order number
//     const lastOrder = await prisma.order.findFirst({
//       orderBy: { orderNumber: 'desc' },
//     });

//     let orderNumber;

//     if (!lastOrder) {
//       // If no orders exist, start with 'aaaa00000'
//       orderNumber = "aaaa00000";
//     } else {
//       // Extract the last order number
//       const lastOrderNumber = lastOrder.orderNumber;

//       // Extract the alphabetic and numeric parts
//       const alphaPart = lastOrderNumber.slice(0, 4);
//       const numericPart = lastOrderNumber.slice(4);

//       // Increment the numeric part
//       let newNumericPart = String(Number(numericPart) + 1).padStart(5, '0');

//       // If numericPart exceeds "99999", reset to "00000" and increment the alphaPart
//       if (newNumericPart > "99999") {
//         newNumericPart = "00000";
//         const alphaChars = alphaPart.split('');

//         // Increment the alphaPart
//         for (let i = 3; i >= 0; i--) {
//           if (alphaChars[i] === 'z') {
//             alphaChars[i] = 'a';
//           } else {
//             alphaChars[i] = String.fromCharCode(alphaChars[i].charCodeAt(0) + 1);
//             break;
//           }
//         }

//         orderNumber = alphaChars.join('') + newNumericPart;
//       } else {
//         orderNumber = alphaPart + newNumericPart;
//       }
//     }

//     console.log("Generated orderNumber:", orderNumber);

//     // Create the order in the database
//     console.log("Creating order in the database...");
//     const newOrder = await prisma.order.create({
//       data: {
//         orderNumber,
//         customer: {
//           create: {
//             name: customer.name,
//             phone: customer.phone,
//             address: customer.address,
//           },
//         },
//         area: {
//           connect: { id: area },
//         },
//         items: {
//           create: items.map((item) => ({
//             name: item.name,
//             quantity: item.quantity,
//             price: item.price,
//           })),
//         },
//         status,
//         scheduledFor: new Date(scheduledFor).toISOString(),
//         deliveryPartner: assignedTo ? { connect: { id: assignedTo } } : undefined,
//         totalAmount,
//         statusHistory: {
//           create: {
//             status,
//             createdAt: new Date().toISOString(),
//           },
//         },
//       },
//       include: {
//         customer: true,
//         items: true,
//         deliveryPartner: true,
//         statusHistory: true,
//       },
//     });

//     console.log("Order created successfully:", newOrder);
//     res.status(201).json(newOrder);
//   } catch (error) {
//     console.error('Error creating order:', error);
//     res.status(500).json({ error: 'Failed to create order. Please try again later.' });
//   }
// };

// const updateOrderStatus = async (req, res) => {
//   const { id } = req.params;
//   const { status } = req.body;

//   console.log("Request received to update order status:", { id, status });

//   // Validate required fields
//   if (!status) {
//     console.log("Validation failed: Status is required");
//     return res.status(400).json({ error: 'Status is required' });
//   }

//   // Validate status (must be a valid OrderStatus)
//   const validStatuses = ["PENDING", "ASSIGNED", "PICKED", "DELIVERED"];
//   if (!validStatuses.includes(status)) {
//     console.log("Validation failed: Invalid status value");
//     return res.status(400).json({ error: 'Invalid status value' });
//   }

//   try {
//     // Fetch the current order to check its existing status
//     const currentOrder = await prisma.order.findUnique({
//       where: { id },
//       include: {
//         deliveryPartner: true,
//         statusHistory: true, // Include status history
//       },
//     });

//     if (!currentOrder) {
//       console.log("Validation failed: Order not found");
//       return res.status(404).json({ error: 'Order not found' });
//     }

//     console.log("Current order status:", currentOrder.status);

//     // Prevent updating to the same status
//     if (currentOrder.status === status) {
//       console.log("Validation failed: Order already has the requested status");
//       return res.status(400).json({ error: 'Order already has the requested status' });
//     }

//     // Update the order status and create a new status history record
//     console.log("Updating order status...");
//     const updatedOrder = await prisma.order.update({
//       where: { id },
//       data: { 
//         status, // Update the order status
//         statusHistory: {
//           create: {
//             status, // Add the new status to the status history
//           },
//         },
//       },
//       include: {
//         deliveryPartner: true,
//         statusHistory: true, // Include status history in the response
//       },
//     });

//     console.log("Order status updated successfully:", updatedOrder);

//     // If the status is updated to "DELIVERED", update the delivery partner's metrics
//     if (status === "DELIVERED" && updatedOrder.deliveryPartner) {
//       console.log("Updating delivery partner metrics...");
//       await prisma.metrics.update({
//         where: { deliveryPartnerId: updatedOrder.deliveryPartner.id },
//         data: {
//           completedOrders: { increment: 1 },
//         },
//       });
//       console.log("Delivery partner metrics updated successfully");
//     }

//     res.json(updatedOrder);
//   } catch (error) {
//     console.error('Error updating order status:', error);
//     res.status(500).json({ error: 'Failed to update order status. Please try again later.' });
//   }
// };







const createOrder = async (req, res) => {
  const { 
    customer, 
    area, 
    items, 
    status, 
    scheduledFor, 
    assignedTo, 
    totalAmount 
  } = req.body;

  console.log("Request body received:", req.body);

  // Validate required fields
  if (!customer || !area || !items || !status || !scheduledFor || !totalAmount) {
    console.log("Validation failed: Missing required fields");
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  // Validate customer object
  if (!customer.name || !customer.phone || !customer.address) {
    console.log("Validation failed: Invalid customer object");
    return res.status(400).json({ error: 'Customer must have name, phone, and address.' });
  }

  // Validate items array
  if (!Array.isArray(items) || items.length === 0) {
    console.log("Validation failed: Invalid items array");
    return res.status(400).json({ error: 'Items must be provided as a non-empty array.' });
  }

  for (const item of items) {
    if (!item.name || !item.quantity || !item.price) {
      console.log("Validation failed: Invalid item");
      return res.status(400).json({ error: 'Each item must have name, quantity, and price.' });
    }
  }

  // Validate assignedTo (if provided)
  if (assignedTo) {
    console.log("Validating assignedTo:", assignedTo);
    const deliveryPartner = await prisma.deliveryPartner.findUnique({
      where: { id: assignedTo },
    });

    if (!deliveryPartner) {
      console.log("Validation failed: Invalid delivery partner ID");
      return res.status(400).json({ error: 'Invalid delivery partner ID.' });
    }
  }

  try {
    console.log("Generating orderNumber...");

    // Fetch the last order to determine the next order number
    const lastOrder = await prisma.order.findFirst({
      orderBy: { orderNumber: 'desc' },
    });

    let orderNumber;

    if (!lastOrder) {
      // If no orders exist, start with 'aaaa00000'
      orderNumber = "aaaa00000";
    } else {
      // Extract the last order number
      const lastOrderNumber = lastOrder.orderNumber;

      // Extract the alphabetic and numeric parts
      const alphaPart = lastOrderNumber.slice(0, 4);
      const numericPart = lastOrderNumber.slice(4);

      // Increment the numeric part
      let newNumericPart = String(Number(numericPart) + 1).padStart(5, '0');

      // If numericPart exceeds "99999", reset to "00000" and increment the alphaPart
      if (newNumericPart > "99999") {
        newNumericPart = "00000";
        const alphaChars = alphaPart.split('');

        // Increment the alphaPart
        for (let i = 3; i >= 0; i--) {
          if (alphaChars[i] === 'z') {
            alphaChars[i] = 'a';
          } else {
            alphaChars[i] = String.fromCharCode(alphaChars[i].charCodeAt(0) + 1);
            break;
          }
        }

        orderNumber = alphaChars.join('') + newNumericPart;
      } else {
        orderNumber = alphaPart + newNumericPart;
      }
    }

    console.log("Generated orderNumber:", orderNumber);

    // Create the order in the database
    console.log("Creating order in the database...");
    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        customer: {
          create: {
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
          },
        },
        area: {
          connect: { id: area },
        },
        items: {
          create: items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
        },
        status,
        scheduledFor: new Date(scheduledFor).toISOString(),
        deliveryPartner: assignedTo ? { connect: { id: assignedTo } } : undefined,
        totalAmount,
        statusHistory: {
          create: {
            status,
            statusAt: new Date().toISOString(), // Use statusAt instead of createdAt
          },
        },
      },
      include: {
        customer: true,
        items: true,
        deliveryPartner: true,
        statusHistory: true,
      },
    });

    console.log("Order created successfully:", newOrder);
    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order. Please try again later.' });
  }
};

const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  console.log("Request received to update order status:", { id, status });

  // Validate required fields
  if (!status) {
    console.log("Validation failed: Status is required");
    return res.status(400).json({ error: 'Status is required' });
  }

  // Validate status (must be a valid OrderStatus)
  const validStatuses = ["PENDING", "ASSIGNED", "PICKED", "DELIVERED"];
  if (!validStatuses.includes(status)) {
    console.log("Validation failed: Invalid status value");
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    // Fetch the current order to check its existing status
    const currentOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        deliveryPartner: true,
        statusHistory: true, // Include status history
      },
    });

    if (!currentOrder) {
      console.log("Validation failed: Order not found");
      return res.status(404).json({ error: 'Order not found' });
    }

    console.log("Current order status:", currentOrder.status);

    // Prevent updating to the same status
    if (currentOrder.status === status) {
      console.log("Validation failed: Order already has the requested status");
      return res.status(400).json({ error: 'Order already has the requested status' });
    }

    // Update the order status and create a new status history record
    console.log("Updating order status...");
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { 
        status, // Update the order status
        statusHistory: {
          create: {
            status, // Add the new status to the status history
            statusAt: new Date().toISOString(), // Use statusAt instead of createdAt
          },
        },
      },
      include: {
        deliveryPartner: true,
        statusHistory: true, // Include status history in the response
      },
    });

    console.log("Order status updated successfully:", updatedOrder);

    // If the status is updated to "DELIVERED", update the delivery partner's metrics
    if (status === "DELIVERED" && updatedOrder.deliveryPartner) {
      console.log("Updating delivery partner metrics...");
      await prisma.metrics.update({
        where: { deliveryPartnerId: updatedOrder.deliveryPartner.id },
        data: {
          completedOrders: { increment: 1 },
        },
      });
      console.log("Delivery partner metrics updated successfully");
    }

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status. Please try again later.' });
  }
};

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





// Endpoint: GET /api/orders/:id/status-history
const getOrderStatusHistory = async (req, res) => {
  const { id } = req.params;

  try {
    const statusHistory = await prisma.orderStatusHistory.findMany({
      where: { id },
      orderBy: { createdAt: 'asc' },
    });

    if (!statusHistory || statusHistory.length === 0) {
      return res.status(404).json({ error: "No status history found for this order." });
    }

    res.json(statusHistory);
  } catch (error) {
    console.error("Error fetching order status history:", error);
    res.status(500).json({ error: "Failed to fetch order status history." });
  }
};
module.exports = {
  getAllOrders,
  createOrder,
  updateOrderStatus,
  getActiveOrders,
  getOrderStatusHistory,
  getOrderById
};

