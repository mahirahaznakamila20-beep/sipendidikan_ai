const { z } = require('zod');

const optionalPassword = z.union([z.string().min(6), z.literal('')]).optional().transform((value) => {
  if (value === '') return undefined;
  return value;
});

const createStudentSchema = z.object({
  student_name: z.string().min(2),
  nisn: z.string().min(4),
  password: optionalPassword,
  class_id: z.string().optional().nullable(),
});

const updateStudentSchema = z.object({
  student_name: z.string().min(2).optional(),
  nisn: z.string().min(4).optional(),
  password: optionalPassword,
  class_id: z.string().optional().nullable(),
});

const createQuestionSchema = z.object({
  subject_id: z.string().uuid(),
  class_id: z.string().uuid().optional().nullable(),
  question_type: z.string().min(3),
  question_text: z.string().min(1),
  options_json: z.any().optional().nullable(),
  answer_key: z.string().optional().nullable(),
  explanation: z.string().optional().nullable(),
  bloom_level: z.string().optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  package_id: z.string().uuid().optional().nullable(),
  package_name: z.string().optional().nullable(),
  points: z.number().int().positive().optional(),
});

const generateAISchema = z.object({
  subject_id: z.string().uuid(),
  class_id: z.string().uuid().optional().nullable(),
  topics: z.array(z.string().min(1)).nonempty(),
  choices: z.number().min(0),
  complex: z.number().min(0),
  fill: z.number().min(0),
  essay: z.number().min(0),
  image_ratio: z.number().min(0).max(100).optional(),
  difficulty: z.enum(['mudah', 'sedang', 'tinggi']).optional(),
  custom_prompt: z.string().optional().nullable(),
  duration_minutes: z.number().min(1).optional().nullable(),
  random_soal: z.boolean().optional(),
  random_opsi: z.boolean().optional(),
  auto_submit: z.boolean().optional(),
  show_realtime_score: z.boolean().optional(),
});

const createExamSchema = z.object({
  title: z.string().min(3),
  class_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  package_id: z.string().uuid(),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  description: z.string().optional().nullable(),
  randomized: z.boolean().optional(),
  randomize_options: z.boolean().optional(),
  auto_submit: z.boolean().optional(),
  show_realtime_score: z.boolean().optional(),
});

module.exports = {
  createStudentSchema,
  updateStudentSchema,
  createQuestionSchema,
  generateAISchema,
  createExamSchema,
};
