import { User, GradeBookState, GradingResult, GradingInputs } from "../types";

const BASE_URL = ""; // Empty string allows the browser to use relative paths (works for both local and prod)

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

  async getGradebook(): Promise<GradeBookState | null> {
    try {
      const res = await fetch(`/api/grades`);
      if (!res.ok) return null;
      const data = await res.json();
      
      // In a real SaaS, you'd map the flat MongoDB list back into the GradeBookState structure.
      // For now, we return null to trigger local initial state if DB is empty.
      return null; 
    } catch (e) {
      return null;
    }
  },

  async saveGrade(exerciseId: string, studentId: string, result: GradingResult): Promise<void> {
    await fetch(`/api/grades/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exerciseId, studentId, ...result })
    });
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