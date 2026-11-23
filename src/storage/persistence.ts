import {
  PadelMode,
  DeuceRule,
  MatchFormat,
  PadelMatchState,
  PadelCoreSnapshot,
  SetRecord,
  TeamSide,
  MAX_UNDO_STACK_SIZE,
  sanitizeTeamName,
} from '../engine/padelEngine';

const PREFS_STORAGE_KEY = 'pala_prefs_v1';
const LEGACY_PROFILE_KEY = 'pala_user_profile_v1';
const ACTIVE_MATCH_STORAGE_KEY = 'pala_active_match_v1';
const MATCH_HISTORY_STORAGE_KEY = 'pala_match_history_v1';

const MAX_SETS_COUNT = 5;
export const MAX_HISTORY_LOGS = 500;
const MAX_RAW_STORAGE_CHARS = 2_000_000;

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

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
 * Safe JSON parser that rejects oversized strings and strips __proto__, constructor, and prototype keys
 */
export function safeJsonParse<T = unknown>(raw: string | null): T | null {
  if (!raw || typeof raw !== 'string' || raw.length > MAX_RAW_STORAGE_CHARS) {
    return null;
  }
  try {
    return JSON.parse(raw, (key, value) => {
      if (DANGEROUS_KEYS.has(key)) {
        return undefined;
      }
      return value;
    }) as T;
  } catch {
    return null;
  }
}

function sanitizeNonNegativeInt(
  val: unknown,
  fallback = 0,
  max = 1_000_000
): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.min(max, Math.max(0, Math.floor(val)));
}

function sanitizeSetRecord(raw: unknown): SetRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.gamesA !== 'number' || typeof obj.gamesB !== 'number') {
    return null;
  }
  const record: SetRecord = {
    gamesA: sanitizeNonNegativeInt(obj.gamesA, 0, 99),
    gamesB: sanitizeNonNegativeInt(obj.gamesB, 0, 99),
    completed: Boolean(obj.completed),
  };
  if (typeof obj.tieBreakA === 'number' && Number.isFinite(obj.tieBreakA)) {
    record.tieBreakA = sanitizeNonNegativeInt(obj.tieBreakA, 0, 999);
  }
  if (typeof obj.tieBreakB === 'number' && Number.isFinite(obj.tieBreakB)) {
    record.tieBreakB = sanitizeNonNegativeInt(obj.tieBreakB, 0, 999);
  }
  return record;
}

function sanitizeSetsArray(rawSets: unknown): SetRecord[] | null {
  if (!Array.isArray(rawSets) || rawSets.length === 0) return null;
  const cleaned: SetRecord[] = [];
  for (const item of rawSets.slice(0, MAX_SETS_COUNT)) {
    const valid = sanitizeSetRecord(item);
    if (!valid) return null;
    cleaned.push(valid);
  }
  return cleaned.length > 0 ? cleaned : null;
}

