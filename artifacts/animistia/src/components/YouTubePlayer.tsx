import { useEffect, useMemo, useRef, useState } from 'react';
import { Captions, Maximize, Pause, Play, RotateCcw, Volume2 } from 'lucide-react';
import { Link } from 'wouter';


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

type CaptionCue = { start: number; end: number; text: string };

function parseCaptionTime(value: string) {
  const parts = value.trim().replace(',', '.').split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] * 60 + parts[1];
}

function parseVtt(text: string): CaptionCue[] {
  const lines = text.replace(/\r/g, '').split('\n');
  const cues: CaptionCue[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const timing = lines[index].match(/(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{3})\s+-->\s+(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{3})/);
    if (!timing) continue;
    const cueLines: string[] = [];
    for (let next = index + 1; next < lines.length && lines[next].trim(); next += 1) cueLines.push(lines[next].replace(/<[^>]+>/g, ''));
    cues.push({ start: parseCaptionTime(timing[1]), end: parseCaptionTime(timing[2]), text: cueLines.join(' ').trim() });
    index += cueLines.length;
  }
  return cues.filter((cue) => cue.text);
}

export function YouTubePlayer({ videoId, title, seriesTitle, episodeLabel, captionsText, onNextEpisode, mediaType }: { videoId: string; title: string; seriesTitle: string; episodeLabel: string; captionsText?: string | null; onNextEpisode?: () => void; mediaType?: string }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayerState | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const captionCues = useMemo(() => (captionsText ? parseVtt(captionsText) : []), [captionsText]);
  const activeCaption = useMemo(() => captionCues.find((cue) => currentTime >= cue.start && currentTime <= cue.end), [captionCues, currentTime]);
  const [showNextEpOverlay, setShowNextEpOverlay] = useState(false);


  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setCaptionsEnabled(false);

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
          cc_load_policy: 0,
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

  //-----LAST 12 SECONDS CUT[START]-----//
  
  useEffect(() => {
    if (!ready || showNextEpOverlay) return;

    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;

      const time = player.getCurrentTime();
      const videoDuration = player.getDuration();

      setCurrentTime(time);
      setDuration(videoDuration);

      // 🚀 DYNAMIC THRESHOLD: 5 seconds for movies, 12 seconds for series
      const secondsBeforeEnd = mediaType === 'movie' ? 5 : 12;

      // Check if the video has hit the calculated end mark
      if (videoDuration > 0 && time >= (videoDuration - secondsBeforeEnd)) {
        player.pauseVideo();         // Freeze the feed safely
        setPlaying(false);           // Update UI play states
        setShowNextEpOverlay(true);  // Display our custom popup card layout
        window.clearInterval(timer); // Shut down timer instance
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [ready, duration, playing, showNextEpOverlay, mediaType]);


  //-----LAST 12 SECONDS CUT[END]-----//


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
    shellRef.current?.requestFullscreen?.();
  };

  return (
    <div ref={shellRef} className="youtube-player-shell absolute inset-0 bg-[#080d1a]">
      <div ref={mountRef} className="absolute inset-0 overflow-hidden rounded-2xl [&>iframe]:h-full [&>iframe]:w-full" />
      {!ready && <div className="absolute inset-0 flex items-center justify-center bg-[#0d1020]/90"><span className="font-mono-app text-[10px] uppercase tracking-[.22em] text-cyan-200/70">Initializing screening room</span></div>}
      <div className="pointer-events-auto absolute inset-x-3 top-3 rounded-2xl px-4 py-3 sm:inset-x-0 sm:top-0 sm:px-0"></div>


      <div className="pointer-events-auto absolute inset-x-3 top-3 rounded-2xl border border-cyan-200/20 bg-[#10152a]/70 px-4 py-3 shadow-[0_0_30px_rgba(44,226,255,.1)] backdrop-blur-xl sm:inset-x-5 sm:top-3 sm:px-5">
        <div className="font-mono-app text-[9px] uppercase tracking-[.22em] text-cyan-200/70">Now screening</div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1"><span className="font-display text-lg text-white sm:text-xl">{seriesTitle}</span><span className="font-mono-app text-[10px] uppercase tracking-widest text-cyan-100/70">{episodeLabel}</span></div>
      </div>
      {captionsEnabled && activeCaption && <div className="pointer-events-none absolute inset-x-5 bottom-28 z-20 flex justify-center text-center sm:bottom-32"><span className="max-w-[85%] rounded-lg bg-black/75 px-4 py-2 text-sm font-medium leading-6 text-white shadow-lg backdrop-blur-sm sm:text-base">{activeCaption.text}</span></div>}
      <div className="absolute inset-x-3 bottom-1 rounded-2xl border border-cyan-200/20 bg-[#10152a]/80 p-3 pb-4 shadow-[0_0_30px_rgba(44,226,255,.14)] backdrop-blur-xl sm:inset-x-5 sm:bottom-2 sm:p-4 sm:pb-5">
        <input aria-label="Video progress" type="range" min="0" max={Math.max(duration, 1)} step="0.1" value={Math.min(currentTime, duration || 1)} onChange={(event) => seek(Number(event.target.value))} disabled={!ready || !duration} className="youtube-progress mb-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-cyan-300 disabled:cursor-not-allowed disabled:opacity-40" />
        <div className="flex items-center gap-2 text-cyan-50 sm:gap-3">
          <button type="button" onClick={togglePlayback} disabled={!ready} className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-300 text-[#07101e] transition hover:bg-cyan-200 disabled:opacity-40" aria-label={playing ? 'Pause video' : 'Play video'} data-testid="button-youtube-play">{playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}</button>
          <button type="button" onClick={skipIntro} disabled={!ready} className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200/25 px-3 py-2 font-mono-app text-[9px] uppercase tracking-widest text-cyan-100 transition hover:border-cyan-200/70 hover:bg-cyan-200/10 disabled:opacity-40" aria-label="Skip intro by 90 seconds" data-testid="button-skip-intro"><RotateCcw size={12} /> Skip intro <span className="text-cyan-300">+90</span></button>
          <span className="ml-auto whitespace-nowrap font-mono-app text-[10px] tabular-nums text-cyan-100/75">{formatTime(currentTime)} <span className="text-cyan-100/35">/</span> {formatTime(duration)}</span>
           <button type="button" onClick={() => setCaptionsEnabled((enabled) => !enabled)} disabled={!captionCues.length} className={`flex h-8 items-center gap-1 rounded-full px-2 font-mono-app text-[9px] uppercase tracking-widest transition sm:px-2.5 ${captionsEnabled ? 'bg-cyan-300 text-[#07101e]' : 'text-cyan-100/80 hover:bg-cyan-200/10 hover:text-cyan-100'} disabled:opacity-35`} aria-label={captionsEnabled ? 'Hide captions' : 'Show captions'} aria-pressed={captionsEnabled}><Captions size={15} /><span className="hidden sm:inline">CC</span></button>
          <button type="button" onClick={toggleMute} disabled={!ready} className="hidden h-8 w-8 items-center justify-center rounded-full text-cyan-100/80 transition hover:bg-cyan-200/10 hover:text-cyan-100 sm:flex" aria-label={muted ? 'Unmute video' : 'Mute video'}>{muted ? <Volume2 size={15} className="opacity-40" /> : <Volume2 size={15} />}</button>
          <button type="button" onClick={fullscreen} disabled={!ready} className="hidden h-8 w-8 items-center justify-center rounded-full text-cyan-100/80 transition hover:bg-cyan-200/10 hover:text-cyan-100 sm:flex" aria-label="Fullscreen video"><Maximize size={15} /></button>
        </div>
      </div>
      {/*-----NEXT EPISODE OVERLAY[START]-----*/}
      {/* 🎬 ANIMISTIA NEXT EPISODE POPUP OVERLAY */}
      {showNextEpOverlay && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 px-6 animate-fade-in text-center backdrop-blur-md">
          <div className="max-w-md rounded-2xl border border-cyan-400/20 bg-[#10152a]/90 p-8 shadow-[0_0_50px_rgba(44,226,255,0.15)]">
            <div className="font-mono-app text-xs uppercase tracking-[0.25em] text-cyan-300">Finished Presentation</div>
            <h3 className="mt-2 font-display text-2xl font-bold text-white">Thanks for watching!</h3>
            <p className="mt-2 text-sm text-cyan-100/60">Ready to find out what happens next in the story?</p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              {/* Conditional Button: Shows 'Next Episode' for series, 'Browse' for movies */}
              {mediaType === 'movie' ? (
                <Link href="/browse" className="rounded-full bg-cyan-300 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-[#07101e] transition hover:bg-cyan-200 text-center no-underline">
                  Browse Archive ➔
                </Link>
              ) : (
                <button 
                  type="button"
                  onClick={() => {
                    setShowNextEpOverlay(false);
                    if (onNextEpisode) onNextEpisode();
                  }}
                  className="rounded-full bg-cyan-300 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-[#07101e] transition hover:bg-cyan-200"
                >
                  Next Episode ➔
                </button>
              )}

              {/* Replay Episode Button */}
              <button 
                type="button"
                onClick={() => {
                  setCurrentTime(0);
                  setShowNextEpOverlay(false);
                  playerRef.current?.seekTo(0, true);
                  playerRef.current?.playVideo();
                  setPlaying(true);
                }}
                className="rounded-full border border-white/10 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white/5"
              >
                Replay
              </button>
            </div>

          </div>
        </div>
      )}

      {/*-----NEXT EPISODE OVERLAY[END]-----*/}
    </div>
  );
}