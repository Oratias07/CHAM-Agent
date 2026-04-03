
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
  deductions?: Deduction[];
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

export type QuestionType = 'objective' | 'creative' | 'open-ended' | 'algorithmic';
export type CodeLanguage = 'python' | 'javascript' | 'java' | 'c' | 'cpp';
export type AssessmentStatus = 'pending' | 'testing' | 'semantic_analysis' | 'awaiting_review' | 'graded';

export interface UnitTest {
  input: string;
  expected_output: string;
  test_type: 'equality' | 'contains' | 'range' | 'regex' | 'exception';
  description: string;
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
  // CHAM fields
  language?: CodeLanguage;
  question_type?: QuestionType;
  requires_human_review?: boolean;
  unit_tests?: UnitTest[];
}

export interface RoutingTrigger {
  type: string;
  reason?: string;
  [key: string]: any;
}

export interface CHAMResult {
  status: AssessmentStatus;
  layer1?: {
    score: number | null;
    total_tests: number;
    passed: number;
    security_blocked?: boolean;
  };
  layer2_score?: number | null;
  final_score?: number;
  feedback?: string;
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
  extensionUntil?: Date;
  // CHAM fields
  assessment_status?: AssessmentStatus;
  final_score?: number;
  routing_decision?: {
    requires_human: boolean;
    triggers: RoutingTrigger[];
    decided_at?: Date;
  };
  feedback_released?: boolean;
  deductions?: Deduction[];
  cham?: CHAMResult;
}

export interface CriterionScore {
  score: number;
  feedback: string;
  big_o?: string;
}

export interface Deduction {
  codeQuote: string;
  requirement: string;
  pointsLost: number;
}

export interface AssessmentLayerData {
  id: string;
  submission_id: string;
  layer1?: {
    score: number | null;
    test_results: any[];
    total_tests: number;
    passed: number;
    execution_time?: number;
    errors: string[];
    security_blocked: boolean;
  };
  layer2?: {
    score: number | null;
    criteria_breakdown?: {
      code_quality: CriterionScore;
      documentation: CriterionScore;
      complexity: CriterionScore;
      error_handling: CriterionScore;
      best_practices: CriterionScore;
    };
    confidence: number;
    feedback: string;
    flags_for_human_review: string[];
    model_used: string;
    injection_detected?: boolean;
    deductions?: Deduction[];
  };
  layer3?: {
    required: boolean;
    triggers: RoutingTrigger[];
    human_score?: number;
    reviewer_id?: string;
    reviewed_at?: Date;
    comments?: string;
  };
  final_score?: number;
  auto_score?: number;
  created_at: Date;
}

export interface ReviewQueueItem {
  id: string;
  submission_id: string;
  student_id: string;
  question_id: string;
  course_id: string;
  added_at: Date;
  priority: number;
  auto_score: number;
  triggers: RoutingTrigger[];
  reviewed: boolean;
  // Enriched fields from API
  submission?: Submission;
  assignment?: { title: string; question: string };
  assessment?: AssessmentLayerData;
  student?: { name: string; picture?: string };
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
