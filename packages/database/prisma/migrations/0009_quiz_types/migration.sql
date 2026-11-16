-- Multiple-select questions ("select all that apply") and true/false quizzes
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'MULTIPLE_SELECT';
ALTER TYPE "QuizType" ADD VALUE IF NOT EXISTS 'MULTIPLE_SELECT';
ALTER TYPE "QuizType" ADD VALUE IF NOT EXISTS 'TRUE_FALSE';
