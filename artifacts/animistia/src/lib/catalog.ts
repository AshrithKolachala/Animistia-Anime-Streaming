import type { Show } from '@workspace/api-client-react';

export const demoShows: Show[] = [
  { id: 101, title: 'The Glass Garden', slug: 'the-glass-garden', synopsis: 'In a city where memories bloom as flowers, a quiet courier carries one impossible seed across the last districts of winter.', genres: ['Fantasy', 'Drama'], year: 2024, rating: 4.8, episodesCount: 12, mediaType: 'series', thumbnailUrl: null, bannerUrl: null, sourceType: 'youtube', videoUrl: null, videoPath: null, featured: true, createdAt: '2024-11-02' },
  { id: 102, title: 'Neon Pilgrims', slug: 'neon-pilgrims', synopsis: 'Two runaway navigators map the forgotten edges of a luminous megacity, one rooftop at a time.', genres: ['Sci-Fi', 'Adventure'], year: 2023, rating: 4.7, episodesCount: 10, mediaType: 'series', thumbnailUrl: null, bannerUrl: null, sourceType: 'youtube', videoUrl: null, videoPath: null, featured: false, createdAt: '2024-10-19' },
  { id: 103, title: 'Morrow, After Rain', slug: 'morrow-after-rain', synopsis: 'A musician returns to a seaside town and discovers that every song she wrote is still being played somewhere.', genres: ['Slice of Life', 'Romance'], year: 2022, rating: 4.6, episodesCount: 8, mediaType: 'series', thumbnailUrl: null, bannerUrl: null, sourceType: 'youtube', videoUrl: null, videoPath: null, featured: false, createdAt: '2024-09-12' },
  { id: 104, title: 'Orbit of Ash', slug: 'orbit-of-ash', synopsis: 'A salvage pilot wakes an ancient satellite and hears a voice from a world that no longer exists.', genres: ['Sci-Fi', 'Mystery'], year: 2024, rating: 4.9, episodesCount: 1, mediaType: 'movie', thumbnailUrl: null, bannerUrl: null, sourceType: 'uploaded', videoUrl: null, videoPath: null, featured: false, createdAt: '2024-12-03' },
  { id: 105, title: 'Paper Moon Motel', slug: 'paper-moon-motel', synopsis: 'Guests check into a motel that only appears between midnight and the first train of the morning.', genres: ['Mystery', 'Supernatural'], year: 2021, rating: 4.5, episodesCount: 13, mediaType: 'series', thumbnailUrl: null, bannerUrl: null, sourceType: 'youtube', videoUrl: null, videoPath: null, featured: false, createdAt: '2024-08-25' },
  { id: 106, title: 'Blue Hour Club', slug: 'blue-hour-club', synopsis: 'The regulars at a tiny jazz bar share one secret: they can borrow an hour from tomorrow.', genres: ['Drama', 'Fantasy'], year: 2023, rating: 4.4, episodesCount: 9, mediaType: 'series', thumbnailUrl: null, bannerUrl: null, sourceType: 'youtube', videoUrl: null, videoPath: null, featured: false, createdAt: '2024-07-17' },
];

export const allGenres = ['Adventure', 'Drama', 'Fantasy', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Supernatural'];

export function coverStyle(id: number): React.CSSProperties {
  const palettes = [
    ['#1f263d', '#d28a68', '#f4d9b0'], ['#131d29', '#e4b449', '#6f9fb2'], ['#332536', '#b97084', '#e7c9af'],
    ['#202c27', '#90ae82', '#d8bc80'], ['#271e31', '#927cb4', '#e1c298'], ['#1e2a37', '#d48862', '#7bb4a7'],
  ];
  const colors = palettes[id % palettes.length];
  return { background: `radial-gradient(circle at 75% 18%, ${colors[2]} 0, transparent 23%), linear-gradient(145deg, ${colors[0]} 8%, ${colors[1]} 100%)` };
}

export function getVideoId(url?: string | null) {
  if (!url) return '';
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([^?&/]+)/);
  return match?.[1] ?? '';
}

export function getAssetUrl(path?: string | null) {
  if (!path) return '';
  if (/^(https?:)?\/\//.test(path)) return path;
  return `/api/storage/objects/${path.replace(/^\/objects\//, '')}`;
}