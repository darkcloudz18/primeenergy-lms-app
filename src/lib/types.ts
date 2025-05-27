// src/lib/types.ts

export interface Course {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: "student" | "tutor" | "admin";
  created_at: string;
}

export type Lesson = {
  id: string;
  course_id: string;
  title: string;
  content: string;
  type: "article" | "video" | "image";
  ordering: number;
  created_at: string;
};

/**
 * A lighter-weight shape for building new lessons in the form.
 * You can omit `id`, `course_id`, `ordering` here
 * and assign them server-side when you insert into the DB.
 */
export type LessonInput = {
  title: string;
  content: string;
  type: "article" | "video" | "image";
};

/**
 * The data your CourseForm will collect:
 * – title, description
 * – a File for the cover image (to upload separately)
 * – an array of LessonInput
 */
export interface CourseFormData {
  title: string;
  description: string;
  coverFile: File | null;
  lessons: LessonInput[];
}

export type QuestionType =
  | "true_false"
  | "single_choice"
  | "multiple_choice"
  | "open_ended";

export type AnswerValue =
  | boolean // for True/False
  | string // for open‐ended, single‐choice, fill‐in‐the‐blank
  | string[]; // for multiple‐choice (multiple answers)

export interface QuizQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  correctAnswer?: AnswerValue;
  explanation?: string;
}

export interface Quiz {
  id: string; // client-side UUID
  title: string;
  summary: string;
  questions: QuizQuestion[];
  randomizeQuestions: boolean;
  showPoints: boolean;
  // …any other per-quiz settings
}

export interface CertificateConfig {
  enabled: boolean;
  title: string;
  footerText?: string;
}

export interface CoursePayload {
  /* your existing fields… */
  lessons: LessonInput[];
  quizzes: Quiz[];
  certificate: CertificateConfig;
}

// New quiz and assessment types
export interface QuizEntity {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  passing_score: number;
  created_at: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  prompt_html: string;
  ordering: number;
  created_at: string;
}

export interface Option {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
  ordering: number;
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  started_at: string;
  finished_at?: string;
  total_score: number;
  passed: boolean;
}

export interface QuestionResponse {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_id?: string;
  answer_text?: string;
  is_correct: boolean;
  score_awarded: number;
}

export interface CertificateIssued {
  id: string;
  attempt_id: string;
  issued_at: string;
  certificate_url?: string;
}
