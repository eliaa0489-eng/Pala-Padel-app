import {
  PadelMode,
  DeuceRule,
  MatchFormat,
  PadelMatchState,
  SetRecord,
  TeamSide,
} from '../engine/padelEngine';

const PREFS_STORAGE_KEY = 'pala_prefs_v1';
const LEGACY_PROFILE_KEY = 'pala_user_profile_v1';
const ACTIVE_MATCH_STORAGE_KEY = 'pala_active_match_v1';
const MATCH_HISTORY_STORAGE_KEY = 'pala_match_history_v1';

export interface UserProfile {
  defaultMode: PadelMode;
  defaultRule: DeuceRule;
  defaultFormat: MatchFormat;
  teamAName2v2: string;
  teamBName2v2: string;
  playerAName1v1: string;
  playerBName1v1: string;
}

export interface CompletedMatchLog {
  id: string;
  timestamp: number;
  mode: PadelMode;
  rule: DeuceRule;
  format: MatchFormat;
  teamAName: string;
  teamBName: string;
  sets: SetRecord[];
  winner: TeamSide | null;
  durationSeconds: number;
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  defaultMode: '2v2',
  defaultRule: 'golden_point',
  defaultFormat: 'best_of_3',
  teamAName2v2: '',
  teamBName2v2: '',
  playerAName1v1: '',
  playerBName1v1: '',
};

/**
 * Loads user preferences safely from localStorage (`pala_prefs_v1`) without ever throwing
 */
export function loadUserProfile(): UserProfile {
  try {
    const raw =
      window.localStorage.getItem(PREFS_STORAGE_KEY) ||
      window.localStorage.getItem(LEGACY_PROFILE_KEY);
    if (!raw) return DEFAULT_USER_PROFILE;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_USER_PROFILE;

    return {
      defaultMode:
        parsed.defaultMode === '1v1' || parsed.defaultMode === '2v2'
          ? parsed.defaultMode
          : '2v2',
      defaultRule:
        parsed.defaultRule === 'advantage' ||
        parsed.defaultRule === 'golden_point'
          ? parsed.defaultRule
          : 'golden_point',
      defaultFormat:
        parsed.defaultFormat === 'single_set' ||
        parsed.defaultFormat === 'best_of_3'
          ? parsed.defaultFormat
          : 'best_of_3',
      teamAName2v2:
        typeof parsed.teamAName2v2 === 'string' ? parsed.teamAName2v2 : '',
      teamBName2v2:
        typeof parsed.teamBName2v2 === 'string' ? parsed.teamBName2v2 : '',
      playerAName1v1:
        typeof parsed.playerAName1v1 === 'string' ? parsed.playerAName1v1 : '',
      playerBName1v1:
        typeof parsed.playerBName1v1 === 'string' ? parsed.playerBName1v1 : '',
    };
  } catch {
    return DEFAULT_USER_PROFILE;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    const serialized = JSON.stringify(profile);
    window.localStorage.setItem(PREFS_STORAGE_KEY, serialized);
    window.localStorage.setItem(LEGACY_PROFILE_KEY, serialized);
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Validates and loads an active match from localStorage (`pala_active_match_v1`)
 */
export function loadActiveMatch(): PadelMatchState | null {
  try {
    const raw = window.localStorage.getItem(ACTIVE_MATCH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.matchId !== 'string' ||
      !Array.isArray(parsed.sets) ||
      parsed.sets.length === 0 ||
      typeof parsed.pointsA !== 'number' ||
      typeof parsed.pointsB !== 'number'
    ) {
      return null;
    }

    return {
      matchId: parsed.matchId,
      mode: parsed.mode === '1v1' ? '1v1' : '2v2',
      rule: parsed.rule === 'advantage' ? 'advantage' : 'golden_point',
      format: parsed.format === 'single_set' ? 'single_set' : 'best_of_3',
      teamAName:
        typeof parsed.teamAName === 'string' && parsed.teamAName.trim()
          ? parsed.teamAName
          : 'Team A',
      teamBName:
        typeof parsed.teamBName === 'string' && parsed.teamBName.trim()
          ? parsed.teamBName
          : 'Team B',
      startedAt:
        typeof parsed.startedAt === 'number' ? parsed.startedAt : Date.now(),
      elapsedSeconds:
        typeof parsed.elapsedSeconds === 'number' ? parsed.elapsedSeconds : 0,
      sets: parsed.sets,
      currentSetIndex:
        typeof parsed.currentSetIndex === 'number'
          ? Math.min(parsed.currentSetIndex, parsed.sets.length - 1)
          : 0,
      pointsA: parsed.pointsA,
      pointsB: parsed.pointsB,
      isTieBreak: Boolean(parsed.isTieBreak),
      servingTeam: parsed.servingTeam === 'B' ? 'B' : 'A',
      gameStartServer: parsed.gameStartServer === 'B' ? 'B' : 'A',
      sideSwitchAlert: Boolean(parsed.sideSwitchAlert),
      sideSwitchMessage:
        typeof parsed.sideSwitchMessage === 'string'
          ? parsed.sideSwitchMessage
          : null,
      status: parsed.status === 'completed' ? 'completed' : 'active',
      winner:
        parsed.winner === 'A' || parsed.winner === 'B' ? parsed.winner : null,
      completedAt:
        typeof parsed.completedAt === 'number' ? parsed.completedAt : null,
      undoStack: Array.isArray(parsed.undoStack) ? parsed.undoStack : [],
    };
  } catch {
    return null;
  }
}

export function saveActiveMatch(match: PadelMatchState | null): void {
  try {
    if (!match) {
      window.localStorage.removeItem(ACTIVE_MATCH_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(ACTIVE_MATCH_STORAGE_KEY, JSON.stringify(match));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Loads saved match history logs from localStorage (`pala_match_history_v1`)
 */
export function loadMatchHistory(): CompletedMatchLog[] {
  try {
    const raw = window.localStorage.getItem(MATCH_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item) =>
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        Array.isArray(item.sets)
    );
  } catch {
    return [];
  }
}

export function saveMatchHistory(logs: CompletedMatchLog[]): void {
  try {
    window.localStorage.setItem(MATCH_HISTORY_STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // Ignore storage quota errors
  }
}

export function upsertMatchToHistory(match: PadelMatchState): CompletedMatchLog[] {
  const current = loadMatchHistory();
  const logEntry: CompletedMatchLog = {
    id: match.matchId,
    timestamp: match.completedAt ?? Date.now(),
    mode: match.mode,
    rule: match.rule,
    format: match.format,
    teamAName: match.teamAName,
    teamBName: match.teamBName,
    sets: match.sets.filter(
      (s, idx) => s.completed || s.gamesA > 0 || s.gamesB > 0 || idx === 0
    ),
    winner: match.winner,
    durationSeconds: match.elapsedSeconds,
  };

  const existingIndex = current.findIndex((item) => item.id === match.matchId);
  let updated: CompletedMatchLog[];
  if (existingIndex >= 0) {
    updated = [...current];
    updated[existingIndex] = logEntry;
  } else {
    updated = [logEntry, ...current];
  }

  saveMatchHistory(updated);
  return updated;
}

export function removeMatchFromHistory(matchId: string): CompletedMatchLog[] {
  const current = loadMatchHistory();
  const updated = current.filter((item) => item.id !== matchId);
  saveMatchHistory(updated);
  return updated;
}
