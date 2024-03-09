import 'dotenv/config';
import axios from 'axios';
import { YoutubeTranscript } from 'youtube-transcript';

// Database models
import video_sources from '../models/video_sources';
import youtube_channels from '../models/youtube_channels';
import videos from '../models/videos';


const YOUTUBE_API_KEY = process.env.YOUTUBE_DATA_API_KEY;
const VIDEO_LIMIT = 50

// function to populate youtube_channels table from video_source table
async function populateYoutubeChannels() {
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

async function retrieveYoutubeVideos() {
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

async function retrieveAndSaveYoutubeVideoTranscript() {
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
            if (videosWithoutTranscript.length === 0) { return }

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

// Add channel videos into database
(async () => {
    try {
        // ensure all youtube channels are in the youtube_channels table
        //await populateYoutubeChannels();
        console.log('-I- Channels added successfully');

        // retrieve and save all youtube videos
        //await retrieveYoutubeVideos();
        console.log('-I- Videos saved successfully');

        // retrieve all youtube video transcripts
        await retrieveAndSaveYoutubeVideoTranscript();
        console.log('-I- Transcripts saved successfully');


    } catch (error) {
        console.error('-E- An error occurred:', error);
    }
})();