import 'dotenv/config';
import axios from 'axios';
import { iso8601DurationToSeconds } from '../utils/utils';
import { YoutubeTranscript } from 'youtube-transcript';
import fs from 'fs';
import youtube_channels from '../models/youtube_channels';
import youtube_videos from '../models/youtube_videos';
import { Op } from 'sequelize';

const API_KEY = process.env.YOUTUBE_DATA_API_KEY;

// TypeScript interface for channel data to provide type checking
interface ChannelData {
    id: string;
    channelName: string;
    description: string;
    customUrl?: string;
    url: string;
    publishedAt: Date;
    thumbnailUrl: string;
    country?: string;
    viewCount: number | null;
    subscriberCount?: number | null;
    videoCount: number | null;
    playlistId: string;
}

interface VideoListOptions {
    channelId: string;
    limitFromEpochTime?: number;
    limitByLatestVideos?: number; // Default is 10
}

async function searchChannels(searchQuery: string) {
    const searchUrl = `${process.env.YOUTUBE_API_BASE_URL}/search?part=snippet&type=channel&q=${encodeURIComponent(searchQuery)}&key=${API_KEY}`;

    try {
        const response = await axios.get(searchUrl);
        const channels = response.data.items;
        return channels.map((channel: any) => ({
            id: channel.id.channelId,
            title: channel.snippet.title,
            description: channel.snippet.description,
            thumbnail: channel.snippet.thumbnails.default.url,
        }));
    } catch (error) {
        console.error('Error searching for channels:', error);
        return [];
    }
}

async function getChannelDataById(channelId: string, light: boolean = true): Promise<ChannelData | null> {
    const url = `${process.env.YOUTUBE_API_BASE_URL}/channels?part=snippet${light ? '' : ',contentDetails,statistics'}&id=${channelId}&key=${API_KEY}`;
    try {
        const response = await axios.get(url);
        if (response.data.items.length > 0) {
            const channel = response.data.items[0];
            const data: ChannelData = {
                id: channel.id,
                channelName: channel.snippet.title,
                description: channel.snippet.description,
                customUrl: channel.snippet.customUrl,
                url: `https://www.youtube.com/channel/${channel.id}`,
                publishedAt: new Date(channel.snippet.publishedAt),
                thumbnailUrl: channel.snippet.thumbnails.high.url,
                country: channel.snippet.country,
                viewCount: channel.statistics ? parseInt(channel.statistics.viewCount, 10) : null,
                subscriberCount: channel.statistics ? channel.statistics.hiddenSubscriberCount ? undefined : parseInt(channel.statistics.subscriberCount, 10) : null,
                videoCount: channel.statistics ? parseInt(channel.statistics.videoCount, 10) : null,
                playlistId: 'UU' + channel.id.slice(2)
            };
            return data;
        }
        return null; // No channel found
    } catch (error) {
        console.error('Error fetching channel data:', error);
        return null;
    }
}

async function getChannelDataByHandle(handle: string, light: boolean = true) {
    const url = `${process.env.YOUTUBE_API_BASE_URL}/channels?part=snippet${light ? '' : ',contentDetails,statistics'}&forHandle=${handle}&key=${API_KEY}`;
    try {
        const response = await axios.get(url);
        if (response.data.items.length > 0) {
            const channel = response.data.items[0];
            const data: ChannelData = {
                id: channel.id,
                channelName: channel.snippet.title,
                description: channel.snippet.description,
                customUrl: channel.snippet.customUrl,
                url: `https://www.youtube.com/channel/${channel.id}`,
                publishedAt: new Date(channel.snippet.publishedAt),
                thumbnailUrl: channel.snippet.thumbnails.high.url,
                country: channel.snippet.country,
                viewCount: channel.statistics ? parseInt(channel.statistics.viewCount, 10) : null,
                subscriberCount: channel.statistics ? channel.statistics.hiddenSubscriberCount ? undefined : parseInt(channel.statistics.subscriberCount, 10) : null,
                videoCount: channel.statistics ? parseInt(channel.statistics.videoCount, 10) : null,
                playlistId: 'UU' + channel.id.slice(2)
            };
            return data;
        }
        return null; // No channel found
    } catch (error) {
        console.error('Error fetching channel data:', error);
        return null;
    }

}

// Note that Youtube search endpoint consumes 100 units each time it is called
async function getChannelVideos(channelId: string, fromTime: number = 0, limit: number = 50): Promise<string[]> {
    const url = `${process.env.YOUTUBE_API_BASE_URL}/search?key=${API_KEY}&channelId=${channelId}&part=snippet,id&order=date&type=video&maxResults=${limit}`;
    try {
        const response = await axios.get(url);
        let videos = response.data.items.filter((item: any) => new Date(item.snippet.publishedAt).getTime() >= fromTime);
        videos = videos.map((video: any) => video.id.videoId);
        return videos;

    } catch (error) {
        console.error('Error fetching channel videos:', error);
        return [];
    }
}

