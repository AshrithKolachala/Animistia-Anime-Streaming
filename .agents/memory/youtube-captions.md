---
name: YouTube caption sourcing
description: Custom Animistia captions use uploaded WebVTT tracks because the official iframe API does not expose caption cues.
---

Animistia renders its own caption overlay from admin-uploaded WebVTT files; the YouTube Iframe Player API can toggle native captions but cannot provide arbitrary caption cue text to the app.

**Why:** The player iframe is cross-origin, and the official API exposes playback controls rather than the caption transcript. Scraping captions would be unreliable and unsuitable for the product.

**How to apply:** Keep the custom CC button and cue renderer for tracks uploaded to the movie or episode; use YouTube native captions only as a separate fallback if explicitly requested.