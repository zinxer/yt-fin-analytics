import 'dotenv/config';
import { saveChannel, saveChannelVideos, retrieveAndSaveYoutubeVideoTranscript } from './src/services/youtubeService';
import { analyseYoutubeVideoTitle, analyseYoutubeVideoTranscript } from './src/services/openaiService';

// Add channel videos into database
(async () => {
    try {
        // const channelId = 'UCxxxxxxxxxxxxxxxxxxxxxx';

        // // Save channel details
        // const savedChannel = await saveChannel(channelId);
        // if (savedChannel) {
        //     console.log('-I- Channel saved successfully:', savedChannel.channelName);
        // } else {
        //     console.log('-E- Error saving channel:', channelId);
        // }

        // //Save channel videos
        // const savedVideos = await saveChannelVideos(channelId, 50);
        // if (savedVideos) {
        //     console.log('-I- Videos saved successfully:', savedVideos.length);
        // } else {
        //     console.log('-I- No videos saved', channelId);
        // }

        // //analyze all video titles from youtube_videos table
        // await analyseYoutubeVideoTitle();
        // await retrieveAndSaveYoutubeVideoTranscript();
        await analyseYoutubeVideoTranscript('VIDEO_ID_PLACEHOLDER')


    } catch (error) {
        console.error('-E- An error occurred:', error);
    }
})();