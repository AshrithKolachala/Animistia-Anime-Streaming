import { useEffect, useMemo, useState } from 'react';
import { Bookmark, Clock3, Play, Trash2 } from 'lucide-react';
import { Link } from 'wouter';
import { useListShows } from '@workspace/api-client-react';
import { Shell, SectionHeading } from '@/components/AnimistiaShell';
import { ShowCard } from '@/components/ShowCard';
import { demoShows } from '@/lib/catalog';

export default function Library() {
  const shows = useListShows();
  const catalog = shows.data?.length ? shows.data : demoShows;
  const [savedIds, setSavedIds] = useState<number[]>(() => demoShows.filter((show) => localStorage.getItem(`animistia-saved-${show.id}`) === '1').map((show) => show.id));
  useEffect(() => { setSavedIds(catalog.filter((show) => localStorage.getItem(`animistia-saved-${show.id}`) === '1').map((show) => show.id)); }, [catalog]);
  const saved = useMemo(() => catalog.filter((show) => savedIds.includes(show.id)), [catalog, savedIds]);
  const remove = (id: number) => { localStorage.removeItem(`animistia-saved-${id}`); setSavedIds((ids) => ids.filter((savedId) => savedId !== id)); };
  return <Shell><div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12"><div className="animate-rise"><div className="font-mono-app text-[10px] uppercase tracking-[.2em] text-primary">Your space / private archive</div><h1 className="mt-3 font-display text-6xl leading-[.9] tracking-[-.04em] sm:text-8xl">Keep the good stuff close.</h1><p className="mt-6 max-w-md text-sm leading-6 text-muted-foreground">Your saved discoveries, gathered in one quiet corner.</p></div>
    <div className="mt-14 grid gap-4 sm:grid-cols-3"><Stat icon={<Bookmark size={16} />} label="Saved titles" value={saved.length.toString().padStart(2, '0')} /><Stat icon={<Clock3 size={16} />} label="Time waiting" value={saved.length ? `${saved.length * 4}h` : '—'} /><Stat icon={<Play size={16} />} label="Next up" value={saved[0]?.title ?? 'Choose one'} /></div>
    <div className="mt-16"><SectionHeading eyebrow="Your queue" title="Saved for later" />{saved.length ? <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 lg:grid-cols-4">{saved.map((show) => <div key={show.id} className="relative"><ShowCard show={show} /><button onClick={() => remove(show.id)} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#111116]/80 text-white/60 backdrop-blur transition hover:bg-destructive hover:text-white" aria-label={`Remove ${show.title}`} data-testid={`button-remove-saved-${show.id}`}><Trash2 size={13} /></button></div>)}</div> : <div className="rounded-2xl border border-dashed border-white/15 px-6 py-20 text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 text-primary"><Bookmark size={20} /></div><h3 className="font-display text-3xl">A blank page, for now.</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">When a show catches your eye, tap My list. It will be waiting here.</p><Link href="/browse" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground" data-testid="link-library-browse">Find a story <Play size={13} fill="currentColor" /></Link></div>}</div>
  </div></Shell>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border border-white/[.08] bg-secondary/65 p-5"><div className="flex items-center gap-2 text-primary">{icon}<span className="font-mono-app text-[9px] uppercase tracking-[.17em] text-muted-foreground">{label}</span></div><div className="mt-6 truncate font-display text-3xl">{value}</div></div>;
}