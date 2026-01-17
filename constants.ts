import { GradeBookState } from "./types";

export const DEFAULT_QUESTION = ``;
export const DEFAULT_SOLUTION = ``;
export const DEFAULT_RUBRIC = ``;
export const DEFAULT_STUDENT_CODE = ``;
export const DEFAULT_CUSTOM_INSTRUCTIONS = ``;

export const INITIAL_GRADEBOOK_STATE: GradeBookState = {
  students: Array.from({ length: 13 }, (_, i) => ({ 
    id: `student-${i + 1}`, 
    name: `Student ${i + 1}` 
  })),
  exercises: [
    {
      id: 'ex-1',
      name: 'Exercise 1',
      maxScore: 10,
      entries: {},
      question: '',
      masterSolution: '',
      rubric: '',
      customInstructions: ''
    }
  ]
};