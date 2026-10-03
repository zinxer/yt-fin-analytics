import OpenAI from 'openai';
import type { Prisma } from '@prisma/client';
import { requireEnv, requireNumberEnv } from '../config';
import { getPrisma } from '../db';
import { isJsonString, openaiNumTokensFromString, shortHash } from '../utils/utils';

const TEMPLATE_NAME = 'video_transcript_analysis';
const RATE_LIMIT_DELAY_MS = 5000;
const IGNORED = ['unknown', 'none'];

function isIgnored(value: string): boolean {
    return IGNORED.includes(value.toLowerCase());
}

// Shape produced by the prompt template in assets/for_llm (see json_schema.json)
interface VideoAnalysis {
    analyzed_description: string;
    overall_keywords: string[];
    overall_market_sentiment: string;
    key_takeaways: string[];
    topics: { title: string; weightage: number; summary: string; keywords: string[] }[];
    industries_sectors: string[];
    countries_discussed: string[];
    assets_discussed: { name: string; short_term_sentiment: string; long_term_sentiment: string }[];
    people_mentioned: { name: string; affiliation: string | null; role: string | null }[];
}

// Sends the transcript of every suitable video without a stored analysis to the LLM
// and stores the raw JSON response in openai_runs. Pass a videoUid to restrict to one video.
export async function analyseYoutubeVideoTranscripts(videoUid?: string) {
    const prisma = getPrisma();
    const model = requireEnv('OPENAI_MODEL_ID');
    const maxCompletionTokens = requireNumberEnv('OPENAI_MODEL_COMPLETION_MAX_TOKEN');
    const tokenLimit = requireNumberEnv('OPENAI_MODEL_TOKEN_LIMIT') - maxCompletionTokens;
    const openai = new OpenAI({ apiKey: requireEnv('OPENAI_API_KEY') });

    const template = await prisma.llm_prompt_templates.findUnique({ where: { name: TEMPLATE_NAME } });
    if (!template || !template.is_active) {
        throw new Error(`Prompt template "${TEMPLATE_NAME}" not found or inactive; run "npm run db:seed"`);
    }

    const videos = await prisma.videos.findMany({
        where: { transcript: { not: null }, isSuitable: true, ...(videoUid ? { videoUid } : {}) },
    });
    // Skip videos that already have a successful run for this model (failed runs are retried)
    const done = await prisma.openai_runs.findMany({
        where: { videoId: { in: videos.map((v) => v.videoId) }, model, responseJson: { not: null as any }, processedError: false },
        select: { videoId: true },
    });
    const doneIds = new Set(done.map((r) => r.videoId));

    for (const video of videos.filter((v) => !doneIds.has(v.videoId))) {
        const messages = [
            { role: 'system' as const, content: template.system_message },
            {
                role: 'user' as const,
                content: `${template.user_input}\n\nvideo_title:${video.title}; video_description:${video.description}; video_transcript:${video.transcript}`,
            },
        ];
        if (openaiNumTokensFromString(JSON.stringify(messages), model) > tokenLimit) {
            console.log(`-W- Prompt for ${video.videoUid} exceeds the token limit of ${tokenLimit}, video is not suitable.`);
            await prisma.videos.update({ where: { videoId: video.videoId }, data: { isSuitable: false } });
            continue;
        }

        // one run per video and model
        let run = await prisma.openai_runs.findFirst({ where: { videoId: video.videoId, model } });
        if (!run) {
            run = await prisma.openai_runs.create({ data: { videoId: video.videoId, model } });
        }

        try {
            console.log(`-I- Sending request to OpenAI for videoUid: ${video.videoUid}`);
            const response = await openai.chat.completions.create({
                model,
                messages,
                max_completion_tokens: maxCompletionTokens,
                response_format: template.json_schema
                    ? { type: 'json_schema', json_schema: template.json_schema as any }
                    : { type: 'json_object' },
            });
            const content = response.choices[0]?.message?.content;
            if (!content) {
                continue;
            }
            if (!isJsonString(content)) {
                console.log(`-W- Response for run ${run.runId} (videoUid: ${video.videoUid}) is not valid JSON`);
                await prisma.openai_runs.update({ where: { runId: run.runId }, data: { processedError: true } });
                continue;
            }
            await prisma.openai_runs.update({
                where: { runId: run.runId },
                data: {
                    responseJson: JSON.parse(content),
                    promptTokens: response.usage?.prompt_tokens,
                    completionTokens: response.usage?.completion_tokens,
                    totalTokens: response.usage?.total_tokens,
                    processed: false,
                    processedError: false,
                },
            });
        } catch (error) {
            console.error(`-E- OpenAI request failed for ${video.videoUid}:`, error);
        }
        // delay to avoid OpenAI rate limits
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }
}

// Normalises stored LLM responses (openai_runs.responseJson) into the relational tables.
export async function processOpenaiRuns() {
    const prisma = getPrisma();
    const runs = await prisma.openai_runs.findMany({
        where: { responseJson: { not: null as any }, processed: false, processedError: false },
    });
    console.log(`-I- Processing ${runs.length} openai_runs`);
    for (const run of runs) {
        try {
            await prisma.$transaction((tx) => saveAnalysis(tx, run.videoId, run.runId, run.responseJson as unknown as VideoAnalysis));
        } catch (error) {
            console.error(`-E- Failed to process run ${run.runId}:`, error);
            await prisma.openai_runs.update({ where: { runId: run.runId }, data: { processedError: true } });
        }
    }
}

async function saveAnalysis(tx: Prisma.TransactionClient, videoId: number, runId: number, analysis: VideoAnalysis) {
    await tx.videos.updateMany({
        where: { videoId, isSuitable: true },
        data: {
            analysedTitle: analysis.analyzed_description?.substring(0, 255),
            overallSentiment: analysis.overall_market_sentiment,
        },
    });

    for (const keyphrase of analysis.overall_keywords ?? []) {
        if (isIgnored(keyphrase)) continue;
        await tx.video_keyphrases.upsert({
            where: { videoId_keyphrase: { videoId, keyphrase } },
            create: { videoId, keyphrase, openaiRunId: runId },
            update: {},
        });
    }

    for (const topic of analysis.topics ?? []) {
        if (isIgnored(topic.title)) continue;
        const topicId = shortHash(`${videoId}-${topic.title}-${runId}`);
        await tx.topics.upsert({
            where: { topicId },
            create: { topicId, title: topic.title, summary: topic.summary, openaiRunId: runId },
            update: {},
        });
        for (const word of topic.keywords ?? []) {
            const keywordId = await findOrCreateKeyword(tx, word);
            await tx.topic_keywords.upsert({
                where: { topicId_keywordId: { topicId, keywordId } },
                create: { topicId, keywordId },
                update: {},
            });
        }
    }

    for (const person of analysis.people_mentioned ?? []) {
        if (isIgnored(person.name)) continue;
        const participantId = shortHash(`${person.name}-${person.affiliation}`);
        await tx.participants.upsert({
            where: { participantId },
            create: { participantId, name: person.name, affiliation: person.affiliation },
            update: {},
        });
    }

    await tx.openai_runs.update({ where: { runId }, data: { processed: true } });
}

async function findOrCreateKeyword(tx: Prisma.TransactionClient, keyword: string): Promise<number> {
    const existing = await tx.keywords.findFirst({ where: { keyword } });
    if (existing) return existing.keywordId;
    return (await tx.keywords.create({ data: { keyword } })).keywordId;
}
