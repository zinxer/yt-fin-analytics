import 'dotenv/config';
import { saveChannel, saveChannelVideos } from './src/services/youtubeService';

// Add channel videos into database
(async () => {
    try {
        const channelId = 'UCxxxxxxxxxxxxxxxxxxxxxx';

        // Save channel details
        const savedChannel = await saveChannel(channelId);
        if (savedChannel) {
            console.log('-I- Channel saved successfully:', savedChannel.channelName);
        } else {
            console.log('-E- Error saving channel:', channelId);
        }

        // Save channel videos
        const savedVideos = await saveChannelVideos(channelId, 50);
        if (savedVideos) {
            console.log('-I- Videos saved successfully:', savedVideos.length);
        } else {
            console.log('-I- No videos saved', channelId);
        }

    } catch (error) {
        console.error('-E- An error occurred:', error);
    }
})();
