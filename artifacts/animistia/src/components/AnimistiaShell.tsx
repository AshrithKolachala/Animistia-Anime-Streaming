import { useState } from 'react';
import { Compass, Library, Menu, Play, Search, Shield, X } from 'lucide-react';
import { Link, useLocation } from 'wouter';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3 group" data-testid="link-logo">
      <img src="/logo.png" alt="Animistia" className={`${compact ? 'h-8' : 'h-9'} w-auto object-contain`} />
      {!compact && <span className="sr-only">Animistia</span>}
    </Link>
  );
}

export function Shell({ children, signedIn = false }: { children: React.ReactNode; signedIn?: boolean }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const links = [
    { href: '/browse', label: 'Discover', icon: Compass },
    { href: '/library', label: 'My library', icon: Library },
  ];
  return (
    <div className="grain min-h-[100dvh] bg-background">
      <header className="fixed top-0 z-40 w-full border-b border-white/[.07] bg-[#111116]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-9">
            <Logo />
            <nav className="hidden items-center gap-7 md:flex">
              {links.map((link) => (
                <Link key={link.href} href={link.href} className={`text-[11px] font-semibold uppercase tracking-[.18em] transition-colors hover:text-primary ${location === link.href ? 'text-foreground' : 'text-muted-foreground'}`} data-testid={`link-nav-${link.label.toLowerCase().replace(' ', '-')}`}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/browse" className="hidden h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/5 hover:text-foreground sm:flex" aria-label="Search Animistia" data-testid="link-search">
              <Search size={17} />
            </Link>
            <Link href={signedIn ? '/library' : '/sign-in'} className="hidden rounded-full border border-primary/45 px-4 py-2 text-[11px] font-bold uppercase tracking-[.14em] text-primary transition hover:bg-primary hover:text-primary-foreground sm:block" data-testid="link-auth">
              {signedIn ? 'Your space' : 'Sign in'}
            </Link>
            <button onClick={() => setOpen(!open)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-foreground md:hidden" aria-label="Open navigation" data-testid="button-mobile-menu">
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {open && (
          <div className="border-t border-white/[.07] bg-[#111116] px-5 py-4 md:hidden">
            {links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="flex items-center gap-3 border-b border-white/5 py-3 text-sm text-muted-foreground" data-testid={`link-mobile-${link.label.toLowerCase().replace(' ', '-')}`}><link.icon size={16} />{link.label}</Link>)}
            <Link href="/sign-in" className="mt-3 flex items-center gap-3 py-2 text-sm text-primary" data-testid="link-mobile-sign-in"><Play size={16} />Sign in to Animistia</Link>
          </div>
        )}
      </header>
      <main className="pt-[72px]">{children}</main>
      <footer className="border-t border-white/[.07] px-5 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div><Logo compact /><p className="mt-3 max-w-xs text-xs leading-5 text-muted-foreground">A small, considered home for stories worth staying up late for.</p></div>
          <div className="font-mono-app text-[10px] uppercase tracking-[.18em] text-muted-foreground">Animistia / 2025</div>
        </div>
      </footer>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return <div className="mb-6 flex items-end justify-between gap-4"><div>{eyebrow && <div className="mb-2 font-mono-app text-[10px] uppercase tracking-[.2em] text-primary">{eyebrow}</div>}<h2 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">{title}</h2></div>{action}</div>;
}

export function LoadingGrid({ count = 4 }: { count?: number }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: count }).map((_, i) => <div key={i} className="space-y-3"><div className="skeleton aspect-[.72] rounded-xl" /><div className="skeleton h-4 w-3/4 rounded" /><div className="skeleton h-3 w-1/2 rounded" /></div>)}</div>;
}