function sanitizeSnapshot(raw: unknown): PadelCoreSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const sets = sanitizeSetsArray(obj.sets);
  if (!sets) return null;

  return {
    sets,
    currentSetIndex: Math.min(
      sanitizeNonNegativeInt(obj.currentSetIndex, 0, sets.length - 1),
      sets.length - 1
    ),
    pointsA: sanitizeNonNegativeInt(obj.pointsA, 0, 999),
    pointsB: sanitizeNonNegativeInt(obj.pointsB, 0, 999),
    isTieBreak: Boolean(obj.isTieBreak),
    servingTeam: obj.servingTeam === 'B' ? 'B' : 'A',
    gameStartServer: obj.gameStartServer === 'B' ? 'B' : 'A',
    sideSwitchAlert: Boolean(obj.sideSwitchAlert),
    sideSwitchMessage:
      typeof obj.sideSwitchMessage === 'string'
        ? obj.sideSwitchMessage
            .replace(/[\u0000-\u001F\u007F-\u009F<>"'/\\`]/g, '')
            .slice(0, 120)
        : null,
    status: obj.status === 'completed' ? 'completed' : 'active',
    winner: obj.winner === 'A' || obj.winner === 'B' ? obj.winner : null,
    completedAt:
      typeof obj.completedAt === 'number' && Number.isFinite(obj.completedAt)
        ? obj.completedAt
        : null,
  };
}

/**
 * Loads user preferences safely from localStorage (`pala_prefs_v1`) without ever throwing
 */
export function loadUserProfile(): UserProfile {
  try {
    const raw =
      window.localStorage.getItem(PREFS_STORAGE_KEY) ||
      window.localStorage.getItem(LEGACY_PROFILE_KEY);
    const parsed = safeJsonParse<Record<string, unknown>>(raw);
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
      teamAName2v2: sanitizeTeamName(parsed.teamAName2v2, ''),
      teamBName2v2: sanitizeTeamName(parsed.teamBName2v2, ''),
      playerAName1v1: sanitizeTeamName(parsed.playerAName1v1, ''),
      playerBName1v1: sanitizeTeamName(parsed.playerBName1v1, ''),
    };
  } catch {
    return DEFAULT_USER_PROFILE;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    const safeProfile: UserProfile = {
      defaultMode: profile.defaultMode === '1v1' ? '1v1' : '2v2',
      defaultRule:
        profile.defaultRule === 'advantage' ? 'advantage' : 'golden_point',
      defaultFormat:
        profile.defaultFormat === 'single_set' ? 'single_set' : 'best_of_3',
      teamAName2v2: sanitizeTeamName(profile.teamAName2v2, ''),
      teamBName2v2: sanitizeTeamName(profile.teamBName2v2, ''),
      playerAName1v1: sanitizeTeamName(profile.playerAName1v1, ''),
      playerBName1v1: sanitizeTeamName(profile.playerBName1v1, ''),
    };
    const serialized = JSON.stringify(safeProfile);
    window.localStorage.setItem(PREFS_STORAGE_KEY, serialized);
    window.localStorage.setItem(LEGACY_PROFILE_KEY, serialized);
  } catch {
    // Gracefully ignore QuotaExceededError on iOS Safari
  }
}

/**
 * Strictly validates and loads an active match from localStorage (`pala_active_match_v1`)
 */
