
import { User, GradeBookState, GradingResult, GradingInputs, ArchiveSession, UserRole, Material } from "../types";

export const apiService = {
  async getCurrentUser(): Promise<User | null> {
    try {
      const res = await fetch(`/api/auth/me`);
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Server responded with error: " + res.status);
      return res.json();
    } catch (e) {
      console.error("apiService.getCurrentUser error:", e);
      return null;
    }
  },

  async devLogin(passcode: string): Promise<User> {
    const res = await fetch(`/api/auth/dev`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || "Dev login failed");
    }
    return res.json();
  },

  async updateUserRole(role: UserRole): Promise<User> {
    const res = await fetch(`/api/user/update-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    if (!res.ok) throw new Error("Update role failed");
    return res.json();
  },

  async enrollInCourse(lecturerId: string): Promise<User> {
    const res = await fetch(`/api/student/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lecturerId })
    });
    if (!res.ok) throw new Error("Enrollment failed");
    return res.json();
  },

  async getStudentWorkspace(): Promise<{ shared: Material[], privateNotes: Material[] }> {
    const res = await fetch(`/api/student/workspace`);
    if (!res.ok) throw new Error("Workspace fetch failed");
    return res.json();
  },

  async studentChat(message: string, sources: Material[]): Promise<{ text: string }> {
    const res = await fetch(`/api/student/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sources })
    });
    if (!res.ok) throw new Error("Chat failed");
    return res.json();
  },

  // Existing Lecturer Methods...
  async evaluate(inputs: GradingInputs): Promise<GradingResult> {
    const res = await fetch(`/api/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs)
    });
    if (!res.ok) throw new Error("Evaluation failed");
    return res.json();
  },

  async getGradebook(): Promise<GradeBookState | null> {
    const res = await fetch(`/api/grades`);
    if (!res.ok) return null;
    return res.json();
  },

  async saveGrade(exerciseId: string, studentId: string, result: GradingResult): Promise<void> {
    await fetch(`/api/grades/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exerciseId, studentId, ...result })
    });
  },

  async getArchives(): Promise<ArchiveSession[]> {
    const res = await fetch(`/api/archives`);
    if (!res.ok) return [];
    return res.json();
  },

  async archiveSession(state: GradeBookState): Promise<void> {
    await fetch(`/api/archives/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state })
    });
  },

  async clearAllData(): Promise<void> {
    await fetch(`/api/grades/clear`, {
      method: 'POST'
    });
  }
};
