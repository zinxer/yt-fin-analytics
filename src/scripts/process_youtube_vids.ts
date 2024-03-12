import 'dotenv/config';
import axios from 'axios';
import { YoutubeTranscript } from 'youtube-transcript';
import OpenAI from 'openai';
import { isJsonString, openaiNumTokensFromString } from '../utils/utils';

// Database models
import video_sources from '../models/video_sources';
import youtube_channels from '../models/youtube_channels';
import videos from '../models/videos';
import { Op } from 'sequelize';
import openai_prompts from '../models/openai_prompts';
import openai_runs from '../models/openai_runs';

// Define your API key and the model you want to use
const openai = new OpenAI(process.env.OPENAI_API_KEY as any); // Provide a default value for OPENAI_API_KEY
const YOUTUBE_API_KEY = process.env.YOUTUBE_DATA_API_KEY;
const VIDEO_LIMIT = 50
const OPENAI_MODEL = process.env.OPENAI_MODEL_ID;

// function to populate youtube_channels table from video_source table
async function populateChannelInfo() {
    try {
        // get all video_source id where sourceId is 'youtube'
        const videoSources = await video_sources.findAll({
            where: {
                sourceName: 'youtube',
                isActive: true
            }
        });
        // check if the videoSources sourceId is already in the youtube_channels table based on sourceId
        for (let i = 0; i < videoSources.length; i++) {
            const sourceId = videoSources[i].sourceId;
            const channel = await youtube_channels.findOne({ where: { sourceId: sourceId } });
            if (!channel) {
                // get the channel data from youtube api
                const url = `${process.env.YOUTUBE_API_BASE_URL}/channels?part=snippet&id=${sourceId}&key=${YOUTUBE_API_KEY}`;
                const response = await axios.get(url);
                if (!response.data) { continue }
                if (response.data.items.length === 0) {
                    console.log(`-W- No channel found for sourceId: ${sourceId}`);
                    continue;
                }

                // add the channel to the youtube_channels table
                const snippet = response.data.items[0].snippet;
                const newChannel = await youtube_channels.create({
                    sourceId: sourceId,
                    channelName: snippet.title,
                    description: snippet.description,
                    thumbnailUrl: snippet.thumbnails.default.url
                });
                console.log(`-I- Added ${newChannel.channelName} to youtube_channels table`);
            }
        }

    } catch (error) {
        console.error('-E- An error occurred:', error);
    }
}

async function getVideosFromChannel() {
    try {
        // get all youtube channels
        const channels = await video_sources.findAll({ where: { sourceName: 'youtube', isActive: true } });
        for (let i = 0; i < channels.length; i++) {
            const channel = channels[i];
            const playlistId = 'UU' + channel.sourceId.slice(2)
            const url = `${process.env.YOUTUBE_API_BASE_URL}/playlistItems?key=${YOUTUBE_API_KEY}&playlistId=${playlistId}&part=snippet&maxResults=${VIDEO_LIMIT}`;

            const response = await axios.get(url);
            if (!response.data) { console.log(`-W- Unable to retrieve videos for ${channel.sourceId}`); continue }
            const videoList = response.data.items;
            if (videoList.length > 0) {
                const videoDataArray = []; // Array to store videoData

                // Loop through the videos
                for (const video of videoList) {
                    const videoUid = video.snippet.resourceId.videoId;
                    const existingVideo = await videos.findOne({ where: { videoUid: videoUid, sourceId: channel.sourceId } });
                    if (existingVideo) {
                        continue; // Skip if video already exists in the database
                    }

                    const videoData = {
                        videoUid: videoUid,
                        sourceId: video.snippet.channelId,
                        title: video.snippet.title,
                        description: video.snippet.description,
                        publishedAt: new Date(video.snippet.publishedAt)
                    };
                    videoDataArray.push(videoData); // Add videoData to the array
                }

                // Add videoData to the database using bulkCreate
                await videos.bulkCreate(videoDataArray)
            }

        }
    } catch (error) {
        console.error('-E- An error occurred:', error);
    }
}

async function getTranscript() {
    try {
        // retrieve transcript by channelId
        const channels = await video_sources.findAll({ where: { sourceName: 'youtube' } });
        for (let i = 0; i < channels.length; i++) {
            // get all videos without transcript
            const videosWithoutTranscript = await videos.findAll({
                where: {
                    transcript: null,
                    sourceId: channels[i].sourceId
                }
            });
            // return if there are no videos without transcript
            if (videosWithoutTranscript.length === 0) { continue }

            // loop through the videos and get the transcript
            for (let i = 0; i < videosWithoutTranscript.length; i++) {
                const video = videosWithoutTranscript[i];
                const videoId = video.videoUid;

                let response;
                try {
                    response = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
                } catch (error) { // Explicitly type 'error' as 'Error'
                    // check if the error contains 'Transcript is disabled'
                    if ((error as any).message.includes('Transcript is disabled')) {
                        console.log(`-W- Transcript is disabled for videoId: ${videoId}, removing from database.`);
                        // delete video from database
                        await video.destroy();
                        continue;
                    }
                    console.error(`-E- An error occurred while fetching transcript for ${videoId}:`, error);
                    continue;
                }
                const transcript = response.map((item: any) => item.text).join(' ');

                // continue if transcript character length is larger than MYSQL TEXT type
                if (transcript.length > 65535) {
                    console.log(`-W- Transcript for videoId: ${videoId} is too large, removing from database.`);
                    // delete video from database
                    await video.destroy();
                    continue;
                }

                if (transcript) {
                    video.transcript = transcript;
                    await video.save();
                }
            }
        }
    } catch (error) {
        console.error('-E- An error occurred:', error);
    }
}

