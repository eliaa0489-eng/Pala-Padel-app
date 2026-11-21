import React, { useState, useEffect } from 'react';
import {
  Undo2,
  Maximize2,
  Minimize2,
  Square,
  ArrowLeftRight,
  Check,
  Copy,
  RotateCcw,
  History,
  PlusCircle,
} from 'lucide-react';
import {
  PadelMatchState,
  TeamSide,
  formatPointLabel,
  formatDuration,
  formatSetSummaryString,
  detectHighStakes,
  formatShareSummaryText,
} from '../engine/padelEngine';
import { useWakeLock, useFullscreen } from '../hooks/useWakeLock';
import { PalaLogo } from './PalaLogo';

interface LiveScoreboardViewProps {
  match: PadelMatchState;
  onScorePoint: (team: TeamSide) => void;
  onUndo: () => void;
  onEndAndSaveMatch: () => void;
  onDiscardMatch: () => void;
  onGoToHistory: () => void;
  onStartNewMatchFlow: () => void;
}

export const LiveScoreboardView: React.FC<LiveScoreboardViewProps> = ({
  match,
  onScorePoint,
  onUndo,
  onEndAndSaveMatch,
  onDiscardMatch,
  onGoToHistory,
  onStartNewMatchFlow,
}) => {
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [flashTeam, setFlashTeam] = useState<TeamSide | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [isLandscape, setIsLandscape] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.innerWidth > window.innerHeight && window.innerWidth >= 500
      : false
  );

  // Automatic Screen Wake Lock during active match
  useWakeLock(match.status === 'active');

  // Native Fullscreen API with silent iOS Safari PWA fallback
  const { isFullscreen, toggleFullscreen, exitFullscreenIfActive } =
    useFullscreen();

  // Automatic Orientation Adaptation (Portrait vs Landscape)
  useEffect(() => {
    const updateOrientation = () => {
      const landscape =
        window.matchMedia('(orientation: landscape)').matches ||
        (window.innerWidth > window.innerHeight && window.innerWidth >= 500);
      setIsLandscape(landscape);
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);
    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  const handleTapTeamZone = (team: TeamSide) => {
    if (match.status !== 'active') return;
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(12);
      }
    } catch {
      // Ignore vibration errors on unsupported devices
    }
    setFlashTeam(team);
    window.setTimeout(() => {
      setFlashTeam((curr) => (curr === team ? null : curr));
    }, 150);
    onScorePoint(team);
  };

  const handleCopyResult = async () => {
    const text = formatShareSummaryText({
      teamAName: match.teamAName,
      teamBName: match.teamBName,
      winner: match.winner,
      sets: match.sets,
      mode: match.mode,
      rule: match.rule,
      durationSeconds: match.elapsedSeconds,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      window.setTimeout(() => setCopiedSummary(false), 2200);
    } catch {
      setCopiedSummary(true);
      window.setTimeout(() => setCopiedSummary(false), 2200);
    }
  };

  const formatMatchDate = (epochMs: number): string => {
    try {
      return new Date(epochMs).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const pointLabelA = formatPointLabel(
    match.pointsA,
    match.pointsB,
    match.isTieBreak,
    match.rule
  );
  const pointLabelB = formatPointLabel(
    match.pointsB,
    match.pointsA,
    match.isTieBreak,
    match.rule
  );

  const currentSet = match.sets[match.currentSetIndex] || {
    gamesA: 0,
    gamesB: 0,
    completed: false,
  };

  const highStakes = detectHighStakes(match);
  const canUndo = match.undoStack.length === 0 ? false : true;
  const setSummaryText = formatSetSummaryString(match.sets);

  return (
    <div
      className="fixed inset-0 z-50 h-[100dvh] w-full overflow-hidden select-none touch-manipulation bg-[#0B0D10] text-[#F5F3EE] flex flex-col"
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 0%, rgba(245,243,238,0.03) 0%, rgba(11,13,16,0) 65%)',
      }}
    >
      {/* =====================================================================
          SLIM HARDWARE CHROME BAR (Top Edge — Subtly Watermarked PalaLogo)
         ===================================================================== */}
      <header className="h-12 shrink-0 px-3 sm:px-5 border-b border-[#F5F3EE]/[0.07] bg-[#0B0D10]/90 flex items-center justify-between gap-2">
        {/* Left: Zurück (Undo) + Subtle Watermarked Logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className={`h-9 px-3 rounded-[7px] border border-[#F5F3EE]/[0.08] bg-[#13161B] font-mono-pala text-xs inline-flex items-center gap-1.5 transition-all ${
              canUndo
                ? 'text-[#F5F3EE] hover:border-[#F5F3EE]/20 active:scale-[0.98] cursor-pointer'
                : 'text-[#555759] opacity-40 cursor-not-allowed'
            }`}
            aria-label="Letzten Punkt rückgängig machen"
          >
            <Undo2 className="w-3.5 h-3.5" strokeWidth={1.6} />
            <span>Zurück</span>
          </button>

          <PalaLogo height={15} className="text-[#F5F3EE] opacity-55" />

          <span className="hidden sm:inline-block font-mono-pala text-[10px] tracking-[0.14em] text-[#9A978F] uppercase">
            {match.mode} ·{' '}
            {match.rule === 'golden_point' ? 'GOLDEN POINT' : 'VORTEIL'}
          </span>
        </div>

        {/* Center: Chronometer Timer & Non-Blocking Seitenwechsel Notice */}
        <div className="flex items-center justify-center gap-2.5 min-w-0">
          {match.sideSwitchAlert && (
            <div className="animate-pill-in inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#004488] text-[#F5F3EE] font-mono-pala text-[10px] tracking-[0.12em] uppercase truncate">
              <ArrowLeftRight
                className="w-3 h-3 shrink-0"
                strokeWidth={1.6}
              />
              <span className="truncate">Seitenwechsel</span>
            </div>
          )}

          <div className="font-mono-pala text-xs text-[#A3A098] tabular-nums tracking-[0.06em]">
            {formatDuration(match.elapsedSeconds)}
          </div>
        </div>

        {/* Right: Fullscreen & Beenden */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="h-9 w-9 rounded-[7px] border border-[#F5F3EE]/[0.08] bg-[#13161B] hover:border-[#F5F3EE]/20 text-[#A3A098] hover:text-[#F5F3EE] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Vollbild umschalten"
            title="Vollbild umschalten"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" strokeWidth={1.6} />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" strokeWidth={1.6} />
            )}
          </button>

          <button
            type="button"
            onClick={() => setConfirmEndOpen(true)}
            className="h-9 px-3 rounded-[7px] border border-[#F5F3EE]/[0.08] bg-[#13161B] hover:border-[#F5F3EE]/20 text-[#A3A098] hover:text-[#F5F3EE] font-mono-pala text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Square className="w-3 h-3" strokeWidth={1.6} />
            <span>Beenden</span>
          </button>
        </div>
      </header>

      {/* =====================================================================
          MAIN SCOREBOARD COURT ZONES (Portrait Stacked vs Landscape Side-by-Side)
          Separated by an ultra-thin dashed "Court Net" hairline with centered module
         ===================================================================== */}
      <div
        className={`relative flex-1 flex ${
          isLandscape ? 'flex-row' : 'flex-col'
        } overflow-hidden p-2.5 sm:p-3.5 gap-0`}
      >
        {/* TEAM A TAP ZONE (Club Heritage Blue #004C97 3px Edge Accent + Ambient Wash) */}
        <button
          type="button"
          onClick={() => handleTapTeamZone('A')}
          style={{
            backgroundColor:
              flashTeam === 'A'
                ? 'rgba(0, 76, 151, 0.22)'
                : 'rgba(0, 76, 151, 0.09)',
          }}
          className={`relative flex-1 rounded-[12px] border transition-all duration-100 active:scale-[0.99] flex flex-col justify-between p-4 sm:p-6 text-left overflow-hidden cursor-pointer focus:outline-none ${
            flashTeam === 'A'
              ? 'border-[#004C97]'
              : 'border-[#F5F3EE]/[0.07] hover:border-[#F5F3EE]/[0.14]'
          }`}
          aria-label={`Punkt für ${match.teamAName}`}
        >
          {/* Crisp 3px Club Heritage Blue Edge Accent Strip */}
          <span
            aria-hidden="true"
            className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#004C97]"
          />

          {/* Top Bar inside Team A Zone: Name + Active Server 7px Volt Dot + Set Badges */}
          <div className="w-full flex items-center justify-between gap-3 pl-1">
            <div className="flex items-center gap-2.5 min-w-0">
              {match.servingTeam === 'A' && (
                <span
                  className="w-[7px] h-[7px] rounded-full bg-[#CBE238] shrink-0 animate-pulse"
                  title="Aufschlag aktiv"
                />
              )}
              <span className="text-base sm:text-xl font-medium tracking-tight text-[#F5F3EE] truncate">
                {match.teamAName}
              </span>
            </div>

            {/* Crisp Set Game Badges */}
            <div className="flex items-center gap-1.5 shrink-0">
              {match.sets.map((s, idx) => {
                const isCurrent = idx === match.currentSetIndex;
                return (
                  <span
                    key={idx}
                    className={`min-w-[30px] h-7 px-2 rounded-[6px] font-mono-pala text-xs sm:text-sm font-semibold tabular-nums flex items-center justify-center border ${
                      isCurrent
                        ? 'bg-[#004C97] border-[#004C97] text-[#F5F3EE]'
                        : 'bg-[#0B0D10]/80 border-[#F5F3EE]/[0.08] text-[#9A978F]'
                    }`}
                  >
                    {s.gamesA}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Giant Mechanical Tabular Score Numeral in Warm Chalk #F5F3EE */}
          <div className="flex-1 flex items-center justify-center my-1 overflow-hidden">
            <span
              key={`scoreA_${match.pointsA}_${match.currentSetIndex}_${currentSet.gamesA}`}
              style={{
                fontSize: isLandscape
                  ? 'clamp(5.5rem, 18vw, 12.5rem)'
                  : 'clamp(5.5rem, 22vh, 9rem)',
                letterSpacing: '-0.05em',
              }}
              className="font-mono-pala font-bold text-[#F5F3EE] tabular-nums leading-none animate-score-flip"
            >
              {pointLabelA}
            </span>
          </div>

          {/* Bottom Micro Footer inside Team A Zone */}
          <div className="w-full flex items-center justify-between pl-1 font-mono-pala text-[10px] tracking-[0.14em] text-[#9A978F] uppercase">
            <span>
              {match.servingTeam === 'A' ? 'AUFSCHLAG' : 'RÜCKSCHLAG'}
            </span>
            <span className="tabular-nums">
              SATZ {match.currentSetIndex + 1} · {currentSet.gamesA}{' '}
              {currentSet.gamesA === 1 ? 'SPIEL' : 'SPIELE'}
            </span>
          </div>
        </button>

        {/* =====================================================================
            SUBTLE DASHED "COURT NET" HAIRLINE + CENTERED SET & HIGH-STAKES MODULE
           ===================================================================== */}
        <div
          className={`relative shrink-0 flex items-center justify-center ${
            isLandscape ? 'w-6 h-full flex-col' : 'h-7 w-full flex-row'
          }`}
        >
          {/* Dashed Net Line */}
          <div
            aria-hidden="true"
            className={
              isLandscape
                ? 'h-full w-0 border-l border-dashed border-[#F5F3EE]/[0.16]'
                : 'w-full h-0 border-t border-dashed border-[#F5F3EE]/[0.16]'
            }
          />

          {/* Anchored Center Chronometer Module (Set Score + High-Stakes Technical Indicator) */}
          <div
            className={`absolute z-20 pointer-events-none flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E1116] border shadow-[0_2px_8px_rgba(0,0,0,0.5)] ${
              highStakes ? 'border-[#CBE238]/40' : 'border-[#F5F3EE]/[0.14]'
            }`}
          >
            <span className="font-mono-pala text-[11px] font-semibold text-[#F5F3EE] tabular-nums whitespace-nowrap">
              {setSummaryText}
            </span>

            {highStakes && (
              <>
                <span className="text-[#F5F3EE]/25 font-mono-pala text-[10px]">
                  ·
                </span>
                <span
                  key={highStakes.label}
                  className="animate-pill-in inline-flex items-center gap-1.5 font-mono-pala text-[10px] tracking-[0.12em] text-[#CBE238] uppercase font-semibold whitespace-nowrap"
                >
                  <span className="w-[5px] h-[5px] rounded-full bg-[#CBE238]" />
                  <span>{highStakes.label}</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* TEAM B TAP ZONE (Warm Champagne Silver #D6D1C6 3px Edge Accent + Ambient Wash) */}
        <button
          type="button"
          onClick={() => handleTapTeamZone('B')}
          style={{
            backgroundColor:
              flashTeam === 'B'
                ? 'rgba(214, 209, 198, 0.14)'
                : 'rgba(214, 209, 198, 0.04)',
          }}
          className={`relative flex-1 rounded-[12px] border transition-all duration-100 active:scale-[0.99] flex flex-col justify-between p-4 sm:p-6 text-left overflow-hidden cursor-pointer focus:outline-none ${
            flashTeam === 'B'
              ? 'border-[#D6D1C6]'
              : 'border-[#F5F3EE]/[0.07] hover:border-[#F5F3EE]/[0.14]'
          }`}
          aria-label={`Punkt für ${match.teamBName}`}
        >
          {/* Crisp 3px Warm Champagne Silver Edge Accent Strip */}
          <span
            aria-hidden="true"
            className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#D6D1C6]"
          />

          {/* Top Bar inside Team B Zone: Name + Active Server 7px Volt Dot + Set Badges */}
          <div className="w-full flex items-center justify-between gap-3 pl-1">
            <div className="flex items-center gap-2.5 min-w-0">
              {match.servingTeam === 'B' && (
                <span
                  className="w-[7px] h-[7px] rounded-full bg-[#CBE238] shrink-0 animate-pulse"
                  title="Aufschlag aktiv"
                />
              )}
              <span className="text-base sm:text-xl font-medium tracking-tight text-[#F5F3EE] truncate">
                {match.teamBName}
              </span>
            </div>

            {/* Crisp Set Game Badges */}
            <div className="flex items-center gap-1.5 shrink-0">
              {match.sets.map((s, idx) => {
                const isCurrent = idx === match.currentSetIndex;
                return (
                  <span
                    key={idx}
                    className={`min-w-[30px] h-7 px-2 rounded-[6px] font-mono-pala text-xs sm:text-sm font-semibold tabular-nums flex items-center justify-center border ${
                      isCurrent
                        ? 'bg-[#D6D1C6] border-[#D6D1C6] text-[#0B0D10]'
                        : 'bg-[#0B0D10]/80 border-[#F5F3EE]/[0.08] text-[#9A978F]'
                    }`}
                  >
                    {s.gamesB}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Giant Mechanical Tabular Score Numeral in Warm Chalk #F5F3EE */}
          <div className="flex-1 flex items-center justify-center my-1 overflow-hidden">
            <span
              key={`scoreB_${match.pointsB}_${match.currentSetIndex}_${currentSet.gamesB}`}
              style={{
                fontSize: isLandscape
                  ? 'clamp(5.5rem, 18vw, 12.5rem)'
                  : 'clamp(5.5rem, 22vh, 9rem)',
                letterSpacing: '-0.05em',
              }}
              className="font-mono-pala font-bold text-[#F5F3EE] tabular-nums leading-none animate-score-flip"
            >
              {pointLabelB}
            </span>
          </div>

          {/* Bottom Micro Footer inside Team B Zone */}
          <div className="w-full flex items-center justify-between pl-1 font-mono-pala text-[10px] tracking-[0.14em] text-[#9A978F] uppercase">
            <span>
              {match.servingTeam === 'B' ? 'AUFSCHLAG' : 'RÜCKSCHLAG'}
            </span>
            <span className="tabular-nums">
              SATZ {match.currentSetIndex + 1} · {currentSet.gamesB}{' '}
              {currentSet.gamesB === 1 ? 'SPIEL' : 'SPIELE'}
            </span>
          </div>
        </button>
      </div>

      {/* =====================================================================
          SAFE EXIT CONFIRMATION SHEET (Sweat-Proof Protection)
         ===================================================================== */}
      {confirmEndOpen && match.status === 'active' && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-4"
          onClick={() => setConfirmEndOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-[15px] bg-[#0E1116] border border-[#F5F3EE]/[0.1] p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="font-mono-pala text-[10px] tracking-[0.14em] text-[#9A978F] uppercase">
                MATCH-STEUERUNG
              </div>
              <h3 className="text-base font-medium text-[#F5F3EE] mt-1">
                Aktuelles Match beenden?
              </h3>
              <p className="text-xs text-[#9A978F] mt-1 tabular-nums">
                Spielstand: {match.teamAName} vs. {match.teamBName} (
                {setSummaryText})
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmEndOpen(false);
                  onEndAndSaveMatch();
                }}
                style={{
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
                }}
                className="w-full h-11 rounded-[10px] bg-[#004488] hover:bg-[#00366D] text-[#F5F3EE] text-xs font-medium transition-colors cursor-pointer"
              >
                Match beenden & speichern
              </button>

              <button
                type="button"
                onClick={async () => {
                  setConfirmEndOpen(false);
                  await exitFullscreenIfActive();
                  onDiscardMatch();
                }}
                className="w-full h-11 rounded-[10px] bg-[#0B0D10] border border-[#F5F3EE]/[0.08] hover:border-[#F5F3EE]/20 text-[#9A978F] hover:text-[#F5F3EE] text-xs font-normal transition-colors cursor-pointer"
              >
                Verwerfen
              </button>

              <button
                type="button"
                onClick={() => setConfirmEndOpen(false)}
                className="w-full h-10 rounded-[10px] bg-transparent text-[#F5F3EE] text-xs font-medium cursor-pointer"
              >
                Weiterspielen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          POST-MATCH COLLECTOR CARD OVERLAY (Private Club Certificate Style)
         ===================================================================== */}
      {match.status === 'completed' && (
        <div className="fixed inset-0 z-50 bg-[#0B0D10]/95 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md space-y-4">
            {/* Private Club Collector Match Card: Matte #0E1116 with Inner Hairline Frame */}
            <div className="rounded-[16px] bg-[#0E1116] border border-[#F5F3EE]/[0.12] p-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.65)]">
              <div
                style={{
                  border: '1px solid rgba(245, 243, 238, 0.10)',
                }}
                className="rounded-[12px] p-5 sm:p-6 space-y-6"
              >
                {/* Top Certificate Header: <PalaLogo /> Top Left & OFFICIAL MATCH Tag Top Right */}
                <div className="flex items-center justify-between pb-4 border-b border-[#F5F3EE]/[0.08]">
                  <PalaLogo height={20} className="text-[#F5F3EE]" />
                  <div className="inline-flex items-center gap-1.5">
                    <span className="w-[5px] h-[5px] rounded-full bg-[#CBE238]" />
                    <span className="font-mono-pala text-[10px] tracking-[0.14em] text-[#D6D1C6] uppercase">
                      OFFICIAL MATCH
                    </span>
                  </div>
                </div>

                {/* Winner & Giant Tabular Set Scores */}
                <div className="space-y-2 py-1 text-center">
                  <div className="font-mono-pala text-[10px] tracking-[0.14em] text-[#CBE238] uppercase">
                    {match.winner
                      ? `SIEGER · ${
                          match.winner === 'A'
                            ? match.teamAName
                            : match.teamBName
                        }`
                      : 'MATCH-PROTOKOLL'}
                  </div>

                  <div className="font-mono-pala text-4xl sm:text-5xl font-bold text-[#F5F3EE] tabular-nums tracking-tight py-1">
                    {setSummaryText}
                  </div>

                  <div className="text-sm text-[#D6D1C6] font-normal">
                    {match.teamAName}{' '}
                    <span className="text-[#6B6963] mx-1.5">vs.</span>{' '}
                    {match.teamBName}
                  </div>
                </div>

                {/* Telemetry Hairline Matrix */}
                <div className="grid grid-cols-3 divide-x divide-[#F5F3EE]/[0.08] border-t border-b border-[#F5F3EE]/[0.08] py-3.5 font-mono-pala text-xs tabular-nums text-center">
                  <div className="px-2">
                    <div className="text-[10px] tracking-[0.14em] text-[#9A978F] uppercase">
                      MODUS
                    </div>
                    <div className="font-medium text-[#F5F3EE] mt-1">
                      {match.mode}
                    </div>
                  </div>
                  <div className="px-2">
                    <div className="text-[10px] tracking-[0.14em] text-[#9A978F] uppercase">
                      REGEL
                    </div>
                    <div className="font-medium text-[#F5F3EE] mt-1">
                      {match.rule === 'golden_point'
                        ? 'Golden Point'
                        : 'Vorteil'}
                    </div>
                  </div>
                  <div className="px-2">
                    <div className="text-[10px] tracking-[0.14em] text-[#9A978F] uppercase">
                      SPIELZEIT
                    </div>
                    <div className="font-medium text-[#F5F3EE] mt-1">
                      {formatDuration(match.elapsedSeconds)}
                    </div>
                  </div>
                </div>

                {/* Crisp Duration / Date Footer & Copy Button */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleCopyResult}
                    className="w-full h-11 rounded-[10px] bg-[#161A22] hover:bg-[#1D222C] border border-[#F5F3EE]/[0.1] text-[#F5F3EE] text-xs font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    {copiedSummary ? (
                      <>
                        <Check
                          className="w-3.5 h-3.5 text-[#CBE238]"
                          strokeWidth={2}
                        />
                        <span className="text-[#CBE238]">Kopiert ✓</span>
                      </>
                    ) : (
                      <>
                        <Copy
                          className="w-3.5 h-3.5 text-[#D6D1C6]"
                          strokeWidth={1.6}
                        />
                        <span>Ergebnis kopieren</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between font-mono-pala text-[10px] tracking-[0.14em] text-[#9A978F] uppercase tabular-nums pt-0.5">
                    <span>{formatMatchDate(match.startedAt)}</span>
                    <span>OFFIZIELLES REGELWERK · FIP</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions: Zum Verlauf & Neues Match + Undo Escape Hatch */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={async () => {
                    await exitFullscreenIfActive();
                    onGoToHistory();
                  }}
                  className="h-12 rounded-[11px] bg-[#0E1116] border border-[#F5F3EE]/[0.1] hover:border-[#F5F3EE]/25 text-[#F5F3EE] text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <History className="w-3.5 h-3.5" strokeWidth={1.6} />
                  <span>Zum Verlauf</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await exitFullscreenIfActive();
                    onStartNewMatchFlow();
                  }}
                  style={{
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
                  }}
                  className="h-12 rounded-[11px] bg-[#004488] hover:bg-[#00366D] text-[#F5F3EE] text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" strokeWidth={1.6} />
                  <span>Neues Match</span>
                </button>
              </div>

              {canUndo && (
                <button
                  type="button"
                  onClick={onUndo}
                  className="w-full h-9 rounded-[8px] text-xs font-mono-pala text-[#9A978F] hover:text-[#F5F3EE] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.6} />
                  <span>Letzten Punkt zurücknehmen</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
