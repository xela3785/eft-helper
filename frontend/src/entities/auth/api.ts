import { apiClient } from "../../shared/api/client.ts";
import type { AuthCredentials, User } from "./types";

export async function loginUser(credentials: AuthCredentials) {
    const { data } = await apiClient.post<{ message?: string }>("/auth/login", credentials);
    return data;
}

export async function registerUser(credentials: AuthCredentials) {
    const { data } = await apiClient.post<User>("/auth/register", credentials);
    return data;
}

export async function getMe() {
    const { data } = await apiClient.get<User>("/auth/me");
    return data;
}

export async function logoutUser() {
    await apiClient.post("/auth/logout");
}
