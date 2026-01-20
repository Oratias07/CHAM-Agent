
import { User, GradingInputs, GradingResult, Material, Course, Student, UserRole } from "../types";

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
    } catch { return null; }
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

  // Course Management
  async getCourses(): Promise<Course[]> {
    const res = await fetch(`/api/lecturer/courses`);
    return handleResponse(res);
  },

  async createCourse(data: Partial<Course>): Promise<Course> {
    const res = await fetch(`/api/lecturer/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
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

  // Enrollment Waitlist
  async getWaitlist(courseId: string): Promise<{ pending: Student[], enrolled: Student[] }> {
    const res = await fetch(`/api/lecturer/courses/${courseId}/waitlist`);
    return handleResponse(res);
  },

  async approveStudent(courseId: string, studentId: string): Promise<void> {
    const res = await fetch(`/api/lecturer/courses/${courseId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId })
    });
    await handleResponse(res);
  },

  async rejectStudent(courseId: string, studentId: string): Promise<void> {
    const res = await fetch(`/api/lecturer/courses/${courseId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId })
    });
    await handleResponse(res);
  },

  async removeStudent(courseId: string, studentId: string): Promise<void> {
    const res = await fetch(`/api/lecturer/courses/${courseId}/remove-student`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId })
    });
    await handleResponse(res);
  },

  // Student Actions
  async joinCourseRequest(code: string): Promise<{ message: string }> {
    const res = await fetch(`/api/student/join-course`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    return handleResponse(res);
  },

  async studentChat(courseId: string, message: string): Promise<{ text: string }> {
    const res = await fetch(`/api/student/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, message })
    });
    return handleResponse(res);
  },

  // Materials
  async getMaterials(courseId: string): Promise<Material[]> {
    const res = await fetch(`/api/lecturer/courses/${courseId}/materials`);
    return handleResponse(res);
  },

  async addMaterial(data: Partial<Material>): Promise<Material> {
    const res = await fetch(`/api/lecturer/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateMaterial(id: string, data: Partial<Material>): Promise<Material> {
    const res = await fetch(`/api/lecturer/materials/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteMaterial(id: string): Promise<void> {
    const res = await fetch(`/api/lecturer/materials/${id}`, { method: 'DELETE' });
    await handleResponse(res);
  },

  // Evaluation
  async evaluate(inputs: GradingInputs): Promise<GradingResult> {
    const res = await fetch(`/api/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs)
    });
    return handleResponse(res);
  }
};
