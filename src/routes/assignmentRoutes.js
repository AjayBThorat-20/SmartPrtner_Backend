
const express = require("express");
const { getAllAssignmentMetrics, getFilteredAssignmentMetrics, getRecentAssignments, runAssignmentAlgorithm } = require("../controllers/assignmentController");

const router = express.Router();

router.get("/metrics", getAllAssignmentMetrics);
router.get("/assignment-metrics-details", getFilteredAssignmentMetrics);
router.get("/recent-assignments", getRecentAssignments);
router.post("/run", runAssignmentAlgorithm);

module.exports = router;
