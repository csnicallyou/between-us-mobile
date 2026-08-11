const DEFAULT_TIMEOUT_MS = 15_000;

export interface UserDto {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthSessionDto {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}

export interface RefreshSessionDto {
  accessToken: string;
  refreshToken: string;
}

export interface PairMemberDto {
  id: string;
  displayName: string;
  memberSlot: string;
  joinedAt: string;
}

export interface PairDto {
  id: string;
  name: string;
  relationshipStartedOn: string | null;
  createdAt: string;
  members: PairMemberDto[];
}

export interface PairInviteDto {
  id: string;
  token: string;
  code: string;
  expiresAt: string;
  link: string;
}

interface ErrorBody {
  error?: string | { code?: string; message?: string };
  message?: string;
}

export class BackendError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "BackendError";
  }
}

function apiBaseUrl(): string {
  const value = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!value) throw new Error("EXPO_PUBLIC_API_BASE_URL не задан");
  return value.replace(/\/$/, "");
}

export function privateImageSource(uri: string, accessToken: string | null) {
  if (!uri.startsWith("media:")) return { uri };
  const mediaId = uri.slice("media:".length);
  return {
    uri: `${apiBaseUrl()}/v1/media/${encodeURIComponent(mediaId)}`,
    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : undefined,
  };
}

async function request<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
  if (!path.startsWith("/")) throw new Error("API path must start with /");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");
    if (init.body) headers.set("content-type", "application/json");
    if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
    const response = await fetch(`${apiBaseUrl()}/v1${path}`, { ...init, headers, signal: controller.signal });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error = body as ErrorBody | null;
      const nestedMessage = error?.error && typeof error.error === "object" ? error.error.message : undefined;
      const flatError = typeof error?.error === "string" ? error.error : undefined;
      throw new BackendError(nestedMessage ?? error?.message ?? flatError ?? "Не удалось выполнить запрос", response.status);
    }
    return body as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new BackendError("Сервер не ответил вовремя", 408);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const backendClient = {
  register: (input: { email: string; password: string; displayName: string }) =>
    request<AuthSessionDto>("/auth/register", { method: "POST", body: JSON.stringify(input) }),
  login: (input: { email: string; password: string }) =>
    request<AuthSessionDto>("/auth/login", { method: "POST", body: JSON.stringify(input) }),
  refresh: (refreshToken: string) =>
    request<RefreshSessionDto>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }) }),
  me: (accessToken: string) => request<UserDto>("/auth/me", {}, accessToken),
  logout: (refreshToken: string, accessToken: string) =>
    request<void>("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }, accessToken),
  getPair: async (accessToken: string) => (await request<{ pair: PairDto | null }>("/pairs/me", {}, accessToken)).pair,
  createPair: (input: { name: string; relationshipStartedOn: string }, accessToken: string) =>
    request<{ pair: PairDto; invite: PairInviteDto }>("/pairs", { method: "POST", body: JSON.stringify(input) }, accessToken),
  createPairInvite: async (accessToken: string) =>
    (await request<{ invite: PairInviteDto }>("/pairs/invites", { method: "POST" }, accessToken)).invite,
  joinPair: (invite: string, accessToken: string) =>
    request<{ pair: PairDto }>("/pairs/join", { method: "POST", body: JSON.stringify({ secret: invite }) }, accessToken),
  submitFeedback: (content: string, accessToken: string) =>
    request<{ id: string; acceptedAt: string }>("/feedback", { method: "POST", body: JSON.stringify({ content }) }, accessToken),
};
