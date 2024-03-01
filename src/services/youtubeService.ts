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
    viewCount: number;
    subscriberCount?: number;
    videoCount: number;
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

async function getChannelDataById(channelId: string): Promise<ChannelData | null> {
    const url = `${process.env.YOUTUBE_API_BASE_URL}/channels?part=snippet,contentDetails,statistics&id=${channelId}&key=${API_KEY}`;

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
                viewCount: parseInt(channel.statistics.viewCount, 10),
                subscriberCount: channel.statistics.hiddenSubscriberCount ? undefined : parseInt(channel.statistics.subscriberCount, 10),
                videoCount: parseInt(channel.statistics.videoCount, 10),
            };
            return data;
        }
        return null; // No channel found
    } catch (error) {
        console.error('Error fetching channel data:', error);
        return null;
    }
}

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

async function listChannelVideosDetailed(channelId: string, fromTime: number, limit: number) {
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

export async function saveChannel(channelId: string) {
    const channelData = await getChannelDataById(channelId);
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

export async function saveChannelVideos(channelId: string, limit: number = 50) {
    const channelData = await getChannelDataById(channelId);
    if (channelData) {
        const fromTime = channelData.publishedAt.getTime(); // get videos since the channel was created
        const videoDetails = await listChannelVideosDetailed(channelId, fromTime, limit);
        if (videoDetails) {
            const videoIds = videoDetails.map((video: any) => video.id);
            const existingVideos = await youtube_videos.findAll({
                where: { id: videoIds }
            });
            const existingVideoIds = existingVideos.map((video: any) => video.id);
            const newVideos = videoDetails.filter((video: any) => !existingVideoIds.includes(video.id));
            if (newVideos.length > 0) {
                await youtube_videos.bulkCreate(newVideos);
                return newVideos;
            }
        }
    }
    return null;
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
        // if optimise is true, only retrieve transcripts for videos where titleInvestmentScore is medium or high (case insensitive) else retrieve transcripts for all videos
        if (optimise) {
            const videos = await youtube_videos.findAll({
                where: {
                    titleInvestmentScore: {
                        [Op.or]: [
                            { [Op.iLike]: 'medium' },
                            { [Op.iLike]: 'high' }
                        ]
                    },
                    transcript: null
                }
            });
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
            const videos = await youtube_videos.findAll({where: {transcript: null}});
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
/*
//listChannelVideosDetailed('UCxxxxxxxxxxxxxxxxxxxxxx', 10).then(console.log).catch(console.error);
const videoId = 'rKD3s7Y3mxA';
(async () => {
    try {
        const videoDetailsRes = await getVideoDetails([videoId]);
        console.log("channel_name", (await getChannelDataById(videoDetailsRes[0].channelId))?.title);
        console.log("video_title", videoDetailsRes[0].title);
        console.log(`video_description ${videoDetailsRes[0].description}`);

        const videoTranscriptRes = await getYoutubeTranscriptFromVideoId(videoId)
        console.log("video_transcript", videoTranscriptRes)
        // get file contents of gptTranscript/video_discussion.json
        const videoTranscriptJsonFormat = JSON.parse(fs.readFileSync('./gptJsonResponseFormat/video_discussion.json', 'utf8'));
        console.log(`JSON Format ${JSON.stringify(videoTranscriptJsonFormat)}`)
        console.log(`
        You are a financial analyst and the transcript you have received is from a video by channel_name titled video_title with description video_description. Rephrase the title text in a way that you see fitting for the video content and provide an overall sentiment accordingly. Participants are individuals being interviewed or discussing the subject matter, and are not the individuals being referred to in the context. Ensure asset names accurately reflect the subjects discussed and correlate with the details provided in each section. Suggest as many asset discussed from the transcript. Also, indicate a weightage value for the asset discussed in comparison to other assets discussed; the total weightage value of assets discussed should be 100. Do not list any assets other than financial securities in assets_discussed. market types should only be either equity, commodity, bond, crypto, and currency; Leave market_type empty if it does not fall in those categories. If the asset or topic is associated with a specific country, please include the alpha-3 country code in the related_country field of the JSON response. Do not leave related_country empty, based on your knowledge guess the country, else use global as default value if you are unsure. Sentiments should be categorized as bullish, bearish, neutral, or uncertain. Do not leave topics_discussed and conclusions empty; include at minimum the top 3 topics. For transcript_lang, use ISO 639 language codes. You simple to understand words and provide the result only in JSON format response according to the example properties above; you may modify the values accordingly.
        `)
    } catch (error) {
        console.error(error);
    }
})();
*/