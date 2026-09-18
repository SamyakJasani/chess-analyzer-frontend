import type { components } from './schema';
import { environment } from '../environments/environment';

export type PlayerProfile = components['schemas']['UserProfile'];
export type ChessGame = components['schemas']['Game'];
export type GamePlayer = components['schemas']['GamePlayer'];
export type GamesResponse = components['schemas']['GamesResponse'];

async function request<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`${environment.apiBaseUrl.replace(/\/$/, '')}${path}`, { signal });
  if (!response.ok) {
    throw new Error(response.status === 404 ? 'Player not found.' : `API request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export function getPlayerProfile(username: string, signal: AbortSignal): Promise<PlayerProfile> {
  return request<PlayerProfile>(`/users/${encodeURIComponent(username)}`, signal);
}

export async function getPlayerGames(username: string, page: number, signal: AbortSignal, pageSize = 20): Promise<GamesResponse> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return request<GamesResponse>(`/users/${encodeURIComponent(username)}/games?${params}`, signal);
}
