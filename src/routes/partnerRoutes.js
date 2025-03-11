const express = require('express');
const {
  getPartners,
  getAllPartners,
  createPartner,
  updatePartner,
  deletePartner,
  getAvailablePartners,
  getDeliveryPartnerMetrics
} = require('../controllers/partnerController');

const router = express.Router();

router.get('/get-partner', getPartners);
router.get('/', getAllPartners);
router.post('/', createPartner);
router.get('/available', getAvailablePartners);
router.put('/:id', updatePartner);
router.delete('/:id', deletePartner);
router.delete('/:partner-metrics', getDeliveryPartnerMetrics);

module.exports = router;