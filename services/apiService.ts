import { User, GradeBookState, GradingResult, GradingInputs, Exercise } from "../types";
import { INITIAL_GRADEBOOK_STATE } from "../constants";

export const apiService = {
  async getCurrentUser(): Promise<User | null> {
    try {
      const res = await fetch(`/api/auth/me`);
      if (!res.ok) return null;
      return res.json();
    } catch (e) {
      return null;
    }
  },

  /**
   * Fetches saved grades and reconstructs the GradeBookState
   */
  async getGradebook(): Promise<GradeBookState | null> {
    try {
      const res = await fetch(`/api/grades`);
      if (!res.ok) return null;
      const dbGrades = await res.json();
      
      if (!dbGrades || dbGrades.length === 0) return null;

      // Reconstruct the nested state from the flat MongoDB array
      const state: GradeBookState = {
        students: [...INITIAL_GRADEBOOK_STATE.students],
        exercises: [...INITIAL_GRADEBOOK_STATE.exercises]
      };

      dbGrades.forEach((g: any) => {
        let exercise = state.exercises.find(ex => ex.id === g.exerciseId);
        
        // If the exercise doesn't exist in our current state, we need to add it
        if (!exercise) {
          exercise = {
            id: g.exerciseId,
            name: `Restored ${g.exerciseId}`,
            maxScore: 10,
            entries: {},
            question: '',
            masterSolution: '',
            rubric: '',
            customInstructions: ''
          };
          state.exercises.push(exercise);
        }

        // Add the grade entry
        exercise.entries[g.studentId] = {
          score: g.score,
          feedback: g.feedback
        };

        // Also ensure the student exists in the students list
        if (!state.students.find(s => s.id === g.studentId)) {
          state.students.push({ id: g.studentId, name: `Student ${g.studentId}` });
        }
      });

      return state;
    } catch (e) {
      console.error("Error loading gradebook", e);
      return null;
    }
  },

  async saveGrade(exerciseId: string, studentId: string, result: GradingResult): Promise<void> {
    try {
      await fetch(`/api/grades/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId, studentId, ...result })
      });
    } catch (e) {
      console.error("Failed to save grade", e);
    }
  },

  async clearAllData(): Promise<void> {
    try {
      const res = await fetch(`/api/grades/clear`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error("Failed to clear data on server");
    } catch (e) {
      console.error("Error clearing data:", e);
      throw e;
    }
  },

  async evaluate(inputs: GradingInputs): Promise<GradingResult> {
    const res = await fetch(`/api/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs)
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || "Server evaluation failed");
    }
    return res.json();
  }
};