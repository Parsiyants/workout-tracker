import { api } from "./client";

export type User = {
  id: number;
  email: string;
  is_admin: boolean;
  is_demo: boolean;
  created_at: string;
};

async function requestAuth(path: string, email: string, password: string): Promise<string> {
  const { data } = await api.post<{ access_token: string }>(path, { email, password });
  return data.access_token;
}

export const login = (email: string, password: string) => requestAuth("/auth/login", email, password);

/** Создание пользователя админом (публичной регистрации нет). */
export async function createUser(email: string, password: string): Promise<User> {
  const { data } = await api.post<User>("/auth/register", { email, password });
  return data;
}

export async function fetchUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>("/admin/users");
  return data;
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me");
  return data;
}

export async function demoLogin(): Promise<string> {
  const { data } = await api.post<{ access_token: string }>("/auth/demo");
  return data.access_token;
}
