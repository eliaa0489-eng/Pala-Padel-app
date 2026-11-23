import React from 'react';
import { RotateCcw, RefreshCw } from 'lucide-react';
import { PalaLogo } from './PalaLogo';
import { resetCorruptedStorage } from '../storage/persistence';

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Root ErrorBoundary with "Reset Corrupted State" fallback so the scoreboard
 * can never white-screen mid-game from tampered or corrupted storage.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  private handleSoftReload = () => {
    resetCorruptedStorage(false);
    this.setState({ hasError: false });
    window.location.hash = '#/play';
    window.location.reload();
  };

  private handleFullReset = () => {
    resetCorruptedStorage(true);
    this.setState({ hasError: false });
    window.location.hash = '#/play';
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-[100dvh] bg-[#F5F3EE] text-[#111315] flex items-center justify-center p-4 select-none">
        <div className="w-full max-w-sm bg-[#FDFCFA] border border-[#E6E2D8] rounded-[16px] p-6 shadow-[0_2px_10px_rgba(17,19,21,0.03)] space-y-5">
          <div className="flex items-center justify-between">
            <PalaLogo height={20} className="text-[#111315]" />
            <span className="font-mono-pala text-[10px] tracking-[0.14em] text-[#6B6963] uppercase">
              STATUS-SCHUTZ
            </span>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-base font-semibold text-[#111315]">
              Lokaler Status wird wiederhergestellt
            </h1>
            <p className="text-xs text-[#6B6963] leading-relaxed">
              Ein beschädigter lokaler Speicherwert wurde erkannt. Setze das
              aktive Match zurück, um sofort weiterzuspielen.
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={this.handleSoftReload}
              className="w-full h-11 rounded-[10px] bg-[#004488] hover:bg-[#00366D] text-[#F5F3EE] text-xs font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.6} />
              <span>Aktives Match zurücksetzen & neu laden</span>
            </button>

            <button
              type="button"
              onClick={this.handleFullReset}
              className="w-full h-10 rounded-[10px] border border-[#E6E2D8] bg-[#F5F3EE] hover:bg-[#EAE6DD] text-[#6B6963] hover:text-[#111315] text-xs font-normal inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.6} />
              <span>Gesamten lokalen Speicher zurücksetzen</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
