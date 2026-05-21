const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/role');
const validate = require('../middlewares/validate');
const tenant = require('../middlewares/tenant');
const controller = require('../controllers/studentController');
const { submitExamSchema, updateStudentProfileSchema } = require('../validators/studentValidators');

const router = express.Router();
router.use(authenticate, authorize(['siswa']));

router.get('/profile', controller.getStudentProfile);
router.put('/profile', validate(updateStudentProfileSchema), controller.updateStudentProfile);
router.get('/modules', controller.listModules);
router.get('/assignments', controller.listAssignments);
router.post('/assignments/:assignment_id/submit', tenant('assignments', 'assignment_id', 'id'), upload.single('file'), controller.submitAssignment);
router.get('/exams', controller.listExamPackages);
router.get('/exams/token/:token', controller.getExamByToken);
router.post('/exams/:examId/submit', tenant('exams', 'examId', 'id'), validate(submitExamSchema), controller.submitExam);
router.get('/results', controller.getExamResults);

module.exports = router;
