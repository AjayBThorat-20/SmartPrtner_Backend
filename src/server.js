const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const partnerRoutes = require('./routes/partnerRoutes')
const orderRoutes = require('./routes/orderRoutes')
const assignmentRoutes = require('./routes/assignmentRoutes')
const areaRoutes = require("./routes/areaRoutes"); 
const errorHandler = require('./utils/errorHandler');


const app = express();

// Middleware
app.use(bodyParser.json());

// CORS Configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL, 
    credentials: true, 
  })
);

// Routes
app.use('/api/partners', partnerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use("/api/areas", areaRoutes);

// Error Handling Middleware (Optional)

app.use(errorHandler);

// Set Port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});