const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/role');
const tenant = require('../middlewares/tenant');
const validate = require('../middlewares/validate');
const controller = require('../controllers/teacherController');
const { createStudentSchema, updateStudentSchema, createQuestionSchema, createExamSchema, generateAISchema } = require('../validators/teacherValidators');

router.use(authenticate, authorize(['guru']));

router.get('/school', controller.getSchoolProfile);
router.put('/school', controller.updateSchoolProfile);
router.get('/profile', controller.getTeacherProfile);
router.put('/profile', controller.updateTeacherProfile);

router.get('/students', controller.listStudents);
router.post('/students', validate(createStudentSchema), controller.createStudent);
router.post('/students/import', upload.single('file'), controller.importStudents);
router.put('/students/:id', tenant('students'), validate(updateStudentSchema), controller.updateStudent);
router.delete('/students/:id', tenant('students'), controller.deleteStudent);

router.get('/subjects', controller.listSubjects);
router.get('/classes', controller.listClasses);

router.get('/bank', controller.listQuestionBanks);
router.get('/bank/packages', controller.listQuestionPackages);
router.post('/bank', validate(createQuestionSchema), controller.createQuestion);
router.put('/bank/:id', tenant('question_banks'), validate(createQuestionSchema), controller.updateQuestion);
router.delete('/bank/:id', tenant('question_banks'), controller.deleteQuestion);
router.get('/bank/:id', tenant('question_banks'), controller.previewQuestion);
router.post('/bank/generate', controller.generateQuestions);
router.post('/bank/import', upload.single('file'), controller.importQuestions);
router.post('/bank/import-ai', controller.importAIQuestions);
router.post('/bank/upload-image', upload.single('image'), controller.uploadQuestionImage);

router.post('/ai/generate', validate(generateAISchema), controller.generateQuestions);

router.post('/exams', validate(createExamSchema), controller.createExam);
router.get('/exams', controller.listExams);

module.exports = router;
