import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, Clock3, Maximize, Pause, Play, Plus, Share2, Star, Volume2 } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { getGetShowQueryKey, getGetStorageObjectQueryKey, getListEpisodesQueryKey, getListSeasonsQueryKey, useGetShow, useGetStorageObject, useListEpisodes, useListSeasons, useListShows } from '@workspace/api-client-react';
import { Shell, LoadingGrid } from '@/components/AnimistiaShell';
import { ShowCard } from '@/components/ShowCard';
import { YouTubePlayer } from '@/components/YouTubePlayer';
import { demoShows, getVideoId } from '@/lib/catalog';

export default function Watch() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const isDemoShow = demoShows.some((item) => item.id === id);
  const showQuery = useGetShow(id, { query: { enabled: !isDemoShow, queryKey: getGetShowQueryKey(id) } });
  const all = useListShows();
  const show = showQuery.data ?? demoShows.find((item) => item.id === id) ?? demoShows[0];
  const isSeries = show.mediaType === 'series';
  const seasonsQuery = useListSeasons(id, { query: { enabled: isSeries && Boolean(showQuery.data), queryKey: getListSeasonsQueryKey(id) } });
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<number | null>(null);
  const selectedSeason = seasonsQuery.data?.find((season) => season.id === selectedSeasonId) ?? seasonsQuery.data?.[0];
  const episodesQuery = useListEpisodes(selectedSeason?.id ?? 0, { query: { enabled: Boolean(selectedSeason?.id), queryKey: getListEpisodesQueryKey(selectedSeason?.id ?? 0) } });
  const currentEpisode = episodesQuery.data?.find((episode) => episode.id === selectedEpisodeId) ?? episodesQuery.data?.[0];
  const activeSourceType = currentEpisode?.sourceType ?? show.sourceType;
  const activeVideoUrl = currentEpisode?.videoUrl ?? show.videoUrl;
  const storagePath = (currentEpisode?.videoPath ?? show.videoPath)?.replace(/^\/objects\//, '') ?? '';
  const storedVideo = useGetStorageObject(storagePath, { query: { enabled: activeSourceType === 'uploaded' && Boolean(storagePath), queryKey: getGetStorageObjectQueryKey(storagePath) } });
  const [storedVideoUrl, setStoredVideoUrl] = useState('');
  useEffect(() => { if (!storedVideo.data) return; const url = URL.createObjectURL(storedVideo.data); setStoredVideoUrl(url); return () => URL.revokeObjectURL(url); }, [storedVideo.data]);
  useEffect(() => {
    if (!selectedSeasonId && seasonsQuery.data?.[0]) setSelectedSeasonId(seasonsQuery.data[0].id);
    if (selectedSeasonId && !seasonsQuery.data?.some((season) => season.id === selectedSeasonId)) setSelectedSeasonId(seasonsQuery.data?.[0]?.id ?? null);
  }, [seasonsQuery.data, selectedSeasonId]);
  useEffect(() => {
    if (!selectedEpisodeId && episodesQuery.data?.[0]) setSelectedEpisodeId(episodesQuery.data[0].id);
    if (selectedEpisodeId && !episodesQuery.data?.some((episode) => episode.id === selectedEpisodeId)) setSelectedEpisodeId(episodesQuery.data?.[0]?.id ?? null);
  }, [episodesQuery.data, selectedEpisodeId]);
  const [saved, setSaved] = useState(() => localStorage.getItem(`animistia-saved-${show.id}`) === '1');
  const [playing, setPlaying] = useState(false);
  const related = useMemo(() => (all.data?.length ? all.data : demoShows).filter((item) => item.id !== show.id).slice(0, 4), [all.data, show.id]);
  const save = () => { setSaved(!saved); localStorage.setItem(`animistia-saved-${show.id}`, !saved ? '1' : '0'); };
  if (showQuery.isLoading && !show) return <Shell><div className="mx-auto max-w-[1200px] px-5 py-16"><LoadingGrid count={1} /></div></Shell>;
  return <Shell><div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12"><Link href="/browse" className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground transition hover:text-primary" data-testid="link-back-catalog"><ArrowLeft size={14} /> Back to catalog</Link>
    <div className="grid gap-10 lg:grid-cols-[1fr_340px]"><div><div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0f] shadow-2xl">
       {activeSourceType === 'youtube' && getVideoId(activeVideoUrl) ? <YouTubePlayer key={`${currentEpisode?.id ?? show.id}-${getVideoId(activeVideoUrl)}`} videoId={getVideoId(activeVideoUrl)} title={currentEpisode?.title ?? show.title} /> : storedVideoUrl ? <video src={storedVideoUrl} controls className="h-full w-full" data-testid="video-uploaded-player" /> : <div className="relative flex h-full flex-col items-center justify-center overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 38%, rgba(206,157,109,.24), transparent 27%), linear-gradient(135deg,#16151d,#27212d)' }}><div className="absolute h-[130%] w-px rotate-45 bg-primary/20" /><div className="absolute h-[130%] w-px -rotate-45 bg-primary/20" /><button onClick={() => setPlaying(!playing)} className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:scale-105" aria-label={playing ? 'Pause preview' : 'Play preview'} data-testid="button-play-preview">{playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}</button><span className="relative mt-4 font-mono-app text-[10px] uppercase tracking-[.2em] text-white/60">{playing ? 'Preview playing' : isSeries && !currentEpisode ? 'Choose an episode' : 'Ready when you are'}</span></div>}
     </div><div className="mt-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="mb-2 font-mono-app text-[10px] uppercase tracking-[.2em] text-primary">{isSeries && currentEpisode ? `Season ${selectedSeason?.seasonNumber} / Episode ${String(currentEpisode.episodeNumber).padStart(2, '0')}` : isSeries ? 'Series / Choose an episode' : 'Feature presentation'}</div><h1 className="font-display text-4xl leading-tight sm:text-5xl">{currentEpisode?.title ?? show.title}</h1></div><div className="flex gap-2"><button onClick={save} className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-widest transition ${saved ? 'border-primary bg-primary text-primary-foreground' : 'border-white/15 text-muted-foreground hover:border-primary hover:text-primary'}`} data-testid="button-save-show">{saved ? <Check size={14} /> : <Plus size={14} />}{saved ? 'Saved' : 'My list'}</button><button onClick={() => navigator.clipboard?.writeText(window.location.href)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-muted-foreground transition hover:border-primary hover:text-primary" aria-label="Copy show link" data-testid="button-share-show"><Share2 size={14} /></button></div></div>
     <div className="mt-5 flex flex-wrap items-center gap-3 font-mono-app text-[10px] uppercase tracking-widest text-muted-foreground"><span>{show.year}</span><span className="h-1 w-1 rounded-full bg-primary" /><span>{isSeries ? `${show.episodesCount} episodes` : 'Movie'}</span><span className="h-1 w-1 rounded-full bg-primary" /><span className="flex items-center gap-1 text-primary"><Star size={11} fill="currentColor" />{show.rating.toFixed(1)}</span>{show.genres.map((genre) => <span key={genre} className="rounded border border-white/10 px-2 py-1 normal-case tracking-normal">{genre}</span>)}</div><p className="mt-6 max-w-2xl text-sm leading-7 text-muted-foreground">{currentEpisode?.synopsis || show.synopsis}</p>
     {isSeries && <SeriesEpisodes seasons={seasonsQuery.data ?? []} selectedSeason={selectedSeason} episodes={episodesQuery.data ?? []} selectedEpisodeId={currentEpisode?.id ?? null} onSeasonChange={(seasonId) => { setSelectedSeasonId(seasonId); setSelectedEpisodeId(null); }} onEpisodeChange={setSelectedEpisodeId} loading={seasonsQuery.isLoading || episodesQuery.isLoading} />}
    </div><aside><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-2xl">More like this</h2><ChevronDown size={17} className="text-primary" /></div><div className="space-y-4">{related.map((item) => <RelatedCard key={item.id} show={item} />)}</div><div className="mt-7 rounded-xl border border-white/10 bg-secondary/60 p-4"><div className="flex items-center gap-2 font-mono-app text-[10px] uppercase tracking-widest text-primary"><Clock3 size={13} /> A good evening</div><p className="mt-3 text-xs leading-5 text-muted-foreground">No rush. Let the next story find its own pace.</p></div></aside></div>
  </div></Shell>;
}

