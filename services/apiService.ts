import { User, GradeBookState, GradingResult, GradingInputs, ArchiveSession } from "../types";
import { INITIAL_GRADEBOOK_STATE } from "../constants";

// Mock user for local development
const MOCK_USER: User = {
  id: "dev-12345",
  name: "Dev Instructor",
  email: "dev@example.edu",
  picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=dev"
};

const isDevMode = () => localStorage.getItem('ST_DEV_MODE') === 'true';

export const apiService = {
  async getCurrentUser(): Promise<User | null> {
    if (isDevMode()) return MOCK_USER;
    try {
      const res = await fetch(`/api/auth/me`);
      if (!res.ok) return null;
      return res.json();
    } catch (e) {
      return null;
    }
  },

  async getGradebook(): Promise<GradeBookState | null> {
    if (isDevMode()) {
      const stored = localStorage.getItem('ST_MOCK_GRADES');
      return stored ? JSON.parse(stored) : INITIAL_GRADEBOOK_STATE;
    }
    try {
      const res = await fetch(`/api/grades`);
      if (!res.ok) return null;
      const dbGrades = await res.json();
      if (!dbGrades || dbGrades.length === 0) return null;
      const state: GradeBookState = {
        students: [...INITIAL_GRADEBOOK_STATE.students],
        exercises: [...INITIAL_GRADEBOOK_STATE.exercises]
      };
      dbGrades.forEach((g: any) => {
        let exercise = state.exercises.find(ex => ex.id === g.exerciseId);
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
        exercise.entries[g.studentId] = { score: g.score, feedback: g.feedback };
      });
      return state;
    } catch (e) {
      return null;
    }
  },

  async saveGrade(exerciseId: string, studentId: string, result: GradingResult): Promise<void> {
    if (isDevMode()) {
      const current = await this.getGradebook() || INITIAL_GRADEBOOK_STATE;
      const ex = current.exercises.find(e => e.id === exerciseId);
      if (ex) {
        ex.entries[studentId] = result;
        localStorage.setItem('ST_MOCK_GRADES', JSON.stringify(current));
      }
      return;
    }
    try {
      await fetch(`/api/grades/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId, studentId, ...result })
      });
    } catch (e) {}
  },

  async archiveSession(state: GradeBookState): Promise<void> {
    if (isDevMode()) {
      const archives = JSON.parse(localStorage.getItem('ST_MOCK_ARCHIVES') || '[]');
      archives.push({ _id: Date.now().toString(), timestamp: new Date(), state });
      localStorage.setItem('ST_MOCK_ARCHIVES', JSON.stringify(archives));
      return;
    }
    try {
      await fetch(`/api/archives/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state })
      });
    } catch (e) {
      console.error("Archive failed", e);
    }
  },

  async getArchives(): Promise<ArchiveSession[]> {
    if (isDevMode()) {
      return JSON.parse(localStorage.getItem('ST_MOCK_ARCHIVES') || '[]');
    }
    try {
      const res = await fetch(`/api/archives`);
      if (!res.ok) return [];
      return res.json();
    } catch (e) {
      return [];
    }
  },

  async clearAllData(): Promise<void> {
    if (isDevMode()) {
      localStorage.removeItem('ST_MOCK_GRADES');
      return;
    }
    await fetch(`/api/grades/clear`, { method: 'DELETE' });
  },

  async evaluate(inputs: GradingInputs): Promise<GradingResult> {
    if (isDevMode()) {
      await new Promise(r => setTimeout(r, 1000));
      return {
        score: Math.floor(Math.random() * 3) + 8,
        feedback: "הקוד מצוין. שים לב לשימוש ב-scanf. כל הכבוד על ההערות."
      };
    }
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