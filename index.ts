import 'dotenv/config';
import { updateOrSaveChannelByHandle, retrieveAndSaveChannelVideos, retrieveAndSaveYoutubeVideoTranscript } from './src/services/youtubeService';
import { analyseYoutubeVideoTitle, analyseYoutubeVideoTranscript } from './src/services/openaiService';

// Driver script. Usage: ts-node index.ts <command>
//   channel      save channel details for YT_CHANNEL_HANDLE
//   videos       save videos of the uploads playlist YT_UPLOADS_PLAYLIST_ID
//   titles       analyse all stored video titles
//   transcripts  fetch and store transcripts
//   analyse      analyse the transcript of YT_VIDEO_ID
function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable ${name}`);
    }
    return value;
}

(async () => {
    try {
        const command = process.argv[2];
        switch (command) {
            case 'channel': {
                const savedChannel = await updateOrSaveChannelByHandle(requireEnv('YT_CHANNEL_HANDLE'));
                console.log(savedChannel);
                break;
            }
            case 'videos': {
                const playlistId = requireEnv('YT_UPLOADS_PLAYLIST_ID');
                const savedVideos = await retrieveAndSaveChannelVideos(playlistId);
                if (savedVideos) {
                    console.log('-I- Videos saved successfully:', savedVideos.length);
                } else {
                    console.log('-I- No videos saved for playlist', playlistId);
                }
                break;
            }
            case 'titles':
                await analyseYoutubeVideoTitle();
                break;
            case 'transcripts':
                await retrieveAndSaveYoutubeVideoTranscript();
                break;
            case 'analyse':
                await analyseYoutubeVideoTranscript(requireEnv('YT_VIDEO_ID'), 15000, true);
                break;
            default:
                console.log('Usage: ts-node index.ts <channel|videos|titles|transcripts|analyse>');
        }
    } catch (error) {
        console.error('-E- An error occurred:', error);
    }
})();
