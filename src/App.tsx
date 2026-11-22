/**
 * PALA · Official Padel Scoreboard & Match Logs
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Play, History as HistoryIcon } from 'lucide-react';
import {
  PadelMode,
  DeuceRule,
  MatchFormat,
  PadelMatchState,
  TeamSide,
  createInitialMatchState,
  padelMatchReducer,
} from './engine/padelEngine';
import {
  UserProfile,
  CompletedMatchLog,
  loadUserProfile,
  saveUserProfile,
  loadActiveMatch,
  saveActiveMatch,
  loadMatchHistory,
  upsertMatchToHistory,
  removeMatchFromHistory,
} from './storage/persistence';
import { PalaLogo } from './components/PalaLogo';
import { SetupView } from './components/SetupView';
import { LiveScoreboardView } from './components/LiveScoreboardView';
import { HistoryView } from './components/HistoryView';

type AppRoute = 'play' | 'match' | 'history';

function parseHashRoute(hash: string, hasMatch: boolean): AppRoute {
  const clean = hash.replace(/^#\/?/, '').toLowerCase();
  if (clean === 'match' && hasMatch) return 'match';
  if (clean === 'history') return 'history';
  return 'play';
}

export default function App() {
  const [profile, setProfile] = useState<UserProfile>(() => loadUserProfile());
  const [activeMatch, setActiveMatch] = useState<PadelMatchState | null>(() =>
    loadActiveMatch()
  );
  const [historyLogs, setHistoryLogs] = useState<CompletedMatchLog[]>(() =>
    loadMatchHistory()
  );

  const [route, setRoute] = useState<AppRoute>(() => {
    const existingMatch = loadActiveMatch();
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash.includes('match') && existingMatch) {
      return 'match';
    }
    if (hash.includes('history')) {
      return 'history';
    }
    return 'play';
  });

  // Sync URL hash with active route
  const navigateTo = useCallback((nextRoute: AppRoute) => {
    setRoute(nextRoute);
    const targetHash = `#/${nextRoute}`;
    if (typeof window !== 'undefined' && window.location.hash !== targetHash) {
      window.history.replaceState(null, '', targetHash);
    }
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const next = parseHashRoute(window.location.hash, activeMatch !== null);
      setRoute(next);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeMatch]);

  // Persist activeMatch on every state change
  useEffect(() => {
    saveActiveMatch(activeMatch);
  }, [activeMatch]);

  // Accurate match timer while match is active
  useEffect(() => {
    if (!activeMatch || activeMatch.status !== 'active') return;

    const interval = window.setInterval(() => {
      setActiveMatch((curr) => {
        if (!curr || curr.status !== 'active') return curr;
        return padelMatchReducer(curr, {
          type: 'TICK_TIMER',
          elapsedSeconds: curr.elapsedSeconds + 1,
        });
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [activeMatch?.matchId, activeMatch?.status]);

  const handleUpdateProfile = (nextProfile: UserProfile) => {
    setProfile(nextProfile);
    saveUserProfile(nextProfile);
  };

  const handleStartNewMatch = (params: {
    mode: PadelMode;
    rule: DeuceRule;
    format: MatchFormat;
    teamAName: string;
    teamBName: string;
    initialServer: TeamSide;
  }) => {
    const fresh = createInitialMatchState(params);
    setActiveMatch(fresh);
    saveActiveMatch(fresh);
    navigateTo('match');
  };

  const handleScorePoint = (team: TeamSide) => {
    if (!activeMatch) return;
    const nextState = padelMatchReducer(activeMatch, {
      type: 'SCORE_POINT',
      team,
    });
    setActiveMatch(nextState);
    saveActiveMatch(nextState);

    if (nextState.status === 'completed') {
      const updatedLogs = upsertMatchToHistory(nextState);
      setHistoryLogs(updatedLogs);
    }
  };

  const handleUndo = () => {
    if (!activeMatch || activeMatch.undoStack.length === 0) return;
    const wasCompleted = activeMatch.status === 'completed';
    const revertedState = padelMatchReducer(activeMatch, { type: 'UNDO' });
    setActiveMatch(revertedState);
    saveActiveMatch(revertedState);

    if (wasCompleted && revertedState.status === 'active') {
      const updatedLogs = removeMatchFromHistory(revertedState.matchId);
      setHistoryLogs(updatedLogs);
    }
  };

  const handleEndAndSaveMatch = () => {
    if (!activeMatch) return;
    const endedState = padelMatchReducer(activeMatch, {
      type: 'END_MATCH_EARLY',
    });
    setActiveMatch(endedState);
    saveActiveMatch(endedState);
    const updatedLogs = upsertMatchToHistory(endedState);
    setHistoryLogs(updatedLogs);
  };

  const handleDiscardMatch = () => {
    setActiveMatch(null);
    saveActiveMatch(null);
    navigateTo('play');
  };

  const handleDeleteHistoryLog = (id: string) => {
    const updated = removeMatchFromHistory(id);
    setHistoryLogs(updated);
  };

  // Fullscreen 100dvh Live Scoreboard view
  if (route === 'match' && activeMatch) {
    return (
      <LiveScoreboardView
        match={activeMatch}
        onScorePoint={handleScorePoint}
        onUndo={handleUndo}
        onEndAndSaveMatch={handleEndAndSaveMatch}
        onDiscardMatch={handleDiscardMatch}
        onGoToHistory={() => {
          setActiveMatch(null);
          saveActiveMatch(null);
          navigateTo('history');
        }}
        onStartNewMatchFlow={() => {
          setActiveMatch(null);
          saveActiveMatch(null);
          navigateTo('play');
        }}
      />
    );
  }

  const isHistory = route === 'history';

  return (
    <div className="min-h-[100dvh] bg-[#F5F3EE] text-[#111315] flex flex-col select-none">
      {/* Ultra-Clean Quiet Business Court Top Bar */}
      <header className="h-14 shrink-0 border-b border-[#E6E2D8] bg-[#F5F3EE]/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 h-full flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigateTo('play')}
            className="inline-flex items-center gap-2 text-[#111315] hover:opacity-80 transition-opacity cursor-pointer"
            aria-label="pala Startseite"
          >
            <PalaLogo height={22} className="text-[#111315]" />
          </button>

          <div className="flex items-center gap-2">
            {activeMatch && activeMatch.status === 'active' && (
              <button
                type="button"
                onClick={() => navigateTo('match')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#111315] text-[#F5F3EE] font-mono-pala text-[10px] font-medium uppercase tracking-[0.14em] cursor-pointer hover:bg-[#1D2024] transition-colors"
              >
                <span className="w-[5px] h-[5px] rounded-full bg-[#CBE238]" />
                <span>LIVE</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigateTo('history')}
              className="px-2.5 py-1 rounded-md bg-[#FDFCFA] border border-[#E6E2D8] font-mono-pala text-[10px] font-medium tracking-[0.14em] text-[#6B6963] hover:text-[#111315] uppercase transition-colors cursor-pointer"
            >
              {historyLogs.length} {historyLogs.length === 1 ? 'MATCH' : 'MATCHES'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area (Spielen or Verlauf) */}
      <main className="flex-1 flex flex-col">
        {isHistory ? (
          <HistoryView
            logs={historyLogs}
            onDeleteLog={handleDeleteHistoryLog}
            onGoToSetup={() => navigateTo('play')}
          />
        ) : (
          <SetupView
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            activeMatch={activeMatch}
            onResumeMatch={() => navigateTo('match')}
            onStartNewMatch={handleStartNewMatch}
          />
        )}
      </main>

      {/* Sleek Floating 2-Tab Pill Bar: Spielen | Verlauf */}
      <nav
        className="fixed bottom-4 left-0 right-0 z-30 pointer-events-none pb-safe px-4"
        aria-label="Hauptnavigation"
      >
        <div className="max-w-[264px] mx-auto pointer-events-auto bg-[#FDFCFA]/95 backdrop-blur-md border border-[#E6E2D8] rounded-full p-1 shadow-[0_6px_24px_rgba(17,19,21,0.07)]">
          <div className="relative grid grid-cols-2">
            {/* Gliding Active Pill Thumb */}
            <div
              className="glide-thumb absolute top-0 bottom-0 w-1/2 rounded-full bg-[#111315]"
              style={{
                transform: isHistory ? 'translateX(100%)' : 'translateX(0%)',
              }}
              aria-hidden="true"
            />

            <button
              type="button"
              onClick={() => navigateTo('play')}
              className={`relative z-10 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs transition-colors cursor-pointer ${
                !isHistory
                  ? 'text-[#F5F3EE] font-medium'
                  : 'text-[#6B6963] hover:text-[#111315] font-normal'
              }`}
            >
              <Play
                className="w-3.5 h-3.5"
                strokeWidth={1.6}
                fill={!isHistory ? 'currentColor' : 'none'}
              />
              <span>Spielen</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('history')}
              className={`relative z-10 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs transition-colors cursor-pointer ${
                isHistory
                  ? 'text-[#F5F3EE] font-medium'
                  : 'text-[#6B6963] hover:text-[#111315] font-normal'
              }`}
            >
              <HistoryIcon className="w-3.5 h-3.5" strokeWidth={1.6} />
              <span>Verlauf</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
