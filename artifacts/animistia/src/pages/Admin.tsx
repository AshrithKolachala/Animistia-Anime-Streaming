import { useEffect, useState } from 'react';
import { Check, CloudUpload, Eye, Film, Layers3, LockKeyhole, Pencil, Plus, Save, ShieldCheck, Trash2, Upload, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  getGetDeveloperLockQueryKey, getGetHighlightsQueryKey, getListEpisodesQueryKey, getListSeasonsQueryKey, getListShowsQueryKey,
  useCreateEpisode, useCreateSeason, useCreateShow, useDeleteEpisode, useDeleteShow, useGetDeveloperLock, useHealthCheck,
  useListEpisodes, useListSeasons, useListShows, useRequestUploadUrl, useUpdateDeveloperLock, useUpdateShow, useVerifyDeveloperLock,
} from '@workspace/api-client-react';
import type { Episode, MediaType, Show, ShowInput, ShowSourceType } from '@workspace/api-client-react';
import { Shell } from '@/components/AnimistiaShell';
import { demoShows, getAssetUrl } from '@/lib/catalog';

const emptyForm: ShowInput = { title: '', synopsis: '', genres: [], year: new Date().getFullYear(), rating: 4.2, episodesCount: 1, mediaType: 'movie', thumbnailUrl: null, bannerUrl: null, sourceType: 'uploaded', videoUrl: null, videoPath: null, captionsPath: null, featured: false };

