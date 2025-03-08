const express = require("express");
const {
  createArea,
  getAllAreas,
  updateArea,
  deleteArea,
} = require("../controllers/areaController");

const router = express.Router();

router.post("/", createArea); // Create an area
router.get("/", getAllAreas); // Get all areas
router.put("/:id", updateArea); // Update an area by ID
router.delete("/:id", deleteArea); // Delete an area by ID

module.exports = router;
