import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'wouter';
import { Shell } from '@/components/AnimistiaShell';

export default function NotFound() {
  return <Shell><div className="flex min-h-[65vh] flex-col items-center justify-center px-5 text-center"><div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 text-primary"><Compass size={26} /></div><div className="font-mono-app text-[10px] uppercase tracking-[.2em] text-primary">Signal lost / 404</div><h1 className="mt-4 font-display text-6xl sm:text-8xl">Wrong turn.</h1><p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">This page slipped out of the archive. The stories are still where you left them.</p><Link href="/browse" className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-xs font-bold uppercase tracking-widest text-foreground transition hover:border-primary hover:text-primary" data-testid="link-not-found-browse"><ArrowLeft size={14} /> Return to archive</Link></div></Shell>;
}