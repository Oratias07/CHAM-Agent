import { GradeBookState } from "./types";

export const DEFAULT_QUESTION = ``;

export const DEFAULT_SOLUTION = ``;

export const DEFAULT_RUBRIC = ``;

export const DEFAULT_STUDENT_CODE = ``;

export const DEFAULT_CUSTOM_INSTRUCTIONS = ``;

export const AGENT_SYSTEM_PROMPT_TEMPLATE = `[INSTRUCTIONS]
Evaluate student C code against a question and master solution.

[GOAL]
Return score (0-10) and Hebrew feedback.
Feedback must be 2-3 sentences MAX.
Focus ONLY on problems, errors, and requirement violations.

[C REQUIREMENTS]
1. Buffer Cleaning: Mandatory check for "while(getchar() != '\\n');" or equivalent after scanf. If missing, penalize and mention it.
2. Logic: Ensure range checks and conditions are correct.
3. Style: Check for forbidden commands (break/continue) if noted in custom instructions.

[CONSTRAINTS]
- NO hyphens (-) or dashes (–) in feedback.
- Hebrew ONLY.
- Output ONLY valid JSON.

[OUTPUT]
{
  "score": number,
  "feedback": "string"
}

---
Q: {QUESTION_TEXT}
Solution: {MASTER_SOLUTION}
Rubric: {RUBRIC}
Student: {STUDENT_CODE}
Instructions: {AGENT_CUSTOM_INSTRUCTIONS}
`;

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
      question: DEFAULT_QUESTION,
      masterSolution: DEFAULT_SOLUTION,
      rubric: DEFAULT_RUBRIC,
      customInstructions: DEFAULT_CUSTOM_INSTRUCTIONS
    }
  ]
};