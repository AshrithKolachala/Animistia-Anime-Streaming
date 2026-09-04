import { ArrowUpRight, Play, Star } from 'lucide-react';
import { Link } from 'wouter';
import type { Show } from '@workspace/api-client-react';
import { coverStyle, getAssetUrl } from '@/lib/catalog';

export function ShowCard({ show, featured = false }: { show: Show; featured?: boolean }) {
  return (
    <Link href={`/watch/${show.id}`} className={`group block ${featured ? 'sm:col-span-2' : ''}`} data-testid={`card-show-${show.id}`}>
      <div className={`relative overflow-hidden rounded-xl border border-white/[.08] bg-secondary ${featured ? 'aspect-[1.2]' : 'aspect-[.72]'}`}>
        {show.thumbnailUrl ? <img src={getAssetUrl(show.thumbnailUrl)} alt={show.title} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <div className="absolute inset-0" style={coverStyle(show.id)}><div className="absolute inset-0 opacity-35" style={{ background: 'repeating-linear-gradient(130deg, transparent 0 17px, rgba(255,255,255,.08) 18px 19px)' }} /><span className={`absolute ${featured ? 'bottom-5 left-5 text-5xl' : 'bottom-3 left-3 text-3xl'} font-display italic text-white/80`}>{show.title.slice(0, 1)}</span></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-[#101016] via-transparent to-transparent opacity-80" />
        <div className="absolute right-3 top-3 flex h-8 w-8 translate-y-1 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100"><Play size={13} fill="currentColor" /></div>
        {show.featured && <span className="absolute left-3 top-3 rounded-full bg-primary px-2 py-1 font-mono-app text-[9px] uppercase tracking-widest text-primary-foreground">Featured</span>}
         <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4"><div className="flex items-center gap-2 font-mono-app text-[9px] uppercase tracking-[.15em] text-white/70"><span>{show.year}</span><span className="h-1 w-1 rounded-full bg-primary" /><span>{show.mediaType === 'movie' ? 'Movie' : `${show.episodesCount} eps`}</span></div><h3 className={`${featured ? 'text-2xl sm:text-3xl' : 'text-base'} mt-1 font-semibold tracking-tight text-white`}>{show.title}</h3></div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2"><div className="flex items-center gap-1 text-xs text-muted-foreground"><Star size={12} className="text-primary" fill="currentColor" />{show.rating.toFixed(1)} <span className="mx-1 text-white/20">/</span>{show.genres[0]}</div><ArrowUpRight size={14} className="text-muted-foreground transition group-hover:text-primary" /></div>
    </Link>
  );
}