async function getVideoDetails(videoIds: string[]) {
    const detailsUrl = `${process.env.YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(',')}&key=${API_KEY}`;

    try {
        const response = await axios.get(detailsUrl);
        return response.data.items.map((video: any) => ({
            id: video.id,
            channelId: video.snippet.channelId,
            url: `https://www.youtube.com/watch?v=${video.id}`,
            publishedAt: new Date(video.snippet.publishedAt),
            title: video.snippet.title,
            description: video.snippet.description,
            thumbnailUrl: video.snippet.thumbnails.high.url,
            duration: iso8601DurationToSeconds(video.contentDetails.duration),
            viewCount: video.statistics.viewCount,
            likeCount: video.statistics.likeCount,
            commentCount: video.statistics.commentCount,
        }));
    } catch (error) {
        console.error('Error fetching video details:', error);
        return [];
    }
}

async function listChannelVideosDetailedById(channelId: string, fromTime: number, limit: number) {
    const videoIds = await getChannelVideos(channelId, fromTime, limit);

    if (videoIds as any) {
        const videoDetails = await getVideoDetails(videoIds);
        if (videoDetails.length > 0) {
            return videoDetails;
        }
    }
}

async function getYoutubeTranscriptFromVideoId(videoId: string) {
    try {
        const response = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
        const transcript = response.map((item: any) => item.text).join(' ');
        return transcript;
    } catch (error) {
        console.log('-E- Error/no YouTube transcript for video', videoId);
        return '';
    }
}

export async function updateOrSaveChannelById(channelId: string, light: boolean = true) {
    const channelData = await getChannelDataById(channelId, light);
    if (channelData) {
        const channel = await youtube_channels.findOne({ where: { id: channelId } });
        if (channel) {
            await channel.update(channelData);
            return channelData
        } else {
            await youtube_channels.create(channelData as any);
            return channelData
        }
    }
    return null
}

export async function updateOrSaveChannelByHandle(handle: string, light: boolean = true) {
    const channelData = await getChannelDataByHandle(handle, light);
    if (channelData) {
        const channel = await youtube_channels.findOne({ where: { customUrl: { [Op.or]: [handle, `@${handle}`] } } });
        if (channel) {
            await channel.update(channelData);
            return channelData
        } else {
            await youtube_channels.create(channelData as any);
            return channelData
        }
    }
    return null
}

export async function retrieveAndSaveChannelVideos(playlistId: string, limit: number = 50) {
    const url = `${process.env.YOUTUBE_API_BASE_URL}/playlistItems?key=${API_KEY}&playlistId=${playlistId}&part=snippet&maxResults=${limit}`;

    try {
        const response = await axios.get(url);
        const videos = response.data.items;
        if (videos.length > 0) {
            const videoDataArray = []; // Array to store videoData

            // Loop through the videos
            for (const video of videos) {
                const videoId = video.snippet.resourceId.videoId;
                const existingVideo = await youtube_videos.findOne({ where: { id: videoId } });
                if (existingVideo) {
                    continue; // Skip if video already exists in the database
                }

                const videoData = {
                    id: videoId,
                    channelId: video.snippet.channelId,
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                    title: video.snippet.title,
                    description: video.snippet.description,
                    thumbnailUrl: video.snippet.thumbnails.high.url,
                    publishedAt: new Date(video.snippet.publishedAt)
                };
                videoDataArray.push(videoData); // Add videoData to the array
            }

            // Add videoData to the database using bulkCreate
            await youtube_videos.bulkCreate(videoDataArray);
            return videoDataArray;
        }
    } catch (error) {
        console.log(error);
        return []
    }
}

export async function retrieveAndSaveYoutubeVideoTranscript(videoId?: string, optimise?: boolean) {
    if (videoId) {
        const video = await youtube_videos.findOne({ where: { id: videoId } });
        if (video) {
            const transcript = await getYoutubeTranscriptFromVideoId(videoId);
            if (transcript) {
                await video.update({ transcript });
                return transcript;
            }
        }
    } else {
        // retrieve all transcripts for videos in the database
        // if optimise is true, only retrieve transcripts for videos where titleInvestmentScore is medium or high (case insensitive) else retrieve transcripts for all videos
        if (optimise) {
            const videos = await youtube_videos.findAll({ where: { titleInvestmentScore: { [Op.or]: [{ [Op.iLike]: 'medium' }, { [Op.iLike]: 'high' }] }, transcript: null } });
            for (const video of videos) {
                const transcript = await getYoutubeTranscriptFromVideoId(video.id);
                if (transcript) {
                    await video.update({ transcript });
                } else {
                    // delete video from database if transcript is not available
                    await video.destroy();
                    console.log(`-I- Video ${video.id} deleted from database because transcript is not available`);
                }
            }
            return videos;
        } else {
            const videos = await youtube_videos.findAll({ where: { transcript: null } });
            for (const video of videos) {
                const transcript = await getYoutubeTranscriptFromVideoId(video.id);
                if (transcript) {
                    await video.update({ transcript });
                } else {
                    // delete video from database if transcript is not available
                    await video.destroy();
                    console.log(`-I- Video ${video.id} deleted from database because transcript is not available`);
                }
            }
            return videos;
        }
    }
    return null;
}