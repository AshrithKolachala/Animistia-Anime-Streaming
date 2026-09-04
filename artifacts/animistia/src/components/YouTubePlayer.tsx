import { useEffect, useRef, useState } from 'react';
import { Maximize, Pause, Play, RotateCcw, Volume2 } from 'lucide-react';

type YouTubePlayerState = {
  getCurrentTime: () => number;
  getDuration: () => number;
  isMuted: () => boolean;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  getIframe: () => HTMLIFrameElement;
  destroy: () => void;
};

type YouTubeApi = {
  Player: new (element: HTMLElement, options: {
    videoId: string;
    playerVars: Record<string, number | string>;
    events: {
      onReady: (event: { target: YouTubePlayerState }) => void;
      onStateChange: (event: { data: number; target: YouTubePlayerState }) => void;
    };
  }) => YouTubePlayerState;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeApi> | null = null;

function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (window.YT) resolve(window.YT);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return youtubeApiPromise;
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return '00:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function YouTubePlayer({ videoId, title }: { videoId: string; title: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayerState | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    loadYouTubeApi().then((YT) => {
      if (cancelled || !mountRef.current) return;
      const player = new YT.Player(mountRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: ({ target }) => {
            playerRef.current = target;
            setReady(true);
            setDuration(target.getDuration());
            const iframe = target.getIframe();
            iframe.setAttribute('title', title);
            iframe.setAttribute('aria-label', `${title} YouTube player`);
            iframe.style.display = 'block';
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.maxWidth = 'none';
          },
          onStateChange: ({ data }) => {
            setPlaying(data === YT.PlayerState.PLAYING);
            if (data === YT.PlayerState.ENDED) setCurrentTime(duration);
          },
        },
      });
      playerRef.current = player;
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId, title]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      setCurrentTime(player.getCurrentTime());
      setDuration(player.getDuration());
    }, 250);
    return () => window.clearInterval(timer);
  }, [ready]);

  const togglePlayback = () => {
    const player = playerRef.current;
    if (!player) return;
    if (playing) player.pauseVideo();
    else player.playVideo();
    setPlaying(!playing);
  };

  const skipIntro = () => {
    const player = playerRef.current;
    if (!player) return;
    player.seekTo(player.getCurrentTime() + 90, true);
  };

  const seek = (value: number) => {
    playerRef.current?.seekTo(value, true);
    setCurrentTime(value);
  };

  const toggleMute = () => {
    const player = playerRef.current;
    if (!player) return;
    if (muted) player.unMute();
    else player.mute();
    setMuted(!muted);
  };

  const fullscreen = () => {
    playerRef.current?.getIframe().requestFullscreen?.();
  };

  return (
    <div className="absolute inset-0 bg-[#080d1a]">
      <div ref={mountRef} className="absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full" />
      {!ready && <div className="absolute inset-0 flex items-center justify-center bg-[#0d1020]/90"><span className="font-mono-app text-[10px] uppercase tracking-[.22em] text-cyan-200/70">Initializing screening room</span></div>}
      <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-cyan-200/20 bg-[#10152a]/75 p-3 shadow-[0_0_30px_rgba(44,226,255,.12)] backdrop-blur-xl sm:inset-x-5 sm:bottom-5 sm:p-4">
        <input aria-label="Video progress" type="range" min="0" max={Math.max(duration, 1)} step="0.1" value={Math.min(currentTime, duration || 1)} onChange={(event) => seek(Number(event.target.value))} disabled={!ready || !duration} className="youtube-progress mb-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-cyan-300 disabled:cursor-not-allowed disabled:opacity-40" />
        <div className="flex items-center gap-2 text-cyan-50 sm:gap-3">
          <button type="button" onClick={togglePlayback} disabled={!ready} className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-300 text-[#07101e] transition hover:bg-cyan-200 disabled:opacity-40" aria-label={playing ? 'Pause video' : 'Play video'} data-testid="button-youtube-play">{playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}</button>
          <button type="button" onClick={skipIntro} disabled={!ready} className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200/25 px-3 py-2 font-mono-app text-[9px] uppercase tracking-widest text-cyan-100 transition hover:border-cyan-200/70 hover:bg-cyan-200/10 disabled:opacity-40" aria-label="Skip intro by 90 seconds" data-testid="button-skip-intro"><RotateCcw size={12} /> Skip intro <span className="text-cyan-300">+90</span></button>
          <span className="ml-auto whitespace-nowrap font-mono-app text-[10px] tabular-nums text-cyan-100/75">{formatTime(currentTime)} <span className="text-cyan-100/35">/</span> {formatTime(duration)}</span>
          <button type="button" onClick={toggleMute} disabled={!ready} className="hidden h-8 w-8 items-center justify-center rounded-full text-cyan-100/80 transition hover:bg-cyan-200/10 hover:text-cyan-100 sm:flex" aria-label={muted ? 'Unmute video' : 'Mute video'}>{muted ? <Volume2 size={15} className="opacity-40" /> : <Volume2 size={15} />}</button>
          <button type="button" onClick={fullscreen} disabled={!ready} className="hidden h-8 w-8 items-center justify-center rounded-full text-cyan-100/80 transition hover:bg-cyan-200/10 hover:text-cyan-100 sm:flex" aria-label="Fullscreen video"><Maximize size={15} /></button>
        </div>
      </div>
    </div>
  );
}