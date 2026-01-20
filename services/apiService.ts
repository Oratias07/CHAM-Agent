
import { User, GradeBookState, GradingResult, GradingInputs, ArchiveSession, UserRole, Material, Course, Exercise, Student } from "../types";

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
};

export const apiService = {
  async getCurrentUser(): Promise<User | null> {
    try {
      const res = await fetch(`/api/auth/me`);
      return res.status === 401 ? null : res.json();
    } catch {
      return null;
    }
  },

  async devLogin(passcode: string): Promise<User> {
    const res = await fetch(`/api/auth/dev`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode })
    });
    return handleResponse(res);
  },

  async updateUserRole(role: UserRole): Promise<User> {
    const res = await fetch(`/api/user/update-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    return handleResponse(res);
  },

  async getCourses(): Promise<Course[]> {
    const res = await fetch(`/api/lecturer/courses`);
    return handleResponse(res);
  },

  async getAllStudents(): Promise<Student[]> {
    const res = await fetch(`/api/lecturer/all-students`);
    return handleResponse(res);
  },

  async createCourse(name: string, description: string, schedule?: string, instructorName?: string): Promise<Course> {
    const res = await fetch(`/api/lecturer/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, schedule, instructorName })
    });
    return handleResponse(res);
  },

  async updateCourse(id: string, data: Partial<Course>): Promise<Course> {
    const res = await fetch(`/api/lecturer/courses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteCourse(id: string): Promise<void> {
    const res = await fetch(`/api/lecturer/courses/${id}`, { method: 'DELETE' });
    await handleResponse(res);
  },

  async joinCourse(code: string): Promise<User> {
    const res = await fetch(`/api/student/join-course`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    return handleResponse(res);
  },

  async getExercises(courseId: string): Promise<Exercise[]> {
    const res = await fetch(`/api/exercises?courseId=${courseId}`);
    return handleResponse(res);
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
    return handleResponse(res);
  },

  async lecturerUploadMaterial(courseId: string, title: string, content: string, folder?: string): Promise<Material> {
    const res = await fetch(`/api/lecturer/upload-material`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, title, content, folder })
    });
    return handleResponse(res);
  },

  async updateMaterialVisibility(id: string, isVisible: boolean): Promise<Material> {
    const res = await fetch(`/api/lecturer/materials/${id}/visibility`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isVisible })
    });
    return handleResponse(res);
  },

  async deleteMaterial(id: string): Promise<void> {
    const res = await fetch(`/api/lecturer/materials/${id}`, { method: 'DELETE' });
    await handleResponse(res);
  },

  async studentChat(message: string, sources: Material[], task?: string): Promise<{ text: string }> {
    const res = await fetch(`/api/student/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sources, task })
    });
    return handleResponse(res);
  },

  async evaluate(inputs: GradingInputs): Promise<GradingResult> {
    const res = await fetch(`/api/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs)
    });
    return handleResponse(res);
  },

  async saveGrade(exerciseId: string, studentId: string, result: GradingResult, courseId?: string): Promise<void> {
    const res = await fetch(`/api/grades/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exerciseId, studentId, courseId, ...result })
    });
    await handleResponse(res);
  },

  async getArchives(): Promise<ArchiveSession[]> {
    const res = await fetch(`/api/archives`);
    return handleResponse(res);
  },

  async archiveSession(state: GradeBookState, courseId?: string): Promise<void> {
    const res = await fetch(`/api/archives/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, courseId })
    });
    await handleResponse(res);
  },

  async clearAllData(courseId?: string): Promise<void> {
    const res = await fetch(`/api/grades/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId })
    });
    await handleResponse(res);
  }
};
