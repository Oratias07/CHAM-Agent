
import { User, GradingInputs, GradingResult, Material, Course, Student, UserRole, DirectMessage, Archive } from "../types";

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

  async getLecturerDashboardData(): Promise<{ courses: Course[], archives: Archive[] }> {
    const res = await fetch(`/api/lecturer/dashboard-init`);
    return handleResponse(res);
  },

  async getLecturerSync(): Promise<{ pendingCount: number, unreadMessages: number, alert?: { text: string, senderId: string } }> {
    const res = await fetch(`/api/lecturer/sync`);
    return handleResponse(res);
  },

  async archiveSession(payload: Partial<Archive>): Promise<Archive> {
    const res = await fetch(`/api/lecturer/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async markMaterialViewed(materialId: string): Promise<void> {
    await fetch(`/api/student/materials/${materialId}/view`, { method: 'POST' });
  },

  async getMessages(otherId: string): Promise<DirectMessage[]> {
    const res = await fetch(`/api/messages/${otherId}`);
    return handleResponse(res);
  },

  async sendMessage(receiverId: string, text: string): Promise<DirectMessage> {
    const res = await fetch(`/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiverId, text })
    });
    return handleResponse(res);
  },

  async clearStudentNotifications(): Promise<void> {
    await fetch(`/api/student/clear-notifications`, { method: 'POST' });
  },

  async joinCourseRequest(code: string): Promise<{ message: string }> {
    const res = await fetch(`/api/student/join-course`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
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

  async evaluate(inputs: GradingInputs): Promise<GradingResult> {
    const res = await fetch(`/api/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs)
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

  async getGrades(): Promise<any[]> {
    const res = await fetch(`/api/grades`);
    return handleResponse(res);
  },

  async saveGrade(data: any): Promise<void> {
    const res = await fetch(`/api/grades/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    await handleResponse(res);
  }
};
