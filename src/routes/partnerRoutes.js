const express = require('express');
const {
  getAllPartners,
  createPartner,
  updatePartner,
  deletePartner,
  getAvailablePartners
} = require('../controllers/partnerController');

const router = express.Router();

router.get('/', getAllPartners);
router.post('/', createPartner);
router.get('/available', getAvailablePartners);
router.put('/:id', updatePartner);
router.delete('/:id', deletePartner);

module.exports = router;