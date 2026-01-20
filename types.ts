
export type UserRole = 'lecturer' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
  role?: UserRole;
  enrolledCourseIds?: string[];
}

export interface Course {
  id: string;
  lecturerId: string;
  name: string;
  code: string;
  description?: string;
  schedule?: string;
  instructorName?: string;
  assignedStudentIds: string[]; // Whitelist for access control
  createdAt: Date;
}

export interface Material {
  id: string;
  userId?: string;
  courseId: string;
  title: string;
  content: string;
  folder?: string; // Folder grouping
  isVisible: boolean; // Student visibility toggle
  type: 'lecturer_shared' | 'student_private' | 'student_specific';
  sourceType: 'exercise' | 'note' | 'solution';
  timestamp: Date;
}

export interface GradingResult {
  score: number;
  feedback: string;
}

export interface GradingInputs {
  question: string;
  masterSolution: string;
  rubric: string;
  studentCode: string;
  customInstructions: string;
}

export enum TabOption {
  QUESTION = 'QUESTION',
  SOLUTION = 'SOLUTION',
  RUBRIC = 'RUBRIC',
  STUDENT_ANSWER = 'STUDENT_ANSWER',
  CUSTOM = 'CUSTOM'
}

export interface Student {
  id: string;
  name: string;
  email?: string;
  picture?: string;
}

export interface GradeEntry {
  score: number;
  feedback: string;
}

export interface Exercise {
  id: string;
  name: string;
  maxScore: number;
  entries: { [studentId: string]: GradeEntry };
  question: string;
  masterSolution: string;
  rubric: string;
  customInstructions: string;
}

export interface GradeBookState {
  students: Student[];
  exercises: Exercise[];
}

export interface ArchiveSession {
  _id?: string;
  userId: string;
  courseId?: string;
  timestamp: Date;
  state: GradeBookState;
}
