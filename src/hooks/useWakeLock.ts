import { useEffect, useState, useCallback } from 'react';

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
}

/**
 * Automatically requests Screen Wake Lock while enabled (active match)
 * and re-acquires it when the tab returns to visibility.
 */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const requestWakeLock = async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: {
            request: (type: 'screen') => Promise<WakeLockSentinelLike>;
          };
        };
        if (nav.wakeLock && typeof nav.wakeLock.request === 'function') {
          const lock = await nav.wakeLock.request('screen');
          if (cancelled) {
            await lock.release();
          } else {
            sentinel = lock;
          }
        }
      } catch {
        // Silent graceful fallback when browser or battery saver blocks WakeLock
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !cancelled) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (sentinel && !sentinel.released) {
        sentinel.release().catch(() => {});
      }
    };
  }, [enabled]);
}

/**
 * Manages Native Fullscreen API with silent graceful fallback on iOS Safari
 */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() =>
    typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false
  );

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Silent fallback on iOS Safari where fullscreen is handled via PWA meta tags
    }
  }, []);

  const exitFullscreenIfActive = useCallback(async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Silent fallback
    }
  }, []);

  return {
    isFullscreen,
    toggleFullscreen,
    exitFullscreenIfActive,
  };
}
