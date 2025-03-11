
const express = require("express");
const { getAssignmentMetrics, getAllAssignmentMetrics, getRecentAssignments, runAssignmentAlgorithm, getAssignmentHistory } = require("../controllers/assignmentController");

const router = express.Router();

router.get("/metrics", getAssignmentMetrics);
router.get("/assignment-metrics-details", getAllAssignmentMetrics);
router.get("/recent-assignments", getRecentAssignments);
router.post("/run", runAssignmentAlgorithm);
router.post("/assigmnent-history", getAssignmentHistory);

module.exports = router;