export default function Admin() {
  const queryClient = useQueryClient();
  const showsQuery = useListShows();
  const shows = showsQuery.data?.length ? showsQuery.data : demoShows;
  const [selectedShowId, setSelectedShowId] = useState<number | null>(null);
  const selectedShow = shows.find((show) => show.id === selectedShowId);
  const lockQuery = useGetDeveloperLock();
  const health = useHealthCheck();
  const createShow = useCreateShow();
  const updateShow = useUpdateShow();
  const deleteShow = useDeleteShow();
  const requestUpload = useRequestUploadUrl();
  const createSeason = useCreateSeason();
  const createEpisode = useCreateEpisode();
  const deleteEpisode = useDeleteEpisode();
  const updateLock = useUpdateDeveloperLock();
  const verifyLock = useVerifyDeveloperLock();
  const seasonsQuery = useListSeasons(selectedShow?.id ?? 0, { query: { enabled: Boolean(selectedShow?.mediaType === 'series'), queryKey: getListSeasonsQueryKey(selectedShow?.id ?? 0) } });
  const seasons = seasonsQuery.data ?? [];
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const episodesQuery = useListEpisodes(selectedSeasonId ?? 0, { query: { enabled: Boolean(selectedSeasonId), queryKey: getListEpisodesQueryKey(selectedSeasonId ?? 0) } });
  const episodes = episodesQuery.data ?? [];
  const [form, setForm] = useState<ShowInput>(emptyForm);
  const [genresText, setGenresText] = useState('');
  const [seasonNumber, setSeasonNumber] = useState(1);
  const [seasonTitle, setSeasonTitle] = useState('');
  const [episode, setEpisode] = useState({ episodeNumber: 1, title: '', synopsis: '', sourceType: 'uploaded' as ShowSourceType, videoUrl: null as string | null, videoPath: null as string | null, captionsPath: null as string | null });
  const [notice, setNotice] = useState('');
  const [lockPassword, setLockPassword] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [verified, setVerified] = useState(false);
  const [uploading, setUploading] = useState<'movie' | 'episode' | 'portrait' | 'landscape' | 'movie-caption' | 'episode-caption' | null>(null);
  const lock = lockQuery.data;
  const needsUnlock = Boolean(lock?.enabled && lock.configured && !verified);
  const isBusy = createShow.isPending || updateShow.isPending || createSeason.isPending || createEpisode.isPending;

  useEffect(() => {
    if (selectedShow?.mediaType !== 'series') {
      setSelectedSeasonId(null);
      return;
    }
    if (!selectedSeasonId || !seasons.some((season) => season.id === selectedSeasonId)) setSelectedSeasonId(seasons[0]?.id ?? null);
  }, [selectedShow?.mediaType, selectedSeasonId, seasons]);

  const resetShowForm = () => {
    setForm(emptyForm);
    setGenresText('');
    setSelectedShowId(null);
    setSelectedSeasonId(null);
  };

  const editShow = (show: Show) => {
    setSelectedShowId(show.id);
    setForm({ title: show.title, synopsis: show.synopsis, genres: show.genres, year: show.year, rating: show.rating, episodesCount: show.episodesCount, mediaType: show.mediaType, thumbnailUrl: show.thumbnailUrl, bannerUrl: show.bannerUrl, sourceType: show.sourceType, videoUrl: show.videoUrl, videoPath: show.videoPath, captionsPath: show.captionsPath, featured: show.featured });
    setGenresText(show.genres.join(', '));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveShow = (event: React.FormEvent) => {
    event.preventDefault();
    const payload: ShowInput = {
      ...form,
      mediaType: form.mediaType,
      sourceType: form.mediaType === 'series' ? 'youtube' : form.sourceType,
      videoUrl: form.mediaType === 'series' ? null : form.videoUrl,
      videoPath: form.mediaType === 'series' ? null : form.videoPath,
      genres: genresText.split(',').map((genre) => genre.trim()).filter(Boolean),
      year: Number(form.year), rating: Number(form.rating), episodesCount: form.mediaType === 'series' ? 0 : 1,
    };
    const options = {
      onSuccess: (show: Show) => {
        setNotice(selectedShowId ? 'Title updated.' : `${show.mediaType === 'series' ? 'Series created. Add a season below.' : 'Movie added to the archive.'}`);
        queryClient.invalidateQueries({ queryKey: getListShowsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetHighlightsQueryKey() });
        setSelectedShowId(show.mediaType === 'series' ? show.id : null);
        if (show.mediaType !== 'series') resetShowForm();
      },
      onError: () => setNotice('That change could not be saved. Check the fields and try again.'),
    };
    if (selectedShowId) updateShow.mutate({ id: selectedShowId, data: payload }, options);
    else createShow.mutate({ data: payload }, options);
  };

  const removeShow = (id: number, title: string) => {
    if (!window.confirm(`Remove ${title} and its seasons/episodes from the catalog?`)) return;
    deleteShow.mutate({ id }, { onSuccess: () => { setNotice('Title removed from the archive.'); if (selectedShowId === id) resetShowForm(); queryClient.invalidateQueries({ queryKey: getListShowsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetHighlightsQueryKey() }); }, onError: () => setNotice('The title could not be removed.') });
  };

  const saveSeason = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedShowId) return;
    createSeason.mutate({ showId: selectedShowId, data: { seasonNumber: Number(seasonNumber), title: seasonTitle || undefined } }, {
      onSuccess: (season) => { setSelectedSeasonId(season.id); setSeasonNumber(season.seasonNumber + 1); setSeasonTitle(''); setNotice(`Season ${season.seasonNumber} created. Add episodes one by one.`); queryClient.invalidateQueries({ queryKey: getListSeasonsQueryKey(selectedShowId) }); },
      onError: () => setNotice('That season number already exists.'),
    });
  };

  const saveEpisode = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSeasonId) return;
    createEpisode.mutate({ seasonId: selectedSeasonId, data: { ...episode, episodeNumber: Number(episode.episodeNumber), title: episode.title, synopsis: episode.synopsis, videoUrl: episode.videoUrl, videoPath: episode.videoPath, captionsPath: episode.captionsPath } }, {
      onSuccess: (created) => { setEpisode({ episodeNumber: created.episodeNumber + 1, title: '', synopsis: '', sourceType: 'uploaded', videoUrl: null, videoPath: null, captionsPath: null }); setNotice(`Episode ${created.episodeNumber} published.`); queryClient.invalidateQueries({ queryKey: getListEpisodesQueryKey(selectedSeasonId) }); queryClient.invalidateQueries({ queryKey: getListShowsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetHighlightsQueryKey() }); },
      onError: () => setNotice('That episode could not be saved. Check the video and episode number.'),
    });
  };

  const uploadFile = (kind: 'movie' | 'episode' | 'portrait' | 'landscape' | 'movie-caption' | 'episode-caption') => async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(kind);
    setNotice('Preparing secure upload...');
    const isImage = kind === 'portrait' || kind === 'landscape';
    const isCaption = kind === 'movie-caption' || kind === 'episode-caption';
    const contentType = file.type || (isImage ? 'image/png' : isCaption ? 'text/vtt' : 'video/mp4');
    requestUpload.mutate({ data: { name: file.name, size: file.size, contentType } }, {
      onSuccess: async (response) => {
        try {
          const result = await fetch(response.uploadURL, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file });
          if (!result.ok) throw new Error('upload');
          if (kind === 'movie') setForm((current) => ({ ...current, sourceType: 'uploaded', videoPath: response.objectPath, videoUrl: null }));
          else if (kind === 'episode') setEpisode((current) => ({ ...current, sourceType: 'uploaded', videoPath: response.objectPath, videoUrl: null }));
          else if (kind === 'movie-caption') setForm((current) => ({ ...current, captionsPath: response.objectPath }));
          else if (kind === 'episode-caption') setEpisode((current) => ({ ...current, captionsPath: response.objectPath }));
          else setForm((current) => ({ ...current, [kind === 'portrait' ? 'thumbnailUrl' : 'bannerUrl']: response.objectPath }));
          setNotice(`${kind === 'movie' ? 'Movie' : kind === 'episode' ? 'Episode' : kind === 'movie-caption' || kind === 'episode-caption' ? 'Caption' : kind === 'portrait' ? 'Portrait logo' : 'Landscape logo'} upload complete. Save it to publish.`);
        } catch { setNotice('Upload failed. Please try the file again.'); }
        finally { setUploading(null); }
      },
      onError: () => { setNotice('Could not prepare upload.'); setUploading(null); },
    });
  };

  const configureLock = (event: React.FormEvent) => {
    event.preventDefault();
    updateLock.mutate({ data: { enabled: lock?.enabled ?? false, password: lockPassword || null } }, { onSuccess: () => { setLockPassword(''); setNotice('Developer lock configuration saved.'); queryClient.invalidateQueries({ queryKey: getGetDeveloperLockQueryKey() }); } });
  };
  const verify = (event: React.FormEvent) => {
    event.preventDefault();
    verifyLock.mutate({ data: { password: verifyPassword } }, { onSuccess: (result) => { setVerified(result.verified); setNotice(result.verified ? 'Developer access verified.' : 'That password did not match.'); } });
  };
  const toggleLock = () => updateLock.mutate({ data: { enabled: !(lock?.enabled ?? false), password: null } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetDeveloperLockQueryKey() }) });

  return <Shell><div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="font-mono-app text-[10px] uppercase tracking-[.2em] text-primary">Developer room / private</div><h1 className="mt-3 font-display text-5xl tracking-tight sm:text-7xl">Shape the archive.</h1><p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">Choose movie or series. Series get seasons, then one episode upload at a time.</p></div><div className="flex items-center gap-2 rounded-full border border-white/10 bg-secondary px-3 py-2 font-mono-app text-[9px] uppercase tracking-widest text-muted-foreground"><span className={`h-2 w-2 rounded-full ${health.data?.status === 'ok' ? 'bg-emerald-400' : 'bg-primary'}`} /> API {health.data?.status ?? 'ready'}</div></div>
    {notice && <div className="mt-8 flex items-center justify-between rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-primary" data-testid="status-admin-notice"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notice"><X size={15} /></button></div>}
    <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
      {needsUnlock ? <UnlockRequired /> : <section className="space-y-8">
        <section className="rounded-2xl border border-white/[.08] bg-secondary/40 p-5 sm:p-7"><div className="mb-6 flex items-center justify-between"><div><div className="font-mono-app text-[10px] uppercase tracking-widest text-primary">{selectedShowId ? 'Edit title' : 'New title'}</div><h2 className="mt-2 font-display text-3xl">{selectedShowId ? 'Refine a story.' : 'Add to the constellation.'}</h2></div>{selectedShowId && <button onClick={resetShowForm} className="text-xs text-muted-foreground hover:text-primary">New title</button>}</div>
          <form onSubmit={saveShow} className="space-y-5">
            <div className="grid grid-cols-2 gap-2"><TypeChoice value="movie" selected={form.mediaType} onChange={(value) => setForm({ ...form, mediaType: value, sourceType: value === 'movie' ? 'uploaded' : 'youtube', videoUrl: null, videoPath: null })} icon={<Film size={16} />} label="Movie" /><TypeChoice value="series" selected={form.mediaType} onChange={(value) => setForm({ ...form, mediaType: value, sourceType: 'youtube', videoUrl: null, videoPath: null, episodesCount: 0 })} icon={<Layers3 size={16} />} label="Series" /></div>
            <Field label="Title"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. The Glass Garden" className="admin-input" /></Field>
            <Field label="Synopsis"><textarea required rows={4} value={form.synopsis} onChange={(e) => setForm({ ...form, synopsis: e.target.value })} placeholder="What stays with the viewer?" className="admin-input resize-none" /></Field>
             <div className="grid gap-4 sm:grid-cols-3"><Field label="Year"><input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} className="admin-input" /></Field><Field label="Rating"><input type="number" min="0" max="10" step=".1" value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} className="admin-input" /></Field><Field label="Genres"><input value={genresText} onChange={(e) => setGenresText(e.target.value)} placeholder="Drama, Fantasy" className="admin-input" /></Field></div>
             <div className="grid gap-4 sm:grid-cols-2"><ImagePicker label="Portrait logo / card art" value={form.thumbnailUrl} uploading={uploading === 'portrait'} onChange={uploadFile('portrait')} /><ImagePicker label="Landscape logo / hero art" value={form.bannerUrl} uploading={uploading === 'landscape'} onChange={uploadFile('landscape')} /></div>
            <Field label="Featured"><label className="flex h-11 items-center gap-3 rounded-lg border border-white/10 bg-[#121218] px-3 text-xs text-muted-foreground"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="accent-[hsl(var(--primary))]" /> Place in hero spotlight</label></Field>
             {form.mediaType === 'movie' && <><Field label="Movie source"><select value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value as ShowSourceType, videoUrl: null, videoPath: null })} className="admin-input"><option value="uploaded">Upload video</option><option value="youtube">YouTube URL</option></select></Field>{form.sourceType === 'youtube' ? <Field label="YouTube URL"><input required value={form.videoUrl ?? ''} onChange={(e) => setForm({ ...form, videoUrl: e.target.value, videoPath: null })} placeholder="https://youtube.com/watch?v=..." className="admin-input" /></Field> : <VideoPicker value={Boolean(form.videoPath)} uploading={uploading === 'movie'} onChange={uploadFile('movie')} />}<CaptionPicker value={form.captionsPath} uploading={uploading === 'movie-caption'} onChange={uploadFile('movie-caption')} /></>}
            <button disabled={isBusy || Boolean(uploading)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50">{isBusy ? 'Saving...' : selectedShowId ? <><Save size={14} /> Save changes</> : <><Plus size={14} /> Create {form.mediaType}</>}</button>
          </form>
        </section>
         {selectedShow?.mediaType === 'series' && <SeriesManager seasons={seasons} selectedSeasonId={selectedSeasonId} setSelectedSeasonId={setSelectedSeasonId} seasonNumber={seasonNumber} setSeasonNumber={setSeasonNumber} seasonTitle={seasonTitle} setSeasonTitle={setSeasonTitle} saveSeason={saveSeason} episodes={episodes} episode={episode} setEpisode={setEpisode} saveEpisode={saveEpisode} deleteEpisode={(id) => deleteEpisode.mutate({ id }, { onSuccess: () => { setNotice('Episode removed.'); if (selectedSeasonId) queryClient.invalidateQueries({ queryKey: getListEpisodesQueryKey(selectedSeasonId) }); queryClient.invalidateQueries({ queryKey: getListShowsQueryKey() }); } })} uploading={uploading === 'episode'} uploadingCaption={uploading === 'episode-caption'} uploadEpisode={uploadFile('episode')} uploadCaption={uploadFile('episode-caption')} busy={isBusy || deleteEpisode.isPending} />}
      </section>}
      <section className="space-y-8"><LockPanel lock={lock} password={lockPassword} setPassword={setLockPassword} onSave={configureLock} verifyPassword={verifyPassword} setVerifyPassword={setVerifyPassword} onVerify={verify} verified={verified} onToggle={toggleLock} pending={updateLock.isPending || verifyLock.isPending} /><div className="rounded-2xl border border-white/[.08] bg-secondary/40 p-5 sm:p-7"><div className="flex items-center justify-between"><div><div className="font-mono-app text-[10px] uppercase tracking-widest text-primary">Catalog / {shows.length}</div><h2 className="mt-2 font-display text-3xl">Published titles.</h2></div><Link href="/browse" className="text-xs font-bold uppercase tracking-widest text-primary">Preview</Link></div><div className="mt-6 space-y-2">{shows.slice(0, 10).map((show) => <div key={show.id} className={`group flex items-center justify-between gap-3 rounded-xl border p-2 transition ${selectedShowId === show.id ? 'border-primary/30 bg-primary/5' : 'border-transparent hover:border-white/10 hover:bg-white/[.03]'}`}><button onClick={() => editShow(show)} className="min-w-0 flex-1 text-left"><p className="truncate text-sm font-semibold">{show.title}</p><p className="mt-1 font-mono-app text-[9px] uppercase tracking-widest text-muted-foreground">{show.mediaType} / {show.episodesCount} {show.mediaType === 'series' ? 'eps' : 'film'} {show.featured && '/ featured'}</p></button><button onClick={() => removeShow(show.id, show.title)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Delete ${show.title}`}><Trash2 size={13} /></button></div>)}</div></div></section>
    </div>
  </div></Shell>;
}

 function SeriesManager({ seasons, selectedSeasonId, setSelectedSeasonId, seasonNumber, setSeasonNumber, seasonTitle, setSeasonTitle, saveSeason, episodes, episode, setEpisode, saveEpisode, deleteEpisode, uploading, uploadingCaption, uploadEpisode, uploadCaption, busy }: { seasons: import('@workspace/api-client-react').Season[]; selectedSeasonId: number | null; setSelectedSeasonId: (id: number) => void; seasonNumber: number; setSeasonNumber: (value: number) => void; seasonTitle: string; setSeasonTitle: (value: string) => void; saveSeason: (event: React.FormEvent) => void; episodes: Episode[]; episode: { episodeNumber: number; title: string; synopsis: string; sourceType: ShowSourceType; videoUrl: string | null; videoPath: string | null; captionsPath: string | null }; setEpisode: (episode: { episodeNumber: number; title: string; synopsis: string; sourceType: ShowSourceType; videoUrl: string | null; videoPath: string | null; captionsPath: string | null }) => void; saveEpisode: (event: React.FormEvent) => void; deleteEpisode: (id: number) => void; uploading: boolean; uploadingCaption: boolean; uploadEpisode: (event: React.ChangeEvent<HTMLInputElement>) => void; uploadCaption: (event: React.ChangeEvent<HTMLInputElement>) => void; busy: boolean }) {
  return (
    <section className="rounded-2xl border border-primary/20 bg-primary/[.03] p-5 sm:p-7">
      <div className="font-mono-app text-[10px] uppercase tracking-widest text-primary">Series workflow</div>
      <h2 className="mt-2 font-display text-3xl">Seasons, then episodes.</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Create a season first. Each save publishes exactly one episode video.</p>
      <form onSubmit={saveSeason} className="mt-6 flex flex-col gap-2 sm:flex-row">
        <input type="number" min="1" required value={seasonNumber} onChange={(e) => setSeasonNumber(Number(e.target.value))} className="admin-input sm:w-28" placeholder="Season" />
        <input value={seasonTitle} onChange={(e) => setSeasonTitle(e.target.value)} className="admin-input flex-1" placeholder="Season title (optional)" />
        <button disabled={busy} className="flex items-center justify-center gap-2 rounded-lg border border-primary/40 px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary"><Plus size={14} /> Season</button>
      </form>
      {seasons.length > 0 && (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            {seasons.map((season) => <button key={season.id} type="button" onClick={() => setSelectedSeasonId(season.id)} className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${selectedSeasonId === season.id ? 'border-primary bg-primary text-primary-foreground' : 'border-white/10 text-muted-foreground hover:border-primary/50'}`}>S{String(season.seasonNumber).padStart(2, '0')}{season.title && ` · ${season.title}`}</button>)}
          </div>
          {selectedSeasonId && (
            <div className="mt-7 border-t border-white/10 pt-6">
              <div className="mb-4 flex items-center justify-between"><div><div className="font-mono-app text-[10px] uppercase tracking-widest text-primary">Episode upload</div><h3 className="mt-1 font-display text-2xl">Add the next chapter.</h3></div><span className="font-mono-app text-[10px] uppercase tracking-widest text-muted-foreground">{episodes.length} published</span></div>
              <form onSubmit={saveEpisode} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-[100px_1fr]"><Field label="Episode"><input type="number" min="1" required value={episode.episodeNumber} onChange={(e) => setEpisode({ ...episode, episodeNumber: Number(e.target.value) })} className="admin-input" /></Field><Field label="Title"><input required value={episode.title} onChange={(e) => setEpisode({ ...episode, title: e.target.value })} placeholder="Episode title" className="admin-input" /></Field></div>
                <Field label="Synopsis"><textarea rows={2} value={episode.synopsis} onChange={(e) => setEpisode({ ...episode, synopsis: e.target.value })} placeholder="Optional episode synopsis" className="admin-input resize-none" /></Field>
                <Field label="Episode source"><select value={episode.sourceType} onChange={(e) => setEpisode({ ...episode, sourceType: e.target.value as ShowSourceType, videoUrl: null, videoPath: null })} className="admin-input"><option value="uploaded">Upload video</option><option value="youtube">YouTube URL</option></select></Field>
                 {episode.sourceType === 'youtube' ? <Field label="YouTube URL"><input required value={episode.videoUrl ?? ''} onChange={(e) => setEpisode({ ...episode, videoUrl: e.target.value, videoPath: null })} placeholder="https://youtube.com/watch?v=..." className="admin-input" /></Field> : <VideoPicker value={Boolean(episode.videoPath)} uploading={uploading} onChange={uploadEpisode} />}
                 <CaptionPicker value={episode.captionsPath} uploading={uploadingCaption} onChange={uploadCaption} />
                <button disabled={busy || uploading || (!episode.videoPath && episode.sourceType === 'uploaded') || (!episode.videoUrl && episode.sourceType === 'youtube')} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50"><Upload size={14} /> Publish episode {episode.episodeNumber}</button>
              </form>
              <div className="mt-6 space-y-2">{episodes.map((item) => <div key={item.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-secondary/50 px-3 py-3"><div><span className="font-mono-app text-[10px] text-primary">EP {String(item.episodeNumber).padStart(2, '0')}</span><span className="ml-3 text-sm font-semibold">{item.title}</span></div><button type="button" onClick={() => deleteEpisode(item.id)} className="text-muted-foreground hover:text-destructive" aria-label={`Delete ${item.title}`}><Trash2 size={14} /></button></div>)}</div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function TypeChoice({ value, selected, onChange, icon, label }: { value: MediaType; selected: MediaType; onChange: (value: MediaType) => void; icon: React.ReactNode; label: string }) {
  return <button type="button" onClick={() => onChange(value)} className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold uppercase tracking-widest transition ${selected === value ? 'border-primary bg-primary text-primary-foreground' : 'border-white/10 text-muted-foreground hover:border-primary/50'}`}>{icon}{label}</button>;
}

function VideoPicker({ value, uploading, onChange }: { value: boolean; uploading: boolean; onChange: (event: React.ChangeEvent<HTMLInputElement>) => void }) {
  return <div><label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Video file</label><label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-4 transition hover:bg-primary/10"><span className="flex items-center gap-3 text-sm">{uploading ? <CloudUpload className="animate-pulse text-primary" size={19} /> : <Upload className="text-primary" size={19} />}{value ? 'Uploaded and ready' : 'Choose one MP4, WebM, or MOV'}</span><span className="rounded-full border border-primary/30 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">{uploading ? 'Uploading' : 'Browse'}</span><input type="file" accept="video/*" onChange={onChange} className="hidden" /></label></div>;
}

function ImagePicker({ label, value, uploading, onChange }: { label: string; value?: string | null; uploading: boolean; onChange: (event: React.ChangeEvent<HTMLInputElement>) => void }) {
  return <div><label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</label><label className="group relative flex min-h-28 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-cyan-200/25 bg-[#0e1424] transition hover:border-cyan-200/60">{value && <img src={getAssetUrl(value)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55 transition group-hover:opacity-35" />}<span className="relative z-10 rounded-full border border-cyan-100/30 bg-[#0e1424]/75 px-3 py-2 font-mono-app text-[9px] uppercase tracking-widest text-cyan-100 backdrop-blur">{uploading ? 'Uploading…' : value ? 'Replace image' : 'Choose image'}</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={onChange} className="hidden" /></label></div>;
}

function CaptionPicker({ value, uploading, onChange }: { value?: string | null; uploading: boolean; onChange: (event: React.ChangeEvent<HTMLInputElement>) => void }) {
  return <div><label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Custom captions / WebVTT</label><label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-cyan-200/25 bg-cyan-200/[.03] px-4 py-3 transition hover:border-cyan-200/60"><span className="flex items-center gap-3 text-sm text-muted-foreground"><span className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-200/25 text-[9px] font-bold text-cyan-100">CC</span>{uploading ? 'Uploading captions…' : value ? 'Caption track ready' : 'Choose a .vtt caption file'}</span><span className="rounded-full border border-cyan-100/25 px-3 py-1 font-mono-app text-[9px] uppercase tracking-widest text-cyan-100">{uploading ? 'Uploading' : 'Browse'}</span><input type="file" accept=".vtt,text/vtt" onChange={onChange} className="hidden" /></label></div>;
}

function LockPanel({ lock, password, setPassword, onSave, verifyPassword, setVerifyPassword, onVerify, verified, onToggle, pending }: { lock?: { enabled: boolean; configured: boolean }; password: string; setPassword: (value: string) => void; onSave: (event: React.FormEvent) => void; verifyPassword: string; setVerifyPassword: (value: string) => void; onVerify: (event: React.FormEvent) => void; verified: boolean; onToggle: () => void; pending: boolean }) {
  return <div className="rounded-2xl border border-white/[.08] bg-secondary/40 p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div><div className="font-mono-app text-[10px] uppercase tracking-widest text-primary">Access control</div><h2 className="mt-2 font-display text-3xl">Developer lock.</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">Keep upload tools behind a second door.</p></div><div className={`rounded-full p-2 ${lock?.enabled ? 'bg-primary/15 text-primary' : 'bg-white/5 text-muted-foreground'}`}><LockKeyhole size={17} /></div></div><div className="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-[#121218] p-3"><div><p className="text-sm font-semibold">{lock?.enabled ? 'Lock enabled' : 'Lock disabled'}</p><p className="mt-1 text-[11px] text-muted-foreground">{lock?.configured ? 'Password configured' : 'No password set'}</p></div><button onClick={onToggle} className={`relative h-6 w-11 rounded-full transition ${lock?.enabled ? 'bg-primary' : 'bg-white/15'}`} aria-label="Toggle developer lock"><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${lock?.enabled ? 'left-6' : 'left-1'}`} /></button></div><form onSubmit={onSave} className="mt-4 flex gap-2"><input minLength={4} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (4+ chars)" className="admin-input flex-1" /><button disabled={pending || password.length < 4} className="rounded-lg border border-primary/35 px-3 text-primary disabled:opacity-40"><ShieldCheck size={16} /></button></form><div className="my-5 h-px bg-white/10" /><form onSubmit={onVerify} className="flex gap-2"><input required type="password" value={verifyPassword} onChange={(e) => setVerifyPassword(e.target.value)} placeholder="Verify current password" className="admin-input flex-1" /><button disabled={pending} className={`rounded-lg border px-3 ${verified ? 'border-emerald-400/40 text-emerald-300' : 'border-white/15 text-muted-foreground'}`}>{verified ? <Check size={16} /> : <Eye size={16} />}</button></form></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>{children}</label>; }
function UnlockRequired() { return <section className="flex min-h-[430px] flex-col items-center justify-center rounded-2xl border border-primary/20 bg-primary/[.04] p-8 text-center sm:p-12"><div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary"><LockKeyhole size={22} /></div><div className="mt-6 font-mono-app text-[10px] uppercase tracking-[.2em] text-primary">Upload room locked</div><h2 className="mt-3 font-display text-4xl">Unlock to shape the archive.</h2><p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">Verify the developer password on the right to open upload and catalog controls.</p></section>; }