async function openaiAnalyseTranscript() {
    try {
        // get all videos with transcript
        const videosWithTranscript = await videos.findAll({ where: { transcript: { [Op.ne]: null } } });

        // Filter out videos that already have a responseJson in openai_runs corresponding to the videoId table (it means that the video has already been analysed by OpenAI and we don't need to do it again)
        const videoIds = videosWithTranscript.map((video) => video.videoId);
        const openaiRuns = await openai_runs.findAll({ where: { videoId: videoIds, model: OPENAI_MODEL, responseJson: { [Op.ne]: null } } });
        const openaiRunVideoIds = openaiRuns.map((openaiRun) => openaiRun.videoId);
        const filteredVideos = videosWithTranscript.filter((video) => !openaiRunVideoIds.includes(video.videoId));
        // return if there are no videos with transcript
        if (filteredVideos.length === 0) { return }

        const openaiPrompt = await openai_prompts.findOne({ where: { key: 'OPENAI_VIDEO_TRANSCRIPT' } });
        const { prompt } = openaiPrompt!;
        // loop through the videos and analyse the transcript
        for (let i = 0; i < filteredVideos.length; i++) {
            promptOpenAIandSave(filteredVideos[i], prompt);
            // delay 5 seconds to avoid openAi rate limit
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    } catch (error) {
        console.error('-E- An error occurred:', error);
    }

}

async function promptOpenAIandSave(video: any, prompt: string) {
    try {
        const videoTitle = video.title;
        const videoDescription = video.description;
        const transcript = video.transcript;

        // construct openai prompt
        const openaiPrompt = {
            model: OPENAI_MODEL,
            messages: [{
                role: 'system',
                content: prompt
            }, {
                role: 'user',
                content: `video_title:${videoTitle}; video_description:${videoDescription}; video_transcript:${transcript}`
            }],
            temperature: 0.7,
            max_tokens: 4095,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
            response_format: { "type": "json_object" }
        }
        //skip if prompt token length is larger than 16385 - 2000 (account for completion_tokens) for MODEL: gpt-3.5-turbo
        const contextTokenSize = openaiNumTokensFromString(prompt, OPENAI_MODEL!);
        const tokenLimit = 16385 - 2000;
        if (Number(contextTokenSize) > tokenLimit) {
            console.log(`-E- The number of tokens in the prompt for ${video.videoId} exceeds the limit of ${tokenLimit}`);
            return
        }
        //create an entry in the openai_runs table
        let openaiRun = await openai_runs.findOne({ where: { videoId: video.videoId, model: OPENAI_MODEL } });

        if (!openaiRun) { openaiRun = await openai_runs.create({ videoId: video.videoId, model: OPENAI_MODEL }) }
        // send request to openai
        console.log(`-I- Sending request to openai for videoId: ${video.videoId}`)
        const response = await openai.chat.completions.create(openaiPrompt as any);
        if (!response) { return; }
        const openaiResponseContent = response.choices[0].message.content;
        if (!openaiResponseContent) { return; }
        if (!isJsonString(openaiResponseContent)) { console.log(`-W- Response for openai_runs runId: ${openaiRun.runId} is not a JSON object for videoId: ${video.videoId}`); return; }

        openaiRun.responseJson = JSON.parse(openaiResponseContent);
        openaiRun.promptTokens = response.usage!.prompt_tokens;
        openaiRun.completionTokens = response.usage!.completion_tokens;
        openaiRun.totalTokens = response.usage!.total_tokens;
        await openaiRun.save();
    } catch (error) {
        console.error('-E- An error occurred:', error);
    }
}

// Add channel videos into database
(async () => {
    try {
        // ensure all youtube channels are in the youtube_channels table
        //await populateChannelInfo();
        console.log('-I- Channels added successfully');

        // retrieve and save all youtube videos
        //await getVideosFromChannel();
        console.log('-I- Videos saved successfully');

        // retrieve all youtube video transcripts
        //await getTranscript();
        console.log('-I- Transcripts saved successfully');

        // analyse youtube video transcripts
        await openaiAnalyseTranscript();


    } catch (error) {
        console.error('-E- An error occurred:', error);
    }
})();