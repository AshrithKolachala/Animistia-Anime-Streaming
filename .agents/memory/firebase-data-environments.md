---
name: Animistia Firebase data
description: The chosen source and environment sharing model for Animistia's catalog data.
---

Seed Firestore from the development PostgreSQL dataset and use that same Firestore database for both development and production. Development and production share live records, so development edits are visible in production. The existing production PostgreSQL dataset is intentionally not imported.

**Why:** The user requested that development-only episode additions be included in the production dataset as well.

**How to apply:** Keep development and production pointed at the same Firestore database unless the user changes this choice. Preserve PostgreSQL data; do not import the previous production dataset without asking.