export function loadActiveMatch(): PadelMatchState | null {
  try {
    const raw = window.localStorage.getItem(ACTIVE_MATCH_STORAGE_KEY);
    const parsed = safeJsonParse<Record<string, unknown>>(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const core = sanitizeSnapshot(parsed);
    if (
      !core ||
      typeof parsed.matchId !== 'string' ||
      !parsed.matchId.trim()
    ) {
      return null;
    }

    const mode: PadelMode = parsed.mode === '1v1' ? '1v1' : '2v2';
    const defaultA = mode === '2v2' ? 'Team A' : 'Spieler 1';
    const defaultB = mode === '2v2' ? 'Team B' : 'Spieler 2';

    const rawUndo = Array.isArray(parsed.undoStack)
      ? parsed.undoStack.slice(-MAX_UNDO_STACK_SIZE)
      : [];
    const undoStack: PadelCoreSnapshot[] = [];
    for (const snap of rawUndo) {
      const validSnap = sanitizeSnapshot(snap);
      if (validSnap) undoStack.push(validSnap);
    }

    return {
      ...core,
      matchId: parsed.matchId
        .replace(/[\u0000-\u001F\u007F-\u009F<>"'/\\`]/g, '')
        .slice(0, 64),
      mode,
      rule: parsed.rule === 'advantage' ? 'advantage' : 'golden_point',
      format: parsed.format === 'single_set' ? 'single_set' : 'best_of_3',
      teamAName: sanitizeTeamName(parsed.teamAName, defaultA, true),
      teamBName: sanitizeTeamName(parsed.teamBName, defaultB, true),
      startedAt:
        typeof parsed.startedAt === 'number' && Number.isFinite(parsed.startedAt)
          ? parsed.startedAt
          : Date.now(),
      elapsedSeconds: sanitizeNonNegativeInt(parsed.elapsedSeconds, 0, 86_400),
      undoStack,
    };
  } catch {
    return null;
  }
}

/**
 * Saves active match with automatic QuotaExceededError recovery on iOS Safari
 */
export function saveActiveMatch(match: PadelMatchState | null): void {
  try {
    if (!match) {
      window.localStorage.removeItem(ACTIVE_MATCH_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(ACTIVE_MATCH_STORAGE_KEY, JSON.stringify(match));
  } catch {
    // If storage quota is exceeded mid-match, trim undoStack to latest 40 snapshots and retry
    if (match) {
      try {
        const compactMatch: PadelMatchState = {
          ...match,
          undoStack: match.undoStack.slice(-40),
        };
        window.localStorage.setItem(
          ACTIVE_MATCH_STORAGE_KEY,
          JSON.stringify(compactMatch)
        );
      } catch {
        // Silent fallback so active in-memory game never crashes
      }
    }
  }
}

/**
 * Loads and validates saved match history logs from localStorage (`pala_match_history_v1`)
 */
export function loadMatchHistory(): CompletedMatchLog[] {
  try {
    const raw = window.localStorage.getItem(MATCH_HISTORY_STORAGE_KEY);
    const parsed = safeJsonParse<unknown[]>(raw);
    if (!Array.isArray(parsed)) return [];

    const logs: CompletedMatchLog[] = [];
    for (const item of parsed.slice(0, MAX_HISTORY_LOGS)) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      if (typeof obj.id !== 'string' || !obj.id.trim()) continue;
      const sets = sanitizeSetsArray(obj.sets);
      if (!sets) continue;
      const mode: PadelMode = obj.mode === '1v1' ? '1v1' : '2v2';
      logs.push({
        id: obj.id
          .replace(/[\u0000-\u001F\u007F-\u009F<>"'/\\`]/g, '')
          .slice(0, 64),
        timestamp:
          typeof obj.timestamp === 'number' && Number.isFinite(obj.timestamp)
            ? obj.timestamp
            : Date.now(),
        mode,
        rule: obj.rule === 'advantage' ? 'advantage' : 'golden_point',
        format: obj.format === 'single_set' ? 'single_set' : 'best_of_3',
        teamAName: sanitizeTeamName(
          obj.teamAName,
          mode === '2v2' ? 'Team A' : 'Spieler 1',
          true
        ),
        teamBName: sanitizeTeamName(
          obj.teamBName,
          mode === '2v2' ? 'Team B' : 'Spieler 2',
          true
        ),
        sets,
        winner: obj.winner === 'A' || obj.winner === 'B' ? obj.winner : null,
        durationSeconds: sanitizeNonNegativeInt(
          obj.durationSeconds,
          0,
          86_400
        ),
      });
    }
    return logs;
  } catch {
    return [];
  }
}

export function saveMatchHistory(logs: CompletedMatchLog[]): void {
  const capped = logs.slice(0, MAX_HISTORY_LOGS);
  try {
    window.localStorage.setItem(
      MATCH_HISTORY_STORAGE_KEY,
      JSON.stringify(capped)
    );
  } catch {
    // Graceful QuotaExceededError fallback: prune oldest half and retry
    try {
      const pruned = capped.slice(0, Math.max(10, Math.floor(capped.length / 2)));
      window.localStorage.setItem(
        MATCH_HISTORY_STORAGE_KEY,
        JSON.stringify(pruned)
      );
    } catch {
      // Silent fallback
    }
  }
}

export function upsertMatchToHistory(match: PadelMatchState): CompletedMatchLog[] {
  const current = loadMatchHistory();
  const logEntry: CompletedMatchLog = {
    id: match.matchId.slice(0, 64),
    timestamp: match.completedAt ?? Date.now(),
    mode: match.mode,
    rule: match.rule,
    format: match.format,
    teamAName: sanitizeTeamName(
      match.teamAName,
      match.mode === '2v2' ? 'Team A' : 'Spieler 1',
      true
    ),
    teamBName: sanitizeTeamName(
      match.teamBName,
      match.mode === '2v2' ? 'Team B' : 'Spieler 2',
      true
    ),
    sets: match.sets.filter(
      (s, idx) => s.completed || s.gamesA > 0 || s.gamesB > 0 || idx === 0
    ),
    winner: match.winner,
    durationSeconds: sanitizeNonNegativeInt(match.elapsedSeconds, 0, 86_400),
  };

  const existingIndex = current.findIndex((item) => item.id === match.matchId);
  let updated: CompletedMatchLog[];
  if (existingIndex >= 0) {
    updated = [...current];
    updated[existingIndex] = logEntry;
  } else {
    updated = [logEntry, ...current].slice(0, MAX_HISTORY_LOGS);
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

/**
 * Resets corrupted active match or preference state while preserving valid match history logs if possible
 */
export function resetCorruptedStorage(clearAll = false): void {
  try {
    window.localStorage.removeItem(ACTIVE_MATCH_STORAGE_KEY);
    if (clearAll) {
      window.localStorage.removeItem(PREFS_STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_PROFILE_KEY);
      window.localStorage.removeItem(MATCH_HISTORY_STORAGE_KEY);
    }
  } catch {
    // Ignore storage access errors
  }
}
