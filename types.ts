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
  STUDENT_CODE = 'STUDENT_CODE',
  CUSTOM = 'CUSTOM'
}

// GradeBook Types

export interface Student {
  id: string;
  name: string;
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
}

export interface GradeBookState {
  students: Student[];
  exercises: Exercise[];
}
