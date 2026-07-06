
import { Question, AdminStats, ClerkUser } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
    throw new Error("Missing API URL. Please set VITE_API_URL in your .env file.");
}

type ClerkAuth = {
    getToken: (options?: { template?: string }) => Promise<string | null>;
};

const getHeaders = async (auth: ClerkAuth) => {
    const token = await auth.getToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

// --- Questions API ---
interface GetQuestionsParams {
  page?: number;
  limit?: number;
  searchQuery?: string;
  filter?: string;
}

interface PaginatedQuestions {
    questions: Question[];
    page: number;
    totalPages: number;
    totalQuestions: number;
}


export const getQuestions = async (params: GetQuestionsParams): Promise<PaginatedQuestions> => {
    const { page = 1, limit = 5, searchQuery = '', filter = 'Newest' } = params;
    const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        q: searchQuery,
        filter: filter
    });
    const response = await fetch(`${API_URL}/questions?${query.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch questions');
    return response.json();
};

export const getQuestion = async (id: string): Promise<Question> => {
    const response = await fetch(`${API_URL}/questions/${id}`);
    if (!response.ok) throw new Error('Failed to fetch question');
    return response.json();
};

export const createQuestion = async (
    auth: ClerkAuth,
    title: string,
    body: string,
    tags: string[]
): Promise<Question> => {
    const response = await fetch(`${API_URL}/questions`, {
        method: 'POST',
        headers: await getHeaders(auth),
        body: JSON.stringify({ title, body, tags })
    });
    if (!response.ok) throw new Error('Failed to create question');
    return response.json();
};

// --- Answers API ---

export const createAnswer = async (
    auth: ClerkAuth,
    questionId: string,
    body: string
): Promise<Question> => {
    const response = await fetch(`${API_URL}/questions/${questionId}/answers`, {
        method: 'POST',
        headers: await getHeaders(auth),
        body: JSON.stringify({ body })
    });
    if (!response.ok) throw new Error('Failed to post answer');
    return response.json();
};

export const voteOnAnswer = async (
    auth: ClerkAuth,
    questionId: string,
    answerId: string,
    voteDirection: 'up' | 'down'
): Promise<Question> => {
    const response = await fetch(`${API_URL}/questions/${questionId}/answers/${answerId}/vote`, {
        method: 'PATCH',
        headers: await getHeaders(auth),
        body: JSON.stringify({ voteDirection })
    });
    if (!response.ok) throw new Error('Failed to vote');
    return response.json();
};

export const acceptAnswer = async (
    auth: ClerkAuth,
    questionId: string,
    answerId: string
): Promise<Question> => {
    const response = await fetch(`${API_URL}/questions/${questionId}/answers/${answerId}/accept`, {
        method: 'PATCH',
        headers: await getHeaders(auth)
    });
    if (!response.ok) throw new Error('Failed to accept answer');
    return response.json();
};

// --- Admin API ---

export const deleteQuestion = async (
    auth: ClerkAuth,
    questionId: string
): Promise<void> => {
    const response = await fetch(`${API_URL}/questions/${questionId}`, {
        method: 'DELETE',
        headers: await getHeaders(auth),
    });
    if (!response.ok) {
        throw new Error('Failed to delete question. Admin permission required.');
    }
};

export const deleteAnswer = async (
    auth: ClerkAuth,
    questionId: string,
    answerId: string
): Promise<Question> => {
    const response = await fetch(`${API_URL}/questions/${questionId}/answers/${answerId}`, {
        method: 'DELETE',
        headers: await getHeaders(auth),
    });
    if (!response.ok) {
        throw new Error('Failed to delete answer. Admin permission required.');
    }
    return response.json();
};

export const getAdminStats = async (auth: ClerkAuth): Promise<AdminStats> => {
    const response = await fetch(`${API_URL}/admin/stats`, {
        headers: await getHeaders(auth)
    });
    if (!response.ok) {
        throw new Error('Failed to fetch admin stats. Admin permission required.');
    }
    return response.json();
};

export const getAdminUsers = async (auth: ClerkAuth): Promise<ClerkUser[]> => {
    const response = await fetch(`${API_URL}/admin/users`, {
        headers: await getHeaders(auth)
    });
    if (!response.ok) {
        throw new Error('Failed to fetch users. Admin permission required.');
    }
    return response.json();
};
