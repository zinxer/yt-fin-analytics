# yt-fin-analytics

A TypeScript pipeline that ingests YouTube videos from finance and crypto channels, fetches their transcripts, and analyses them with an OpenAI model to produce structured JSON (topics, keywords, mentioned assets, participants, sentiment). Results are stored in MySQL.

> Reference code, not audited.

## Architecture

```mermaid
flowchart LR
    A[YouTube Data API] --> B[Channel and video ingestion<br/>youtubeService]
    B --> C[(MySQL<br/>Prisma / models)]
    B --> D[Transcript fetch<br/>youtube-transcript]
    D --> C
    C --> E[Analysis pipeline<br/>openaiService]
    F[Prompt templates<br/>assets/for_llm] --> E
    E --> G[OpenAI API<br/>JSON schema output]
    G --> H[Parse and normalise<br/>topics, assets, participants, sentiment]
    H --> C
```

## Stack

- TypeScript on Node.js 20.19+ / 22.12+ / 24+ (tsx for development)
- MySQL with Prisma 7 (`prisma/schema.prisma`, MariaDB/MySQL driver adapter)
- OpenAI SDK for LLM analysis with a JSON schema response format
- YouTube Data API v3 and `youtube-transcript`

## Setup

1. `npm install` (also generates the Prisma client)
2. `cp .env.example .env` and fill in the values
3. Create the database tables: `npx prisma migrate dev --name init` (or `npx prisma db push` for a quick start)
4. `npx prisma generate` (re-run after any schema change)
5. `npm run db:seed` to load config rows and the prompt template from `assets/for_llm/`
6. Run the driver: `npm run cli -- <channel|videos|transcripts|analyse|process>`

Typical order: `channel` (save channel by `YT_CHANNEL_HANDLE`), `videos` (save uploads from `YT_UPLOADS_PLAYLIST_ID`), `transcripts`, `analyse` (LLM call per video, optionally only `YT_VIDEO_ID`), `process` (normalise stored responses into topics, keywords, keyphrases and participants).

Production build: `npm run build` then `npm start -- <command>`. Missing environment variables fail fast with a `Configuration error` message.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL connection string used by Prisma |
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_MODEL_ID` | Model used for analysis |
| `OPENAI_MODEL_TOKEN_LIMIT` | Context token limit of the model |
| `OPENAI_MODEL_COMPLETION_MAX_TOKEN` | Max completion tokens |
| `YOUTUBE_DATA_API_KEY` | YouTube Data API key |
| `YOUTUBE_API_BASE_URL` | YouTube API base URL |
| `YT_CHANNEL_HANDLE` | Channel handle for the `channel` command |
| `YT_UPLOADS_PLAYLIST_ID` | Uploads playlist ID for the `videos` command |
| `YT_VIDEO_ID` | Optional video ID to restrict the `analyse` command to one video |

## Breaking changes from the original private project

- The hardcoded channel handle, playlist IDs and video ID in `index.ts` are replaced by the `YT_*` variables above plus a CLI command argument.
- The package was renamed to `yt-fin-analytics`; the original database name was replaced by the neutral `analytics_db`. Existing deployments must update their `DATABASE_URL`.
- The `dev`/`start` scripts referencing a non-existent `src/server.ts` were removed; use `npm run cli`.
- The data layer is fully on Prisma; the Sequelize models and the legacy title-analysis service (which depended on tables that no longer exist) were removed. The `openai_prompts` table is replaced by `llm_prompt_templates`, and responses follow the schema in `assets/for_llm/json_schema.json`.
- Old MySQL dumps, the legacy SQL create script and two dead service files were removed from history.

## Context

Built in 2024 as an experiment in correlating video sentiment with market moves. The correlation and price-data components described in early notes were never implemented. Sample prompt data in `assets/for_llm/` uses fictional names.

## Disclaimer

Reference code, not audited. Not financial advice. Scraped third-party content (transcripts, titles) is subject to YouTube's terms and copyright; do not redistribute it.

## Notice

Third-party packages retain their own licences. The code in this repository is released under the MIT licence (see `LICENSE`).
