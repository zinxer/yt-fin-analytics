import 'dotenv/config';
import { updateOrSaveChannelById, updateOrSaveChannelByHandle, retrieveAndSaveChannelVideos, retrieveAndSaveYoutubeVideoTranscript } from './src/services/youtubeService';
import { analyseYoutubeVideoTitle, analyseYoutubeVideoTranscript } from './src/services/openaiService';

// Add channel videos into database
(async () => {
    try {
        const handle = 'example_channel';

        // Save channel details
        //const savedChannel = await updateOrSaveChannelByHandle(handle);
        //console.log(savedChannel)

        // Save channel videos
        const savedVideos = await retrieveAndSaveChannelVideos('UUxxxxxxxxxxxxxxxxxxxxxx');
        if (savedVideos) {
            console.log('-I- Videos saved successfully:', savedVideos.length);
        } else {
            console.log('-I- No videos saved', 'UUxxxxxxxxxxxxxxxxxxxxxx');
        }

        // //analyze all video titles from youtube_videos table
        // await analyseYoutubeVideoTitle();
        // await retrieveAndSaveYoutubeVideoTranscript();
        // await analyseYoutubeVideoTranscript('VIDEO_ID_PLACEHOLDER')


    } catch (error) {
        console.error('-E- An error occurred:', error);
    }
})();