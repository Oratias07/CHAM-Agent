
import { User, GradeBookState, GradingResult, GradingInputs, ArchiveSession, UserRole, Material, Course, Exercise } from "../types";

export const apiService = {
  async getCurrentUser(): Promise<User | null> {
    try {
      const res = await fetch(`/api/auth/me`);
      if (res.status === 401) return null;
      return res.json();
    } catch (e) {
      return null;
    }
  },

  async devLogin(passcode: string): Promise<User> {
    const res = await fetch(`/api/auth/dev`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode })
    });
    if (!res.ok) throw new Error("Dev login failed");
    return res.json();
  },

  async updateUserRole(role: UserRole): Promise<User> {
    const res = await fetch(`/api/user/update-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    return res.json();
  },

  async getCourses(): Promise<Course[]> {
    const res = await fetch(`/api/lecturer/courses`);
    return res.json();
  },

  async createCourse(name: string, description: string): Promise<Course> {
    const res = await fetch(`/api/lecturer/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description })
    });
    return res.json();
  },

  async joinCourse(code: string): Promise<User> {
    const res = await fetch(`/api/student/join-course`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    if (!res.ok) throw new Error("Join failed");
    return res.json();
  },

  async getExercises(courseId: string): Promise<Exercise[]> {
    const res = await fetch(`/api/exercises?courseId=${courseId}`);
    return res.json();
  },

  async syncExercises(exercises: Exercise[], courseId: string): Promise<void> {
    await fetch(`/api/exercises/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercises, courseId })
    });
  },

  async getStudentWorkspace(): Promise<{ shared: Material[], privateNotes: Material[] }> {
    const res = await fetch(`/api/student/workspace`);
    return res.json();
  },

  async uploadMaterial(title: string, content: string): Promise<Material> {
    const res = await fetch(`/api/student/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content })
    });
    return res.json();
  },

  async lecturerUploadMaterial(courseId: string, title: string, content: string): Promise<Material> {
    const res = await fetch(`/api/lecturer/upload-material`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, title, content })
    });
    return res.json();
  },

  async studentChat(message: string, sources: Material[], task?: string): Promise<{ text: string }> {
    const res = await fetch(`/api/student/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sources, task })
    });
    return res.json();
  },

  async evaluate(inputs: GradingInputs): Promise<GradingResult> {
    const res = await fetch(`/api/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs)
    });
    return res.json();
  },

  async getGradebook(): Promise<GradeBookState | null> {
    const res = await fetch(`/api/grades`);
    if (!res.ok) return null;
    return res.json();
  },

  async saveGrade(exerciseId: string, studentId: string, result: GradingResult, courseId?: string): Promise<void> {
    await fetch(`/api/grades/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exerciseId, studentId, courseId, ...result })
    });
  },

  async getArchives(): Promise<ArchiveSession[]> {
    const res = await fetch(`/api/archives`);
    return res.json();
  },

  async archiveSession(state: GradeBookState, courseId?: string): Promise<void> {
    await fetch(`/api/archives/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, courseId })
    });
  },

  async clearAllData(courseId?: string): Promise<void> {
    await fetch(`/api/grades/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId })
    });
  }
};
