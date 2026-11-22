export type PadelMode = '2v2' | '1v1';
export type DeuceRule = 'golden_point' | 'advantage';
export type MatchFormat = 'best_of_3' | 'single_set';
export type TeamSide = 'A' | 'B';

export const MAX_TEAM_NAME_LENGTH = 26;
export const MAX_UNDO_STACK_SIZE = 400;

export interface SetRecord {
  gamesA: number;
  gamesB: number;
  tieBreakA?: number;
  tieBreakB?: number;
  completed: boolean;
}

export interface PadelCoreSnapshot {
  sets: SetRecord[];
  currentSetIndex: number;
  pointsA: number; // 0=0, 1=15, 2=30, 3=40, 4=AD (or numeric 0,1,2... in Tie-Break)
  pointsB: number;
  isTieBreak: boolean;
  servingTeam: TeamSide;
  gameStartServer: TeamSide;
  sideSwitchAlert: boolean;
  sideSwitchMessage: string | null;
  status: 'active' | 'completed';
  winner: TeamSide | null;
  completedAt: number | null;
}

export interface PadelMatchState extends PadelCoreSnapshot {
  matchId: string;
  mode: PadelMode;
  rule: DeuceRule;
  format: MatchFormat;
  teamAName: string;
  teamBName: string;
  startedAt: number;
  elapsedSeconds: number;
  undoStack: PadelCoreSnapshot[];
}

export type PadelAction =
  | { type: 'SCORE_POINT'; team: TeamSide }
  | { type: 'UNDO' }
  | { type: 'DISMISS_SIDE_SWITCH' }
  | { type: 'TICK_TIMER'; elapsedSeconds: number }
  | { type: 'END_MATCH_EARLY' };

export type HighStakesIndicator =
  | { type: 'MATCHBALL'; team: TeamSide | 'BOTH'; label: string }
  | { type: 'SATZBALL'; team: TeamSide | 'BOTH'; label: string }
  | { type: 'GOLDEN_POINT'; label: string }
  | { type: 'TIE_BREAK'; label: string }
  | null;

/**
 * Strips control characters and enforces strict length bounds on player/team names
 */
export function sanitizeTeamName(raw: unknown, fallback = ''): string {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .slice(0, MAX_TEAM_NAME_LENGTH);
  return cleaned || fallback;
}

