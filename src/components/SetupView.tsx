import React, { useState } from 'react';
import { Play, ArrowRight, RotateCcw } from 'lucide-react';
import {
  PadelMode,
  DeuceRule,
  MatchFormat,
  PadelMatchState,
  TeamSide,
  formatSetSummaryString,
  formatDuration,
  formatPointLabel,
} from '../engine/padelEngine';
import { UserProfile } from '../storage/persistence';

interface SetupViewProps {
  profile: UserProfile;
  onUpdateProfile: (next: UserProfile) => void;
  activeMatch: PadelMatchState | null;
  onResumeMatch: () => void;
  onStartNewMatch: (params: {
    mode: PadelMode;
    rule: DeuceRule;
    format: MatchFormat;
    teamAName: string;
    teamBName: string;
    initialServer: TeamSide;
  }) => void;
}

/**
 * Reusable Gliding Segmented Control with recessed #EAE6DD track and spring-gliding Warm Ivory #FDFCFA active thumb
 */
function GlidingSegment<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: [{ id: T; label: string }, { id: T; label: string }];
  value: T;
  onChange: (val: T) => void;
  ariaLabel: string;
}) {
  const isSecond = value === options[1].id;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="relative grid grid-cols-2 p-1 rounded-[10px] bg-[#EAE6DD] border border-[#E6E2D8] select-none"
    >
      {/* Spring-Gliding Active Warm Ivory Thumb */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-[7px] bg-[#FDFCFA] shadow-[0_1px_3px_rgba(17,19,21,0.06)] border border-[#E6E2D8]/90 glide-thumb"
        style={{
          transform: isSecond ? 'translateX(100%)' : 'translateX(0%)',
        }}
      />

      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`relative z-10 h-9 rounded-[7px] text-xs font-medium tracking-tight transition-colors duration-150 cursor-pointer ${
              active
                ? 'text-[#111315] font-semibold'
                : 'text-[#6B6963] hover:text-[#111315]'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Interactive Architectural Mini-Court Blueprint
 * Highlights Full 20x10m Doubles Court in 2v2 or Diagonal Cross-Court Singles Corridor in 1v1
 */
const MiniCourtBlueprint: React.FC<{
  mode: PadelMode;
  rule: DeuceRule;
  format: MatchFormat;
}> = ({ mode, rule, format }) => {
  const is2v2 = mode === '2v2';

  return (
    <div className="relative rounded-[11px] bg-[#F5F3EE] border border-[#E6E2D8] px-4 py-3.5 overflow-hidden">
      {/* Top Blueprint Spec Header */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="w-[5px] h-[5px] rounded-full bg-[#004488]" />
          <span className="font-mono-pala text-[10px] tracking-[0.14em] text-[#111315] uppercase font-medium">
            {is2v2 ? '2V2 DOPPEL · FULL COURT' : '1V1 EINZEL · CROSS-COURT'}
          </span>
        </div>
        <span className="font-mono-pala text-[10px] tracking-[0.12em] text-[#6B6963] uppercase tabular-nums">
          {is2v2 ? '20.0 × 10.0 M' : '20.0 × 6.0 M'} ·{' '}
          {rule === 'golden_point' ? 'NO-AD' : 'AD'} ·{' '}
          {format === 'best_of_3' ? '3 SÄTZE' : '1 SATZ'}
        </span>
      </div>

      {/* Minimalist Architectural Padel Court SVG */}
      <svg
        viewBox="0 0 320 116"
        className="w-full h-[90px] sm:h-[96px]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={
          is2v2
            ? 'Padel Court Blueprint für 2v2 Doppel'
            : 'Padel Court Blueprint für 1v1 Einzel'
        }
      >
        {/* Outer Court Enclosure Base */}
        <rect
          x="16"
          y="8"
          width="288"
          height="100"
          rx="4"
          fill="#FDFCFA"
          stroke="#D6D1C6"
          strokeWidth="1.2"
        />

        {/* Active Play Zone Highlight: Full Court in 2v2 vs Diagonal Corridor in 1v1 */}
        {is2v2 ? (
          <rect
            x="16"
            y="8"
            width="288"
            height="100"
            rx="4"
            fill="#004488"
            fillOpacity="0.06"
            stroke="#004488"
            strokeWidth="1.5"
            className="transition-all duration-300"
          />
        ) : (
          <g className="transition-all duration-300">
            {/* Top-Left Half Corridor */}
            <rect
              x="16"
              y="8"
              width="144"
              height="50"
              fill="#004488"
              fillOpacity="0.08"
              stroke="#004488"
              strokeWidth="1.4"
            />
            {/* Bottom-Right Diagonal Half Corridor */}
            <rect
              x="160"
              y="58"
              width="144"
              height="50"
              fill="#004488"
              fillOpacity="0.08"
              stroke="#004488"
              strokeWidth="1.4"
            />
            {/* Diagonal Sightline Vector */}
            <line
              x1="54"
              y1="33"
              x2="266"
              y2="83"
              stroke="#004488"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
          </g>
        )}

        {/* Left & Right Service Lines */}
        <line
          x1="64"
          y1="8"
          x2="64"
          y2="108"
          stroke="#004488"
          strokeOpacity="0.4"
          strokeWidth="1.2"
        />
        <line
          x1="256"
          y1="8"
          x2="256"
          y2="108"
          stroke="#004488"
          strokeOpacity="0.4"
          strokeWidth="1.2"
        />

        {/* Center Service T-Line */}
        <line
          x1="64"
          y1="58"
          x2="256"
          y2="58"
          stroke="#004488"
          strokeOpacity="0.4"
          strokeWidth="1.2"
        />

        {/* Center Court Net Line (Dashed) */}
        <line
          x1="160"
          y1="4"
          x2="160"
          y2="112"
          stroke="#111315"
          strokeWidth="1.5"
          strokeDasharray="3 2.5"
        />
        {/* Net Posts */}
        <circle cx="160" cy="6" r="2.2" fill="#111315" />
        <circle cx="160" cy="110" r="2.2" fill="#111315" />

        {/* Player Position Markers */}
        {is2v2 ? (
          <>
            {/* Team A Pair (Left Court) */}
            <circle cx="44" cy="33" r="4.5" fill="#004488" />
            <circle cx="96" cy="83" r="4.5" fill="#004488" />
            {/* Team B Pair (Right Court) */}
            <circle
              cx="224"
              cy="33"
              r="4.5"
              fill="#111315"
              stroke="#FDFCFA"
              strokeWidth="1.2"
            />
            <circle
              cx="276"
              cy="83"
              r="4.5"
              fill="#111315"
              stroke="#FDFCFA"
              strokeWidth="1.2"
            />
          </>
        ) : (
          <>
            {/* 1v1 Cross-Court Singles Positions */}
            <circle cx="48" cy="33" r="5" fill="#004488" />
            <circle
              cx="272"
              cy="83"
              r="5"
              fill="#111315"
              stroke="#FDFCFA"
              strokeWidth="1.2"
            />
          </>
        )}
      </svg>
    </div>
  );
};

export const SetupView: React.FC<SetupViewProps> = ({
  profile,
  onUpdateProfile,
  activeMatch,
  onResumeMatch,
  onStartNewMatch,
}) => {
  const [mode, setMode] = useState<PadelMode>(profile.defaultMode);
  const [rule, setRule] = useState<DeuceRule>(profile.defaultRule);
  const [format, setFormat] = useState<MatchFormat>(profile.defaultFormat);
  const [initialServer, setInitialServer] = useState<TeamSide>('A');

  const [teamAInput, setTeamAInput] = useState<string>(
    mode === '2v2' ? profile.teamAName2v2 : profile.playerAName1v1
  );
  const [teamBInput, setTeamBInput] = useState<string>(
    mode === '2v2' ? profile.teamBName2v2 : profile.playerBName1v1
  );

  const handleModeSwitch = (nextMode: PadelMode) => {
    const updatedProfile: UserProfile = {
      ...profile,
      defaultMode: nextMode,
      teamAName2v2: mode === '2v2' ? teamAInput : profile.teamAName2v2,
      teamBName2v2: mode === '2v2' ? teamBInput : profile.teamBName2v2,
      playerAName1v1: mode === '1v1' ? teamAInput : profile.playerAName1v1,
      playerBName1v1: mode === '1v1' ? teamBInput : profile.playerBName1v1,
    };
    onUpdateProfile(updatedProfile);
    setMode(nextMode);
    setTeamAInput(
      nextMode === '2v2'
        ? updatedProfile.teamAName2v2
        : updatedProfile.playerAName1v1
    );
    setTeamBInput(
      nextMode === '2v2'
        ? updatedProfile.teamBName2v2
        : updatedProfile.playerBName1v1
    );
  };

  const handleRuleSwitch = (nextRule: DeuceRule) => {
    setRule(nextRule);
    onUpdateProfile({
      ...profile,
      defaultRule: nextRule,
    });
  };

  const handleFormatSwitch = (nextFormat: MatchFormat) => {
    setFormat(nextFormat);
    onUpdateProfile({
      ...profile,
      defaultFormat: nextFormat,
    });
  };

  const handleTeamAChange = (val: string) => {
    setTeamAInput(val);
    onUpdateProfile({
      ...profile,
      teamAName2v2: mode === '2v2' ? val : profile.teamAName2v2,
      playerAName1v1: mode === '1v1' ? val : profile.playerAName1v1,
    });
  };

  const handleTeamBChange = (val: string) => {
    setTeamBInput(val);
    onUpdateProfile({
      ...profile,
      teamBName2v2: mode === '2v2' ? val : profile.teamBName2v2,
      playerBName1v1: mode === '1v1' ? val : profile.playerBName1v1,
    });
  };

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    const defaultA = mode === '2v2' ? 'Team A' : 'Spieler 1';
    const defaultB = mode === '2v2' ? 'Team B' : 'Spieler 2';

    onStartNewMatch({
      mode,
      rule,
      format,
      teamAName: teamAInput.trim() || defaultA,
      teamBName: teamBInput.trim() || defaultB,
      initialServer,
    });
  };

  const hasUnfinishedMatch =
    activeMatch !== null && activeMatch.status === 'active';

  const activeScoreSummary = hasUnfinishedMatch
    ? `${formatSetSummaryString(activeMatch.sets)}, ${formatPointLabel(
        activeMatch.pointsA,
        activeMatch.pointsB,
        activeMatch.isTieBreak,
        activeMatch.rule
      )}–${formatPointLabel(
        activeMatch.pointsB,
        activeMatch.pointsA,
        activeMatch.isTieBreak,
        activeMatch.rule
      )}`
    : '';

  return (
    <div className="flex-1 flex flex-col justify-between max-w-md w-full mx-auto px-4 pt-4 pb-28">
      <div className="space-y-4">
        {/* Conditional Resume Card (Matte Obsidian #0E1116 Banner with #CBE238 Live Dot) */}
        {hasUnfinishedMatch && activeMatch && (
          <button
            type="button"
            onClick={onResumeMatch}
            className="w-full p-4 rounded-[14px] bg-[#0E1116] hover:bg-[#151921] border border-white/[0.1] text-[#F5F3EE] text-left transition-all active:scale-[0.99] flex items-center justify-between gap-3 shadow-[0_4px_14px_rgba(17,19,21,0.12)] cursor-pointer"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="w-[7px] h-[7px] rounded-full bg-[#CBE238] shrink-0"
                  aria-hidden="true"
                />
                <span className="font-mono-pala text-[10px] tracking-[0.14em] text-[#CBE238] uppercase font-medium">
                  Laufendes Match fortsetzen · {activeScoreSummary}
                </span>
              </div>
              <div className="text-sm font-medium truncate mt-1 text-[#F5F3EE]">
                {activeMatch.teamAName} vs. {activeMatch.teamBName}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 font-mono-pala text-xs bg-white/[0.08] px-2.5 py-1.5 rounded-[8px] text-[#F5F3EE] tabular-nums">
              <span>{formatDuration(activeMatch.elapsedSeconds)}</span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.6} />
            </div>
          </button>
        )}

        {/* Main Warm Ivory Setup Card */}
        <form
          onSubmit={handleStart}
          className="bg-[#FDFCFA] border border-[#E6E2D8] rounded-[16px] p-5 sm:p-6 shadow-[0_2px_10px_rgba(17,19,21,0.03)] space-y-5"
        >
          {/* Calm Executive Header Micro-Labels */}
          <div className="flex items-center justify-between">
            <span className="font-mono-pala text-[10px] tracking-[0.14em] text-[#6B6963] uppercase">
              COURT SETUP
            </span>
            <span className="font-mono-pala text-[10px] tracking-[0.14em] text-[#6B6963] uppercase">
              OFFIZIELLES REGELWERK · FIP
            </span>
          </div>

          {/* Interactive Mini-Court Blueprint */}
          <MiniCourtBlueprint mode={mode} rule={rule} format={format} />

          {/* Gliding Segmented Controls */}
          <div className="space-y-3.5">
            {/* Modus: 2v2 | 1v1 */}
            <div className="space-y-1.5">
              <label className="block font-mono-pala text-[10px] tracking-[0.14em] text-[#6B6963] uppercase">
                MODUS
              </label>
              <GlidingSegment<PadelMode>
                ariaLabel="Spielmodus"
                value={mode}
                onChange={handleModeSwitch}
                options={[
                  { id: '2v2', label: '2v2' },
                  { id: '1v1', label: '1v1' },
                ]}
              />
            </div>

            {/* Deuce: Golden Point | Vorteil */}
            <div className="space-y-1.5">
              <label className="block font-mono-pala text-[10px] tracking-[0.14em] text-[#6B6963] uppercase">
                EINSTAND (40–40)
              </label>
              <GlidingSegment<DeuceRule>
                ariaLabel="Einstand-Regel"
                value={rule}
                onChange={handleRuleSwitch}
                options={[
                  { id: 'golden_point', label: 'Golden Point' },
                  { id: 'advantage', label: 'Vorteil' },
                ]}
              />
            </div>

            {/* Format: Best of 3 | 1 Satz */}
            <div className="space-y-1.5">
              <label className="block font-mono-pala text-[10px] tracking-[0.14em] text-[#6B6963] uppercase">
                FORMAT
              </label>
              <GlidingSegment<MatchFormat>
                ariaLabel="Satz-Format"
                value={format}
                onChange={handleFormatSwitch}
                options={[
                  { id: 'best_of_3', label: 'Best of 3' },
                  { id: 'single_set', label: '1 Satz' },
                ]}
              />
            </div>
          </div>

          {/* Inline Team / Player Name Inputs with Smart Defaults */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="font-mono-pala text-[10px] tracking-[0.14em] text-[#6B6963] uppercase">
                {mode === '2v2'
                  ? 'TEAMS & ERSTER AUFSCHLAG'
                  : 'SPIELER & ERSTER AUFSCHLAG'}
              </span>
              {(teamAInput || teamBInput) && (
                <button
                  type="button"
                  onClick={() => {
                    handleTeamAChange('');
                    handleTeamBChange('');
                  }}
                  className="font-mono-pala text-[10px] tracking-[0.12em] uppercase text-[#6B6963] hover:text-[#111315] inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" strokeWidth={1.6} />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {/* Team A Row (Club Heritage Blue Edge Accent) */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 flex items-center">
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#004488]"
                  />
                  <input
                    type="text"
                    value={teamAInput}
                    onChange={(e) => handleTeamAChange(e.target.value)}
                    placeholder={mode === '2v2' ? 'Team A' : 'Spieler 1'}
                    aria-label={mode === '2v2' ? 'Name Team A' : 'Name Spieler 1'}
                    maxLength={26}
                    className="w-full h-11 pl-3.5 pr-3 rounded-[9px] bg-[#F5F3EE] border border-[#E6E2D8] focus:bg-[#FDFCFA] focus:border-[#004488] focus:outline-none text-sm font-medium text-[#111315] placeholder:text-[#6B6963]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setInitialServer('A')}
                  className={`h-11 px-3 rounded-[9px] border font-mono-pala text-[10px] tracking-[0.1em] uppercase inline-flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                    initialServer === 'A'
                      ? 'bg-[#111315] border-[#111315] text-[#F5F3EE]'
                      : 'bg-[#F5F3EE] border-[#E6E2D8] text-[#6B6963]'
                  }`}
                  title="Schlägt zuerst auf"
                >
                  <span
                    className={`w-[6px] h-[6px] rounded-full ${
                      initialServer === 'A' ? 'bg-[#CBE238]' : 'bg-[#D6D1C6]'
                    }`}
                  />
                  <span>Aufschlag</span>
                </button>
              </div>

              {/* Team B Row (Warm Champagne Silver Edge Accent) */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 flex items-center">
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#B8B2A6]"
                  />
                  <input
                    type="text"
                    value={teamBInput}
                    onChange={(e) => handleTeamBChange(e.target.value)}
                    placeholder={mode === '2v2' ? 'Team B' : 'Spieler 2'}
                    aria-label={mode === '2v2' ? 'Name Team B' : 'Name Spieler 2'}
                    maxLength={26}
                    className="w-full h-11 pl-3.5 pr-3 rounded-[9px] bg-[#F5F3EE] border border-[#E6E2D8] focus:bg-[#FDFCFA] focus:border-[#004488] focus:outline-none text-sm font-medium text-[#111315] placeholder:text-[#6B6963]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setInitialServer('B')}
                  className={`h-11 px-3 rounded-[9px] border font-mono-pala text-[10px] tracking-[0.1em] uppercase inline-flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                    initialServer === 'B'
                      ? 'bg-[#111315] border-[#111315] text-[#F5F3EE]'
                      : 'bg-[#F5F3EE] border-[#E6E2D8] text-[#6B6963]'
                  }`}
                  title="Schlägt zuerst auf"
                >
                  <span
                    className={`w-[6px] h-[6px] rounded-full ${
                      initialServer === 'B' ? 'bg-[#CBE238]' : 'bg-[#D6D1C6]'
                    }`}
                  />
                  <span>Aufschlag</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bespoke Primary CTA: Match starten */}
          <div className="pt-1.5">
            <button
              type="submit"
              style={{
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.12), 0 2px 8px rgba(0,68,136,0.18)',
              }}
              className="w-full h-[52px] rounded-[12px] bg-[#004488] hover:bg-[#00366D] active:bg-[#00366D] active:scale-[0.99] text-[#F5F3EE] font-medium text-sm tracking-tight transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" strokeWidth={1.6} />
              <span>Match starten</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
