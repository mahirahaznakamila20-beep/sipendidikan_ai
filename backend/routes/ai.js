const express = require('express');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/role');
const { generateQuestionBank } = require('../services/groqService');
const { error, success } = require('../utils/response');

const router = express.Router();
router.use(authenticate, authorize(['guru', 'admin']));

router.post('/generate', async (req, res) => {
  try {
    const { subject, topic, choices, complex, fill, essay, image_ratio } = req.body;
    const result = await generateQuestionBank({ subject, topic, choices, complex, fill, essay, imageRatio: image_ratio });
    return success(res, { result });
  } catch (err) {
    return error(res, err.message || 'AI generation failed', 500);
  }
});

module.exports = router;