function generateSecureMatchId(): string {
  try {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.getRandomValues === 'function'
    ) {
      const bytes = new Uint8Array(6);
      crypto.getRandomValues(bytes);
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
        ''
      );
      return `match_${Date.now()}_${hex}`;
    }
  } catch {
    // Fallback if Web Crypto is unavailable
  }
  return `match_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createInitialMatchState(params: {
  mode: PadelMode;
  rule: DeuceRule;
  format: MatchFormat;
  teamAName: string;
  teamBName: string;
  initialServer?: TeamSide;
}): PadelMatchState {
  const server = params.initialServer === 'B' ? 'B' : 'A';
  const defaultA = params.mode === '2v2' ? 'Team A' : 'Spieler 1';
  const defaultB = params.mode === '2v2' ? 'Team B' : 'Spieler 2';
  const cleanTeamA = sanitizeTeamName(params.teamAName.trim(), defaultA);
  const cleanTeamB = sanitizeTeamName(params.teamBName.trim(), defaultB);

  return {
    matchId: generateSecureMatchId(),
    mode: params.mode === '1v1' ? '1v1' : '2v2',
    rule: params.rule === 'advantage' ? 'advantage' : 'golden_point',
    format: params.format === 'single_set' ? 'single_set' : 'best_of_3',
    teamAName: cleanTeamA,
    teamBName: cleanTeamB,
    startedAt: Date.now(),
    elapsedSeconds: 0,
    sets: [{ gamesA: 0, gamesB: 0, completed: false }],
    currentSetIndex: 0,
    pointsA: 0,
    pointsB: 0,
    isTieBreak: false,
    servingTeam: server,
    gameStartServer: server,
    sideSwitchAlert: false,
    sideSwitchMessage: null,
    status: 'active',
    winner: null,
    completedAt: null,
    undoStack: [],
  };
}

function extractCoreSnapshot(state: PadelMatchState): PadelCoreSnapshot {
  return {
    sets: state.sets.map((s) => ({ ...s })),
    currentSetIndex: state.currentSetIndex,
    pointsA: state.pointsA,
    pointsB: state.pointsB,
    isTieBreak: state.isTieBreak,
    servingTeam: state.servingTeam,
    gameStartServer: state.gameStartServer,
    sideSwitchAlert: state.sideSwitchAlert,
    sideSwitchMessage: state.sideSwitchMessage,
    status: state.status,
    winner: state.winner,
    completedAt: state.completedAt,
  };
}

function appendUndoSnapshot(
  stack: PadelCoreSnapshot[],
  snapshot: PadelCoreSnapshot
): PadelCoreSnapshot[] {
  const next = [...stack, snapshot];
  if (next.length > MAX_UNDO_STACK_SIZE) {
    return next.slice(next.length - MAX_UNDO_STACK_SIZE);
  }
  return next;
}

function oppositeTeam(team: TeamSide): TeamSide {
  return team === 'A' ? 'B' : 'A';
}

export function getSetsNeededToWin(format: MatchFormat): number {
  return format === 'best_of_3' ? 2 : 1;
}

export function countSetsWon(sets: SetRecord[]): { wonA: number; wonB: number } {
  let wonA = 0;
  let wonB = 0;
  for (const s of sets) {
    if (s.completed) {
      if (s.gamesA > s.gamesB) wonA += 1;
      else if (s.gamesB > s.gamesA) wonB += 1;
    }
  }
  return { wonA, wonB };
}

export function formatPointLabel(
  teamPoints: number,
  opponentPoints: number,
  isTieBreak: boolean,
  rule: DeuceRule
): string {
  if (isTieBreak) {
    return String(teamPoints);
  }
  const labels = ['0', '15', '30', '40'];
  if (teamPoints <= 3 && opponentPoints <= 3) {
    return labels[teamPoints] ?? '40';
  }
  if (rule === 'advantage') {
    if (teamPoints === 4) return 'AD';
    return '40';
  }
  return labels[Math.min(teamPoints, 3)] ?? '40';
}

export function isGoldenPointMoment(state: PadelMatchState): boolean {
  return (
    state.status === 'active' &&
    !state.isTieBreak &&
    state.rule === 'golden_point' &&
    state.pointsA === 3 &&
    state.pointsB === 3
  );
}

/**
 * Checks if scoring the very next point for `team` would win the current game
 */
function isGamePointForTeam(state: PadelMatchState, team: TeamSide): boolean {
  const myPts = team === 'A' ? state.pointsA : state.pointsB;
  const oppPts = team === 'A' ? state.pointsB : state.pointsA;

  if (state.isTieBreak) {
    return myPts >= 6 && myPts - oppPts >= 1;
  }

  if (state.rule === 'golden_point') {
    return myPts === 3;
  }

  // Advantage rule
  if (myPts === 3 && oppPts < 3) return true;
  if (myPts === 4) return true;
  return false;
}

/**
 * Checks if winning the current game for `team` would win the current set
 */
function wouldGameWinSetForTeam(state: PadelMatchState, team: TeamSide): boolean {
  const currentSet = state.sets[state.currentSetIndex];
  if (!currentSet) return false;

  if (state.isTieBreak) return true;

  const myGames = (team === 'A' ? currentSet.gamesA : currentSet.gamesB) + 1;
  const oppGames = team === 'A' ? currentSet.gamesB : currentSet.gamesA;

  return (myGames >= 6 && myGames - oppGames >= 2) || (myGames === 7 && oppGames === 6);
}

/**
 * Automatically detects high-stakes moments: MATCHBALL, SATZBALL, GOLDEN POINT, or TIE-BREAK
 */
export function detectHighStakes(state: PadelMatchState): HighStakesIndicator {
  if (state.status !== 'active') return null;

  const { wonA, wonB } = countSetsWon(state.sets);
  const setsNeeded = getSetsNeededToWin(state.format);

  const setPointA =
    isGamePointForTeam(state, 'A') && wouldGameWinSetForTeam(state, 'A');
  const setPointB =
    isGamePointForTeam(state, 'B') && wouldGameWinSetForTeam(state, 'B');

  const matchPointA = setPointA && wonA + 1 >= setsNeeded;
  const matchPointB = setPointB && wonB + 1 >= setsNeeded;

  if (matchPointA && matchPointB) {
    return { type: 'MATCHBALL', team: 'BOTH', label: 'MATCHBALL · GOLDEN POINT' };
  }
  if (matchPointA) {
    return { type: 'MATCHBALL', team: 'A', label: 'MATCHBALL' };
  }
  if (matchPointB) {
    return { type: 'MATCHBALL', team: 'B', label: 'MATCHBALL' };
  }

  if (setPointA && setPointB) {
    return { type: 'SATZBALL', team: 'BOTH', label: 'SATZBALL · GOLDEN POINT' };
  }
  if (setPointA) {
    return { type: 'SATZBALL', team: 'A', label: 'SATZBALL' };
  }
  if (setPointB) {
    return { type: 'SATZBALL', team: 'B', label: 'SATZBALL' };
  }

  if (isGoldenPointMoment(state)) {
    return { type: 'GOLDEN_POINT', label: 'GOLDEN POINT' };
  }

  if (state.isTieBreak) {
    return { type: 'TIE_BREAK', label: 'TIE-BREAK' };
  }

  return null;
}

/**
 * Pure, deterministic FIP Padel scoring reducer
 */
export function padelMatchReducer(
  state: PadelMatchState,
  action: PadelAction
): PadelMatchState {
  switch (action.type) {
    case 'TICK_TIMER': {
      if (state.status !== 'active') return state;
      return {
        ...state,
        elapsedSeconds: Math.max(0, Math.floor(action.elapsedSeconds)),
      };
    }

    case 'DISMISS_SIDE_SWITCH': {
      return {
        ...state,
        sideSwitchAlert: false,
      };
    }

    case 'UNDO': {
      if (state.undoStack.length === 0) return state;
      const previous = state.undoStack[state.undoStack.length - 1];
      const nextStack = state.undoStack.slice(0, -1);
      return {
        ...state,
        ...previous,
        sets: previous.sets.map((s) => ({ ...s })),
        undoStack: nextStack,
      };
    }

    case 'END_MATCH_EARLY': {
      if (state.status === 'completed') return state;
      const snapshot = extractCoreSnapshot(state);
      const { wonA, wonB } = countSetsWon(state.sets);
      const currentSet = state.sets[state.currentSetIndex];
      let winner: TeamSide | null = null;
      if (wonA > wonB) winner = 'A';
      else if (wonB > wonA) winner = 'B';
      else if (currentSet) {
        if (currentSet.gamesA > currentSet.gamesB) winner = 'A';
        else if (currentSet.gamesB > currentSet.gamesA) winner = 'B';
        else if (state.pointsA > state.pointsB) winner = 'A';
        else if (state.pointsB > state.pointsA) winner = 'B';
      }

      return {
        ...state,
        status: 'completed',
        winner,
        completedAt: Date.now(),
        undoStack: appendUndoSnapshot(state.undoStack, snapshot),
      };
    }

    case 'SCORE_POINT': {
      if (state.status !== 'active') return state;

      const snapshot = extractCoreSnapshot(state);
      const nextSets = state.sets.map((s) => ({ ...s }));
      let currentSetIdx = state.currentSetIndex;
      const currentSet = nextSets[currentSetIdx];

      let pointsA = state.pointsA;
      let pointsB = state.pointsB;
      let isTieBreak = state.isTieBreak;
      let servingTeam = state.servingTeam;
      let gameStartServer = state.gameStartServer;
      let sideSwitchAlert = false;
      let sideSwitchMessage: string | null = null;
      let status: 'active' | 'completed' = 'active';
      let winner: TeamSide | null = null;
      let completedAt: number | null = null;

      const awardGame = (gameWinner: TeamSide, fromTieBreak = false) => {
        if (fromTieBreak) {
          currentSet.tieBreakA = pointsA;
          currentSet.tieBreakB = pointsB;
        }

        if (gameWinner === 'A') {
          currentSet.gamesA += 1;
        } else {
          currentSet.gamesB += 1;
        }

        pointsA = 0;
        pointsB = 0;
        isTieBreak = false;

        const nextGameServer = oppositeTeam(gameStartServer);
        gameStartServer = nextGameServer;
        servingTeam = nextGameServer;

        const gA = currentSet.gamesA;
        const gB = currentSet.gamesB;
        const totalGamesInSet = gA + gB;

        // Tie-Break at 6–6
        if (gA === 6 && gB === 6) {
          isTieBreak = true;
          sideSwitchAlert = false;
          sideSwitchMessage = 'Tie-Break (6–6) · Seitenwechsel alle 6 Punkte';
          return;
        }

        // Check for Set Win
        const wonSetA = (gA >= 6 && gA - gB >= 2) || (gA === 7 && gB === 6);
        const wonSetB = (gB >= 6 && gB - gA >= 2) || (gB === 7 && gA === 6);

        if (wonSetA || wonSetB) {
          currentSet.completed = true;
          const { wonA, wonB } = countSetsWon(nextSets);
          const targetSets = getSetsNeededToWin(state.format);

          if (wonA >= targetSets || wonB >= targetSets) {
            status = 'completed';
            winner = wonA >= targetSets ? 'A' : 'B';
            completedAt = Date.now();
            sideSwitchAlert = false;
            sideSwitchMessage = null;
            return;
          }

          // Start next set
          nextSets.push({ gamesA: 0, gamesB: 0, completed: false });
          currentSetIdx += 1;
          if (totalGamesInSet % 2 === 1) {
            sideSwitchAlert = true;
            sideSwitchMessage = `Seitenwechsel · Start Satz ${currentSetIdx + 1}`;
          } else {
            sideSwitchAlert = false;
            sideSwitchMessage = null;
          }
          return;
        }

        // Odd-Game Side Switch (1, 3, 5, 7, 9, 11)
        if (totalGamesInSet % 2 === 1) {
          sideSwitchAlert = true;
          sideSwitchMessage = `Seitenwechsel · Ungerade Spiele (${gA}–${gB})`;
        } else {
          sideSwitchAlert = false;
          sideSwitchMessage = null;
        }
      };

      if (isTieBreak) {
        if (action.team === 'A') pointsA += 1;
        else pointsB += 1;

        const totalTbPoints = pointsA + pointsB;

        if (
          (pointsA >= 7 || pointsB >= 7) &&
          Math.abs(pointsA - pointsB) >= 2
        ) {
          awardGame(pointsA > pointsB ? 'A' : 'B', true);
        } else {
          const block = Math.floor((totalTbPoints + 1) / 2);
          servingTeam =
            block % 2 === 1 ? oppositeTeam(gameStartServer) : gameStartServer;

          if (totalTbPoints > 0 && totalTbPoints % 6 === 0) {
            sideSwitchAlert = true;
            sideSwitchMessage = `Seitenwechsel · Tie-Break (${pointsA}–${pointsB})`;
          } else {
            sideSwitchAlert = false;
            sideSwitchMessage = null;
          }
        }
      } else {
        const scorerPts = action.team === 'A' ? pointsA : pointsB;
        const receiverPts = action.team === 'A' ? pointsB : pointsA;

        if (state.rule === 'golden_point') {
          if (scorerPts === 3) {
            awardGame(action.team);
          } else {
            if (action.team === 'A') pointsA += 1;
            else pointsB += 1;
          }
        } else {
          if (scorerPts < 3) {
            if (action.team === 'A') pointsA += 1;
            else pointsB += 1;
          } else if (scorerPts === 3) {
            if (receiverPts < 3) {
              awardGame(action.team);
            } else if (receiverPts === 3) {
              if (action.team === 'A') pointsA = 4;
              else pointsB = 4;
            } else if (receiverPts === 4) {
              pointsA = 3;
              pointsB = 3;
            }
          } else if (scorerPts === 4) {
            awardGame(action.team);
          }
        }
      }

      return {
        ...state,
        sets: nextSets,
        currentSetIndex: currentSetIdx,
        pointsA,
        pointsB,
        isTieBreak,
        servingTeam,
        gameStartServer,
        sideSwitchAlert,
        sideSwitchMessage,
        status,
        winner,
        completedAt,
        undoStack: appendUndoSnapshot(state.undoStack, snapshot),
      };
    }

    default:
      return state;
  }
}

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(
      secs
    ).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatSetSummaryString(sets: SetRecord[]): string {
  return sets
    .filter(
      (s, idx) =>
        s.completed || s.gamesA > 0 || s.gamesB > 0 || idx === 0
    )
    .map((s) => {
      if (s.tieBreakA !== undefined && s.tieBreakB !== undefined) {
        const minTb = Math.min(s.tieBreakA, s.tieBreakB);
        return `${s.gamesA}–${s.gamesB}(${minTb})`;
      }
      return `${s.gamesA}–${s.gamesB}`;
    })
    .join(' · ');
}

export function formatShareSummaryText(params: {
  teamAName: string;
  teamBName: string;
  winner: TeamSide | null;
  sets: SetRecord[];
  mode: PadelMode;
  rule: DeuceRule;
  durationSeconds: number;
}): string {
  const safeA = sanitizeTeamName(params.teamAName, 'Team A');
  const safeB = sanitizeTeamName(params.teamBName, 'Team B');
  const winnerName =
    params.winner === 'A'
      ? safeA
      : params.winner === 'B'
      ? safeB
      : null;
  const ruleLabel =
    params.rule === 'golden_point' ? 'GOLDEN POINT' : 'VORTEIL';
  const setsStr = formatSetSummaryString(params.sets);
  const durStr = formatDuration(params.durationSeconds);

  return [
    `PALA MATCH RESULT · ${params.mode} · ${ruleLabel}`,
    `${safeA} vs. ${safeB}`,
    `Ergebnis: ${setsStr}${winnerName ? ` (Sieger: ${winnerName})` : ''}`,
    `Spielzeit: ${durStr}`,
  ].join('\n');
}
