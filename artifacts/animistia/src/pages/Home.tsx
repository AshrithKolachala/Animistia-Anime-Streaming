import { ArrowRight, ChevronRight, Play, Plus, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import { useGetHighlights } from '@workspace/api-client-react';
import { SectionHeading, LoadingGrid, Shell } from '@/components/AnimistiaShell';
import { ShowCard } from '@/components/ShowCard';
import { demoShows, getAssetUrl } from '@/lib/catalog';

export default function Home() {
  const highlights = useGetHighlights();
  const featured = highlights.data?.featured?.[0] ?? demoShows[0];
  const trending = highlights.data?.trending?.length ? highlights.data.trending : demoShows.slice(1, 5);
  const latest = highlights.data?.latest?.length ? highlights.data.latest : demoShows.slice(2, 6);
  return (
    <Shell><div>
      <section className="relative min-h-[620px] overflow-hidden border-b border-white/[.07] sm:min-h-[690px]">
         <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 72% 28%, rgba(177, 106, 97, .25), transparent 38%), radial-gradient(ellipse at 18% 10%, rgba(235, 195, 120, .13), transparent 34%), linear-gradient(115deg, #15151d 5%, #1d1a27 52%, #302735 100%)' }} />{featured.bannerUrl && <img src={getAssetUrl(featured.bannerUrl)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35 mix-blend-screen" />}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(90deg, transparent 0 49.8%, rgba(247,230,198,.2) 50%, transparent 50.2%), linear-gradient(0deg, transparent 0 49.8%, rgba(247,230,198,.2) 50%, transparent 50.2%)', backgroundSize: '110px 110px' }} />
        <div className="relative mx-auto flex min-h-[620px] max-w-[1440px] items-end px-5 pb-16 sm:min-h-[690px] sm:px-8 sm:pb-20 lg:px-12">
          <div className="max-w-2xl animate-rise">
            <div className="mb-5 flex items-center gap-3 font-mono-app text-[10px] uppercase tracking-[.22em] text-primary"><span className="h-px w-9 bg-primary" />Animistia selection / 01</div>
            <h1 className="max-w-xl font-display text-6xl leading-[.91] tracking-[-.045em] text-[#f7e9d3] sm:text-8xl">{featured.title}</h1>
            <p className="mt-6 max-w-md text-sm leading-6 text-white/65 sm:text-base">{featured.synopsis}</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href={`/watch/${featured.id}`} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-primary-foreground transition hover:-translate-y-0.5 hover:brightness-105" data-testid="link-hero-watch"><Play size={14} fill="currentColor" />Watch now</Link>
              <Link href="/browse" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-white backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-white/40" data-testid="link-hero-browse">Browse catalog <ArrowRight size={14} /></Link>
            </div>
            <div className="mt-8 flex gap-4 font-mono-app text-[10px] uppercase tracking-widest text-white/50"><span>{featured.year}</span><span>{featured.episodesCount} episodes</span><span className="text-primary">rating {featured.rating.toFixed(1)}</span></div>
          </div>
          <div className="absolute bottom-10 right-8 hidden animate-drift lg:block"><div className="relative h-28 w-28 rounded-full border border-primary/25 p-2"><div className="flex h-full w-full items-center justify-center rounded-full border border-primary/20 font-mono-app text-[8px] uppercase tracking-[.2em] text-primary/70">stay curious</div></div></div>
        </div>
      </section>
      <section className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12">
        <div className="mb-14 flex flex-col justify-between gap-6 border-b border-white/[.07] pb-8 sm:flex-row sm:items-end"><div><div className="mb-3 flex items-center gap-2 font-mono-app text-[10px] uppercase tracking-[.2em] text-primary"><Sparkles size={13} /> A living catalog</div><h2 className="max-w-lg font-display text-4xl leading-tight text-foreground sm:text-5xl">Stories with a point of view.</h2></div><p className="max-w-xs text-sm leading-6 text-muted-foreground">No endless scroll. Just a changing constellation of films and series we think deserve your evening.</p></div>
        <SectionHeading eyebrow="On the radar" title="Trending now" action={<Link href="/browse" className="hidden items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary sm:flex" data-testid="link-trending-all">All titles <ChevronRight size={14} /></Link>} />
        {highlights.isLoading ? <LoadingGrid count={4} /> : highlights.isError ? <ErrorStrip onRetry={() => highlights.refetch()} /> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{trending.map((show) => <ShowCard key={show.id} show={show} />)}</div>}
        <div className="mt-20 grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-2xl border border-white/[.08] bg-[#17171e] p-7 sm:p-10"><div className="font-mono-app text-[10px] uppercase tracking-[.2em] text-primary">The Animistia edit</div><h3 className="mt-5 max-w-md font-display text-4xl leading-tight sm:text-5xl">Make room for the quiet ones.</h3><p className="mt-5 max-w-md text-sm leading-6 text-muted-foreground">A handpicked selection of intimate, odd, beautiful stories that do not need to shout to stay with you.</p><Link href="/browse" className="mt-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-primary" data-testid="link-edit-browse">Explore the edit <ArrowRight size={14} /></Link></div>
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-[#24222a] p-7 sm:p-10"><div className="absolute -right-10 -top-10 h-48 w-48 rounded-full border border-primary/20" /><div className="absolute -right-1 top-0 h-56 w-px rotate-45 bg-primary/20" /><div className="relative"><Plus className="text-primary" size={24} /><h3 className="mt-10 font-display text-3xl leading-tight">Keep your place.</h3><p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">Save discoveries, track your next watch, and make Animistia feel like yours.</p><Link href="/sign-up" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#f5e5cb] px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-[#24222a] transition hover:bg-primary" data-testid="link-create-account">Create free account <ArrowRight size={13} /></Link></div></div>
        </div>
        <div className="mt-20"><SectionHeading eyebrow="Just arrived" title="New in the archive" action={<Link href="/browse" className="hidden items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary sm:flex" data-testid="link-latest-all">View all <ChevronRight size={14} /></Link>} /><div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{latest.map((show) => <ShowCard key={show.id} show={show} />)}</div></div>
      </section>
    </div></Shell>
  );
}

function ErrorStrip({ onRetry }: { onRetry: () => void }) {
  return <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-5 sm:flex-row sm:items-center"><p className="text-sm text-muted-foreground">The archive is taking a breath. Your saved selections are still here.</p><button onClick={onRetry} className="text-xs font-bold uppercase tracking-widest text-primary" data-testid="button-retry-highlights">Try again</button></div>;
}