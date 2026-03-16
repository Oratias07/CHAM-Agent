
export type UserRole = 'lecturer' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
  role?: UserRole;
  enrolledCourseIds?: string[];
  unseenApprovals?: number;
  activeCourse?: Course;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: Date;
  isRead: boolean;
  replyTo?: string; // ID of the message being replied to
  replyText?: string; // Text of the message being replied to (for quick display)
  isEdited?: boolean;
  deletedFor?: string[]; // Array of user IDs who deleted this message for themselves
  deletedForAll?: boolean;
}

export interface Archive {
  id: string;
  lecturerId: string;
  sessionName: string;
  courseId: string;
  data: GradeBookState;
  timestamp: Date;
  stats: {
    avgScore: number;
    totalSubmissions: number;
    distribution: { [key: string]: number };
  };
}

export interface Course {
  id: string;
  lecturerId: string;
  lecturerName: string;
  lecturerPicture?: string;
  name: string;
  code: string;
  description: string;
  schedule?: string;
  instructorName?: string;
  enrolledStudentIds: string[];
  pendingStudentIds: string[];
  createdAt: Date;
  enrolledCount?: number;
  materialsCount?: number;
}

export interface Material {
  id: string;
  userId?: string;
  courseId: string;
  title: string;
  content: string;
  folder?: string; 
  isVisible: boolean; 
  type: 'lecturer_shared' | 'student_private';
  ownerId?: string;
  timestamp: Date;
  viewedBy?: string[]; // Track student IDs who opened the file
  fileName?: string;
  fileType?: string;
  fileSize?: number;
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
  status?: 'pending' | 'enrolled';
}

export interface GradeEntry {
  score: number;
  feedback: string;
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  question: string;
  masterSolution: string;
  rubric: string;
  customInstructions?: string;
  maxScore: number;
  openDate: Date;
  dueDate: Date;
  createdAt: Date;
}

export interface Submission {
  id: string;
  assignmentId: string;
  courseId: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  score?: number;
  feedback?: string;
  timestamp: Date;
  status: 'pending' | 'evaluated';
  extensionUntil?: Date; // For special permission
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
