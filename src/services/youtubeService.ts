import axios from 'axios';
import { YoutubeTranscript } from 'youtube-transcript';
import { requireEnv } from '../config';
import { getPrisma } from '../db';

const VIDEO_LIMIT = 50;
const MYSQL_TEXT_MAX = 65535;

function youtubeUrl(path: string, params: Record<string, string | number>): string {
    const query = new URLSearchParams({ ...params, key: requireEnv('YOUTUBE_DATA_API_KEY') } as Record<string, string>);
    return `${requireEnv('YOUTUBE_API_BASE_URL')}/${path}?${query.toString()}`;
}

// Looks up a channel by handle and saves (or updates) its video source and channel details.
export async function updateOrSaveChannelByHandle(handle: string) {
    const prisma = getPrisma();
    const response = await axios.get(youtubeUrl('channels', { part: 'snippet', forHandle: handle }));
    const item = response.data?.items?.[0];
    if (!item) {
        console.log(`-W- No channel found for handle: ${handle}`);
        return null;
    }
    const sourceId: string = item.id;
    const snippet = item.snippet;

    await prisma.video_sources.upsert({
        where: { sourceId },
        create: { sourceId, sourceName: 'youtube', isActive: true },
        update: {},
    });

    const data = {
        sourceId,
        channelName: snippet.title as string,
        description: snippet.description as string,
        thumbnailUrl: snippet.thumbnails?.default?.url as string | undefined,
    };
    const existing = await prisma.youtube_channels.findFirst({ where: { sourceId } });
    if (existing) {
        return prisma.youtube_channels.update({ where: { id: existing.id }, data });
    }
    return prisma.youtube_channels.create({ data });
}

// Fetches the latest videos of an uploads playlist and stores the ones not yet saved.
export async function retrieveAndSaveChannelVideos(playlistId: string) {
    const prisma = getPrisma();
    const response = await axios.get(youtubeUrl('playlistItems', { playlistId, part: 'snippet', maxResults: VIDEO_LIMIT }));
    const items: any[] = response.data?.items ?? [];
    if (items.length === 0) {
        return null;
    }

    const newVideos = [];
    for (const item of items) {
        const snippet = item.snippet;
        const videoUid: string = snippet.resourceId.videoId;
        const sourceId: string = snippet.channelId;

        const existing = await prisma.videos.findFirst({ where: { videoUid, sourceId } });
        if (existing) {
            continue;
        }
        await prisma.video_sources.upsert({
            where: { sourceId },
            create: { sourceId, sourceName: 'youtube', isActive: true },
            update: {},
        });
        newVideos.push({
            videoUid,
            sourceId,
            title: String(snippet.title).substring(0, 255),
            description: snippet.description as string,
            publishedAt: new Date(snippet.publishedAt),
            isSuitable: true,
        });
    }
    if (newVideos.length > 0) {
        await prisma.videos.createMany({ data: newVideos });
    }
    return newVideos;
}

// Fetches and stores transcripts for all suitable videos that do not have one yet.
export async function retrieveAndSaveYoutubeVideoTranscript() {
    const prisma = getPrisma();
    const pending = await prisma.videos.findMany({ where: { transcript: null, isSuitable: true } });

    for (const video of pending) {
        let response;
        try {
            response = await YoutubeTranscript.fetchTranscript(video.videoUid, { lang: 'en' });
        } catch (error) {
            if ((error as Error).message?.includes('Transcript is disabled')) {
                console.log(`-W- Transcript is disabled for videoUid: ${video.videoUid}, video is not suitable.`);
                await prisma.videos.update({ where: { videoId: video.videoId }, data: { isSuitable: false } });
                continue;
            }
            console.error(`-E- An error occurred while fetching transcript for ${video.videoUid}:`, error);
            continue;
        }
        const transcript = response.map((item) => item.text).join(' ');

        if (transcript.length > MYSQL_TEXT_MAX) {
            console.log(`-W- Transcript for videoUid: ${video.videoUid} is too large, video is not suitable.`);
            await prisma.videos.update({ where: { videoId: video.videoId }, data: { isSuitable: false } });
            continue;
        }
        if (transcript) {
            await prisma.videos.update({ where: { videoId: video.videoId }, data: { transcript } });
        }
    }
}
