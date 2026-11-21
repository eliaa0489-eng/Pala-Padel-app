import React, { useState } from 'react';
import { Trash2, X, PlusCircle, ChevronRight, Copy, Check } from 'lucide-react';
import { CompletedMatchLog } from '../storage/persistence';
import {
  formatDuration,
  formatSetSummaryString,
  formatShareSummaryText,
} from '../engine/padelEngine';
import { PalaLogo } from './PalaLogo';

interface HistoryViewProps {
  logs: CompletedMatchLog[];
  onDeleteLog: (id: string) => void;
  onGoToSetup: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  logs,
  onDeleteLog,
  onGoToSetup,
}) => {
  const [selectedLog, setSelectedLog] = useState<CompletedMatchLog | null>(
    null
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const formatDateTime = (epochMs: number): string => {
    try {
      const d = new Date(epochMs);
      return d.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const formatShortDate = (epochMs: number): string => {
    try {
      const d = new Date(epochMs);
      return d.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  // Live Calculated Summary KPIs
  const totalMatches = logs.length;
  const totalSeconds = logs.reduce(
    (sum, item) => sum + (item.durationSeconds || 0),
    0
  );
  const latestMatchDisplay =
    logs.length > 0 ? formatShortDate(logs[0].timestamp) : '—';

  const handleCopyLogSummary = async (log: CompletedMatchLog) => {
    const text = formatShareSummaryText({
      teamAName: log.teamAName,
      teamBName: log.teamBName,
      winner: log.winner,
      sets: log.sets,
      mode: log.mode,
      rule: log.rule,
      durationSeconds: log.durationSeconds,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(log.id);
      window.setTimeout(() => setCopiedId(null), 2200);
    } catch {
      setCopiedId(log.id);
      window.setTimeout(() => setCopiedId(null), 2200);
    }
  };

  return (
    <div className="flex-1 max-w-md w-full mx-auto px-4 pt-4 pb-28 space-y-4">
      {/* Top Summary Strip with 3 Minimal Tabular KPIs: MATCHES, SPIELZEIT, LETZTES MATCH */}
      <div className="bg-[#FDFCFA] border border-[#E6E2D8] rounded-[14px] shadow-[0_2px_10px_rgba(17,19,21,0.03)] grid grid-cols-3 divide-x divide-[#E6E2D8]">
        <div className="p-4">
          <div className="font-mono-pala text-[10px] tracking-[0.14em] text-[#6B6963] uppercase">
            MATCHES
          </div>
          <div className="font-mono-pala text-lg font-bold text-[#111315] tabular-nums mt-1">
            {totalMatches}
          </div>
        </div>

        <div className="p-4">
          <div className="font-mono-pala text-[10px] tracking-[0.14em] text-[#6B6963] uppercase">
            SPIELZEIT
          </div>
          <div className="font-mono-pala text-lg font-bold text-[#111315] tabular-nums mt-1">
            {formatDuration(totalSeconds)}
          </div>
        </div>

        <div className="p-4">
          <div className="font-mono-pala text-[10px] tracking-[0.14em] text-[#6B6963] uppercase">
            LETZTES MATCH
          </div>
          <div className="font-mono-pala text-lg font-bold text-[#111315] tabular-nums mt-1">
            {latestMatchDisplay}
          </div>
        </div>
      </div>

      {logs.length === 0 ? (
        /* Clean, Understated Club Empty State with Minimalist Court Line Art */
        <div className="bg-[#FDFCFA] border border-[#E6E2D8] rounded-[16px] p-8 text-center shadow-[0_2px_10px_rgba(17,19,21,0.03)] space-y-5">
          {/* Minimalist Court Line Art SVG */}
          <div className="mx-auto w-44 h-24 rounded-[9px] bg-[#F5F3EE] border border-[#E6E2D8] flex items-center justify-center p-3">
            <svg
              viewBox="0 0 200 90"
              className="w-full h-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect
                x="8"
                y="8"
                width="184"
                height="74"
                rx="3"
                stroke="#004488"
                strokeWidth="1.4"
              />
              <line
                x1="42"
                y1="8"
                x2="42"
                y2="82"
                stroke="#004488"
                strokeOpacity="0.4"
                strokeWidth="1.2"
              />
              <line
                x1="158"
                y1="8"
                x2="158"
                y2="82"
                stroke="#004488"
                strokeOpacity="0.4"
                strokeWidth="1.2"
              />
              <line
                x1="42"
                y1="45"
                x2="158"
                y2="45"
                stroke="#004488"
                strokeOpacity="0.4"
                strokeWidth="1.2"
              />
              <line
                x1="100"
                y1="4"
                x2="100"
                y2="86"
                stroke="#111315"
                strokeWidth="1.4"
                strokeDasharray="3 2.5"
              />
            </svg>
          </div>

          <div className="space-y-1.5">
            <div className="font-mono-pala text-[10px] tracking-[0.14em] text-[#6B6963] uppercase">
              MATCH-PROTOKOLL
            </div>
            <h2 className="text-sm font-semibold text-[#111315]">
              Noch keine Matches im Verlauf
            </h2>
            <p className="text-xs text-[#6B6963] max-w-xs mx-auto leading-relaxed">
              Jedes abgeschlossene Match wird automatisch mit Satzverlauf,
              Spielzeit und offizieller Match Card protokolliert.
            </p>
          </div>

          <button
            type="button"
            onClick={onGoToSetup}
            style={{
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
            }}
            className="h-12 px-5 rounded-[12px] bg-[#004488] hover:bg-[#00366D] active:scale-[0.99] text-[#F5F3EE] text-xs font-medium inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" strokeWidth={1.6} />
            <span>Erstes Match starten</span>
          </button>
        </div>
      ) : (
        /* Chronological Match Cards */
        <div className="space-y-3">
          {logs.map((log) => {
            const winnerA = log.winner === 'A';
            const winnerB = log.winner === 'B';

            return (
              <button
                key={log.id}
                type="button"
                onClick={() => {
                  setSelectedLog(log);
                  setConfirmDeleteId(null);
                }}
                className="relative w-full bg-[#FDFCFA] hover:bg-[#FAF8F3] border border-[#E6E2D8] rounded-[14px] p-4 pl-5 text-left shadow-[0_2px_10px_rgba(17,19,21,0.03)] transition-colors flex items-center justify-between gap-3 overflow-hidden cursor-pointer"
              >
                {/* Left Winner Accent Strip */}
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-0 bottom-0 w-[3px] ${
                    winnerA ? 'bg-[#004488]' : 'bg-[#111315]'
                  }`}
                />

                <div className="min-w-0 flex-1 space-y-2">
                  {/* Monospace Date / Mode / Duration Metadata */}
                  <div className="flex items-center gap-2 font-mono-pala text-[10px] text-[#6B6963] uppercase tracking-[0.12em]">
                    <span>{formatDateTime(log.timestamp)}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {log.mode} ·{' '}
                      {log.rule === 'golden_point' ? 'GOLDEN POINT' : 'VORTEIL'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {formatDuration(log.durationSeconds)}
                    </span>
                  </div>

                  {/* Teams & Tabular Set Scores */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm truncate">
                      <span
                        className={
                          winnerA
                            ? 'font-semibold text-[#111315]'
                            : 'font-normal text-[#6B6963]'
                        }
                      >
                        {log.teamAName}
                      </span>
                      <span className="text-[#6B6963] mx-1.5">vs.</span>
                      <span
                        className={
                          winnerB
                            ? 'font-semibold text-[#111315]'
                            : 'font-normal text-[#6B6963]'
                        }
                      >
                        {log.teamBName}
                      </span>
                    </div>

                    <div className="font-mono-pala text-sm font-bold text-[#111315] tabular-nums shrink-0">
                      {formatSetSummaryString(log.sets)}
                    </div>
                  </div>
                </div>

                <ChevronRight
                  className="w-4 h-4 text-[#6B6963] shrink-0"
                  strokeWidth={1.6}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Sleek Slide-Up Collector Match Card Detail Sheet */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="w-full max-w-md rounded-[18px] bg-[#FDFCFA] border border-[#E6E2D8] p-5 space-y-4 text-[#111315] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Top Header */}
            <div className="flex items-center justify-between">
              <span className="font-mono-pala text-[10px] tracking-[0.14em] text-[#6B6963] uppercase">
                MATCH-PROTOKOLL
              </span>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-[8px] border border-[#E6E2D8] bg-[#F5F3EE] flex items-center justify-center text-[#6B6963] hover:text-[#111315] cursor-pointer"
                aria-label="Schließen"
              >
                <X className="w-4 h-4" strokeWidth={1.6} />
              </button>
            </div>

            {/* Private Club Certificate Style Collector Match Card */}
            <div className="rounded-[14px] bg-[#0E1116] border border-[#F5F3EE]/[0.12] p-2 text-[#F5F3EE]">
              <div
                style={{
                  border: '1px solid rgba(245, 243, 238, 0.10)',
                }}
                className="rounded-[10px] p-4 sm:p-5 space-y-4"
              >
                {/* Top Header: <PalaLogo /> Top Left & OFFICIAL MATCH Tag Top Right */}
                <div className="flex items-center justify-between pb-3 border-b border-[#F5F3EE]/[0.08]">
                  <PalaLogo height={18} className="text-[#F5F3EE]" />
                  <div className="inline-flex items-center gap-1.5">
                    <span className="w-[5px] h-[5px] rounded-full bg-[#CBE238]" />
                    <span className="font-mono-pala text-[10px] tracking-[0.14em] text-[#D6D1C6] uppercase">
                      OFFICIAL MATCH
                    </span>
                  </div>
                </div>

                {/* Winner & Giant Tabular Set Scores */}
                <div className="text-center py-1">
                  <div className="font-mono-pala text-[10px] tracking-[0.14em] text-[#CBE238] uppercase">
                    {selectedLog.winner
                      ? `SIEGER · ${
                          selectedLog.winner === 'A'
                            ? selectedLog.teamAName
                            : selectedLog.teamBName
                        }`
                      : 'OFFIZIELLES ERGEBNIS'}
                  </div>
                  <div className="font-mono-pala text-3xl sm:text-4xl font-bold text-[#F5F3EE] tabular-nums tracking-tight mt-1">
                    {formatSetSummaryString(selectedLog.sets)}
                  </div>
                </div>

                {/* Set-by-Set Breakdown Table inside Collector Card */}
                <div className="border border-[#F5F3EE]/[0.08] rounded-[8px] overflow-hidden">
                  <table className="w-full text-left border-collapse font-mono-pala text-xs tabular-nums">
                    <thead>
                      <tr className="border-b border-[#F5F3EE]/[0.08] bg-[#F5F3EE]/[0.03] text-[#9A978F]">
                        <th className="py-2 px-3 font-medium text-[10px] tracking-[0.12em]">
                          TEAM
                        </th>
                        {selectedLog.sets.map((_, i) => (
                          <th
                            key={i}
                            className="py-2 px-2.5 text-center font-medium text-[10px]"
                          >
                            S{i + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F5F3EE]/[0.08]">
                      <tr>
                        <td
                          className={`py-2.5 px-3 font-sans-pala text-xs ${
                            selectedLog.winner === 'A'
                              ? 'font-semibold text-[#F5F3EE]'
                              : 'text-[#9A978F]'
                          }`}
                        >
                          {selectedLog.teamAName}
                        </td>
                        {selectedLog.sets.map((s, i) => (
                          <td
                            key={i}
                            className={`py-2.5 px-2.5 text-center ${
                              s.gamesA > s.gamesB
                                ? 'font-bold text-[#F5F3EE]'
                                : 'text-[#9A978F]'
                            }`}
                          >
                            {s.gamesA}
                            {s.tieBreakA !== undefined && (
                              <sup className="text-[9px] ml-0.5">
                                ({s.tieBreakA})
                              </sup>
                            )}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td
                          className={`py-2.5 px-3 font-sans-pala text-xs ${
                            selectedLog.winner === 'B'
                              ? 'font-semibold text-[#F5F3EE]'
                              : 'text-[#9A978F]'
                          }`}
                        >
                          {selectedLog.teamBName}
                        </td>
                        {selectedLog.sets.map((s, i) => (
                          <td
                            key={i}
                            className={`py-2.5 px-2.5 text-center ${
                              s.gamesB > s.gamesA
                                ? 'font-bold text-[#F5F3EE]'
                                : 'text-[#9A978F]'
                            }`}
                          >
                            {s.gamesB}
                            {s.tieBreakB !== undefined && (
                              <sup className="text-[9px] ml-0.5">
                                ({s.tieBreakB})
                              </sup>
                            )}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Crisp Duration & Date Footer */}
                <div className="flex items-center justify-between pt-1 font-mono-pala text-[10px] tracking-[0.12em] text-[#9A978F] uppercase tabular-nums">
                  <span>
                    {selectedLog.mode} ·{' '}
                    {selectedLog.rule === 'golden_point'
                      ? 'GOLDEN POINT'
                      : 'VORTEIL'}{' '}
                    · {formatDuration(selectedLog.durationSeconds)}
                  </span>
                  <span>{formatDateTime(selectedLog.timestamp)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons: Copy for WhatsApp & Safe Delete */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleCopyLogSummary(selectedLog)}
                style={{
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
                }}
                className="w-full h-12 rounded-[11px] bg-[#004488] hover:bg-[#00366D] text-[#F5F3EE] text-xs font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {copiedId === selectedLog.id ? (
                  <>
                    <Check className="w-3.5 h-3.5" strokeWidth={2} />
                    <span>Kopiert ✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" strokeWidth={1.6} />
                    <span>Ergebnis kopieren</span>
                  </>
                )}
              </button>

              {confirmDeleteId === selectedLog.id ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteLog(selectedLog.id);
                      setSelectedLog(null);
                      setConfirmDeleteId(null);
                    }}
                    className="flex-1 h-10 rounded-[9px] bg-[#111315] text-[#F5F3EE] text-xs font-medium cursor-pointer"
                  >
                    Endgültig löschen
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="flex-1 h-10 rounded-[9px] border border-[#E6E2D8] text-[#6B6963] text-xs font-normal cursor-pointer"
                  >
                    Abbrechen
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(selectedLog.id)}
                  className="w-full h-10 rounded-[9px] border border-[#E6E2D8] hover:bg-[#F5F3EE] text-xs font-normal text-[#6B6963] hover:text-[#111315] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.6} />
                  <span>Löschen</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
