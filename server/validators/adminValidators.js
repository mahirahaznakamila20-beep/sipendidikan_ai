const { z } = require('zod');

const createUserSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'guru', 'siswa']),
  school_id: z.string().uuid().optional().nullable(),
  nisn: z.string().min(3).optional(),
  class_id: z.string().uuid().optional().nullable(),
});

const updateUserSchema = z.object({
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['admin', 'guru', 'siswa']).optional(),
  school_id: z.string().uuid().optional().nullable(),
  nisn: z.string().min(3).optional(),
  class_id: z.string().uuid().optional().nullable(),
});

const createSchoolSchema = z.object({
  school_name: z.string().min(2),
  npsn: z.string().min(4),
  principal_name: z.string().optional(),
  principal_nip: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

const createSubjectSchema = z.object({ subject_name: z.string().min(1) });
const createClassSchema = z.object({ class_name: z.string().min(1) });

const createApiKeySchema = z.object({ name: z.string().min(1), api_key: z.string().min(8), active: z.boolean().optional() });

const changeUserRoleSchema = z.object({ role: z.enum(['admin', 'guru', 'siswa']) });

module.exports = {
  createUserSchema,
  updateUserSchema,
  createSchoolSchema,
  createSubjectSchema,
  createClassSchema,
  createApiKeySchema,
  changeUserRoleSchema,
};
