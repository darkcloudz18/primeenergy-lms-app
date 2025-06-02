// src/lib/types.ts

// ─── Course + Related Types ────────────────────────────────────────────
// (all fields must line up exactly with your DB columns)

export interface Course {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;

  // “category”, “level” and “tag” were added later:
  category: string | null;
  level: string | null;
  tag: string | null;

  created_at: string;
}

export interface CourseWithModules {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;

  category: string | null;
  level: string | null;
  tag: string | null;

  created_at: string;

  // embedded modules-with-lessons
  modules: ModuleWithLessons[];
}

// ─── Module + Lesson Types ────────────────────────────────────────────

// “Module” rows live in a separate “modules” table in the DB:
export interface Module {
  id: string;
  course_id: string; // foreign key back to Course.id
  title: string;
  ordering: number;
  created_at: string; // if you have a created_at column there
}

// Each lesson belongs to exactly one “module”:
export interface Lesson {
  id: string;
  module_id: string; // foreign key back to Module.id
  title: string;
  content: string; // HTML or markdown, whatever you store
  type: "article" | "video" | "image";
  ordering: number;
  image_url: string | null;
  created_at: string;
}

/**
 * If you fetch “modules + lessons” from the DB in one go, you’ll shape it like this:
 */
export type ModuleWithLessons = {
  id: string;
  title: string;
  ordering: number;
  lessons: Lesson[];
};

// ─── Form / Client‐side Helper Types ───────────────────────────────────

// When you build a new Lesson on the client‐side form, you omit IDs/ordering:
export type LessonInput = {
  title: string;
  content: string;
  type: "article" | "video" | "image";
  // you’ll compute `ordering` server‐side and set `module_id` when you insert
};

export interface QuizFormData {
  title: string;
  description: string;
  passing_score: number;
  questions: {
    prompt_html: string;
    type: "multiple_choice" | "true_false" | "short_answer";
    options: { text: string; is_correct: boolean }[];
  }[];
}

export interface QuizFormProps {
  initialQuiz: QuizFormData;
  onSubmit: (q: QuizFormData) => void;
  onCancel: () => void;
}

// Each question in the form:
export interface QuizQuestionInput {
  prompt_html: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  options: QuizOptionInput[];
}

// Each option in the form:
export interface QuizOptionInput {
  text: string;
  is_correct: boolean;
}

// What your Course‐creation form sends up (including file, quizzes, etc.):
export interface CourseFormData {
  title: string;
  description: string;
  coverFile: File | null;
  lessons: LessonInput[];
  // …if you add modules/quizzes, you’d extend this shape
}

// ─── Quiz & Assessment Types ───────────────────────────────────────────

// “QuizEntity” lives in a separate “quizzes” table, pointing back at a course:
export interface QuizEntity {
  id: string;
  course_id: string; // foreign key back to Course.id
  title: string;
  description?: string; // optional text about the quiz
  passing_score: number;
  created_at: string;
}

// Each quiz has multiple questions:
export interface Question {
  id: string;
  quiz_id: string; // foreign key back to QuizEntity.id
  prompt_html: string;
  question_type: "multiple_choice" | "true_false" | "short_answer";
  ordering: number;
  created_at: string;
}

// For multiple‐choice or true/false questions you have options:
export interface Option {
  id: string;
  question_id: string; // foreign key back to Question.id
  text: string;
  is_correct: boolean;
  ordering: number;
  created_at: string;
}

// When a student starts a quiz, you record an “attempt”:
export interface QuizAttempt {
  id: string;
  quiz_id: string; // which quiz they are taking
  user_id: string; // who is taking it
  started_at: string;
  finished_at?: string; // only after they submit
  total_score: number;
  passed: boolean;
  created_at: string;
}

// For each question in the quiz, they give a response:
export interface QuestionResponse {
  id: string;
  attempt_id: string; // foreign key back to QuizAttempt.id
  question_id: string; // which question
  selected_option_id?: string;
  answer_text?: string; // for short_answer questions
  is_correct: boolean;
  score_awarded: number;
  created_at: string;
}

// If you issue a certificate after a passing quiz, you record it here:
export interface CertificateIssued {
  id: string;
  attempt_id: string; // foreign key back to QuizAttempt.id
  issued_at: string;
  certificate_url?: string;
  created_at: string;
}

// ─── User Profile Type ─────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  role: "student" | "tutor" | "admin";
  created_at: string;
}
