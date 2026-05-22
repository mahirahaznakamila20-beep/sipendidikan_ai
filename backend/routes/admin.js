const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/role');
const validate = require('../middlewares/validate');
const tenant = require('../middlewares/tenant');
const controller = require('../controllers/adminController');
const {
  createUserSchema,
  updateUserSchema,
  createSchoolSchema,
  createSubjectSchema,
  createClassSchema,
  createApiKeySchema,
  changeUserRoleSchema,
} = require('../validators/adminValidators');

router.use(authenticate, authorize(['admin']));

router.get('/schools', controller.listSchools);
router.post('/schools', validate(createSchoolSchema), controller.createSchool);
router.put('/schools/:id', tenant('schools'), validate(createSchoolSchema), controller.updateSchool);
router.delete('/schools/:id', tenant('schools'), controller.deleteSchool);

router.get('/users', controller.listUsers);
router.post('/users', validate(createUserSchema), controller.createUser);
router.put('/users/:id', tenant('users'), validate(updateUserSchema), controller.updateUser);
router.delete('/users/:id', tenant('users'), controller.deleteUser);
router.patch('/users/:id/role', tenant('users'), validate(changeUserRoleSchema), controller.changeUserRole);

router.get('/subjects', controller.listSubjects);
router.post('/subjects', validate(createSubjectSchema), controller.createSubject);
router.put('/subjects/:id', validate(createSubjectSchema), controller.updateSubject);
router.delete('/subjects/:id', controller.deleteSubject);

router.get('/classes', controller.listClasses);
router.post('/classes', validate(createClassSchema), controller.createClass);
router.put('/classes/:id', validate(createClassSchema), controller.updateClass);
router.delete('/classes/:id', controller.deleteClass);

router.get('/api-keys', controller.listApiKeys);
router.post('/api-keys', validate(createApiKeySchema), controller.createApiKey);
router.put('/api-keys/:id', validate(createApiKeySchema), controller.updateApiKey);
router.patch('/api-keys/:id/toggle', controller.toggleApiKey);

module.exports = router;
