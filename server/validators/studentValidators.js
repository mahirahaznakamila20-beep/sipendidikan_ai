const { z } = require('zod');

const submitExamSchema = z.object({
  answers: z.any(),
  score: z.number().optional(),
});

const updateStudentProfileSchema = z.object({
  password: z.string().min(6),
});

module.exports = { submitExamSchema, updateStudentProfileSchema };