function SeriesEpisodes({ seasons, selectedSeason, episodes, selectedEpisodeId, onSeasonChange, onEpisodeChange, loading }: { seasons: import('@workspace/api-client-react').Season[]; selectedSeason?: import('@workspace/api-client-react').Season; episodes: import('@workspace/api-client-react').Episode[]; selectedEpisodeId: number | null; onSeasonChange: (id: number) => void; onEpisodeChange: (id: number) => void; loading: boolean }) {
  return <section className="mt-10 rounded-2xl border border-white/10 bg-secondary/50 p-5 sm:p-6" data-testid="series-episode-picker">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="font-mono-app text-[10px] uppercase tracking-widest text-primary">Continue the story</div><h2 className="mt-2 font-display text-2xl">Episodes.</h2></div>
      {seasons.length > 0 && <select value={selectedSeason?.id ?? ''} onChange={(event) => onSeasonChange(Number(event.target.value))} className="admin-input sm:max-w-[220px]" aria-label="Choose season">{seasons.map((season) => <option key={season.id} value={season.id}>Season {season.seasonNumber}{season.title ? ` · ${season.title}` : ''}</option>)}</select>}
    </div>
    {loading ? <p className="mt-5 text-sm text-muted-foreground">Loading episodes…</p> : episodes.length ? <div className="mt-5 grid gap-2 sm:grid-cols-2">{episodes.map((episode) => <button key={episode.id} type="button" onClick={() => onEpisodeChange(episode.id)} className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${selectedEpisodeId === episode.id ? 'border-primary/60 bg-primary/10' : 'border-white/10 hover:border-primary/40'}`}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[.06] font-mono-app text-[10px] text-primary">{String(episode.episodeNumber).padStart(2, '0')}</span><span className="min-w-0 truncate text-sm font-semibold">{episode.title}</span></button>)}</div> : <p className="mt-5 rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-muted-foreground">{seasons.length ? 'No episodes have been published in this season yet.' : 'Episodes will appear here once the series is published.'}</p>}
  </section>;
}

function RelatedCard({ show }: { show: import('@workspace/api-client-react').Show }) {
  return <Link href={`/watch/${show.id}`} className="group flex gap-3" data-testid={`link-related-${show.id}`}><div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg" style={{ background: 'linear-gradient(135deg,#252035,#bd796d)' }}><span className="absolute bottom-2 left-2 font-display text-2xl text-white/75">{show.title.slice(0, 1)}</span><div className="absolute inset-0 bg-black/10 transition group-hover:bg-transparent" /></div><div className="min-w-0 py-1"><h3 className="truncate text-sm font-semibold text-foreground transition group-hover:text-primary">{show.title}</h3><p className="mt-1 line-clamp-2 text-xs leading-4 text-muted-foreground">{show.genres.join(' · ')} / {show.year}</p></div></Link>;
}