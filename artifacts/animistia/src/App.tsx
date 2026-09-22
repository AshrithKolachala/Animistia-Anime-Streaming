import { type ReactNode } from 'react';
import { ClerkProvider, useAuth, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Redirect, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import Home from '@/pages/Home';
import Browse from '@/pages/Browse';
import Watch from '@/pages/Watch';
import Library from '@/pages/Library';
import Admin from '@/pages/Admin';
import { AuthPage } from '@/pages/Auth';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Routes({ clerkReady }: { clerkReady: boolean }) {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/browse" component={Browse} />

        {/* 🎬 ANIMISTIA PREMIUM URL PATH SEGMENTS */}
        <Route path="/watch/series/:name/:season/:episode" component={Watch} />
        <Route path="/watch/movies/:name" component={Watch} />

        {/* Keep the fallback ID parser path temporarily so existing home dashboard cards don't throw immediate errors while you transition */}
        <Route path="/watch/:id" component={Watch} />

        <Route path="/library" component={() => <ProtectedPage clerkReady={clerkReady}><Library /></ProtectedPage>} />
        <Route path="/admin" component={() => <ProtectedPage clerkReady={clerkReady}><AdminGate /></ProtectedPage>} />
        <Route path="/sign-in/*?" component={() => <AuthPage mode="sign-in" clerkReady={clerkReady} />} />
        <Route path="/sign-up/*?" component={() => <AuthPage mode="sign-up" clerkReady={clerkReady} />} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function ProtectedPage({ clerkReady, children }: { clerkReady: boolean; children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!clerkReady) return <>{children}</>;
  if (!isLoaded) return <div className="min-h-[100dvh] bg-background" />;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return <>{children}</>;
}

function AdminGate() {
  const { isLoaded, user } = useUser();
  if (!isLoaded) return <div className="min-h-[100dvh] bg-background" />;

  const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
  if (email !== 'adityashiva19912021@gmail.com') {
    return <div className="grain flex min-h-[100dvh] items-center justify-center bg-background px-5"><div className="max-w-md rounded-2xl border border-cyan-200/20 bg-[#10152a]/80 p-8 text-center shadow-[0_0_50px_rgba(44,226,255,.08)] backdrop-blur-xl"><div className="font-mono-app text-[10px] uppercase tracking-[.22em] text-cyan-200">Restricted screening room</div><h1 className="mt-3 font-display text-4xl">Admin access only.</h1><p className="mt-4 text-sm leading-6 text-muted-foreground">This account is signed in, but it is not authorized to manage the Animistia catalog.</p><a href={basePath || '/'} className="mt-7 inline-flex rounded-full border border-cyan-200/30 px-5 py-3 text-xs font-bold uppercase tracking-widest text-cyan-100 transition hover:bg-cyan-200/10">Return home</a></div></div>;
  }
  return <Admin />;
}

export default function App() {
  return <QueryClientProvider client={queryClient}><WouterRouter base={basePath}><ClerkRouteContent /></WouterRouter></QueryClientProvider>;
}

function ClerkRouteContent() {
  const [, setLocation] = useLocation();
  const content = clerkPubKey ? <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    appearance={{
      theme: shadcn,
      cssLayerName: 'clerk',
      options: {
        logoPlacement: 'inside',
        logoImageUrl: `${window.location.origin}${basePath}/logo.png`,
        logoLinkUrl: basePath || '/',
      },
      variables: {
        colorPrimary: '#eac37c',
        colorBackground: '#17171e',
        colorForeground: '#f5ead7',
        colorMutedForeground: '#a09ba3',
        colorInput: '#111116',
        colorInputForeground: '#f5ead7',
        colorNeutral: '#403b45',
        borderRadius: '0.75rem',
        fontFamily: 'Manrope, sans-serif',
      },
      elements: {
        rootBox: 'w-full flex justify-center',
        cardBox: 'bg-[#17171e] border border-white/10 rounded-2xl shadow-2xl w-[440px] max-w-full overflow-hidden',
        card: '!bg-transparent !shadow-none !border-0',
        footer: '!bg-transparent !shadow-none !border-0',
        headerTitle: 'text-[#f5ead7]',
        headerSubtitle: 'text-[#a09ba3]',
        socialButtonsBlockButtonText: 'text-[#f5ead7]',
        formFieldLabel: 'text-[#d8cdbd]',
        formFieldInput: 'bg-[#111116] border-white/10 text-[#f5ead7]',
        formButtonPrimary: 'bg-[#eac37c] text-[#17171e]',
        footerActionLink: 'text-[#eac37c]',
        footerActionText: 'text-[#a09ba3]',
        dividerText: 'text-[#a09ba3]',
        alertText: 'text-[#f5ead7]',
        main: 'bg-transparent',
      },
    }}
    routerPush={(to) => setLocation(stripBase(to))}
    routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
  ><Routes clerkReady /></ClerkProvider> : <Routes clerkReady={false} />;
  return <>{content}</>;
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}
