import 'dotenv/config';
import { requireEnv, ConfigError } from './src/config';
import { disconnectPrisma } from './src/db';
import { updateOrSaveChannelByHandle, retrieveAndSaveChannelVideos, retrieveAndSaveYoutubeVideoTranscript } from './src/services/youtubeService';
import { analyseYoutubeVideoTranscripts, processOpenaiRuns } from './src/services/openaiService';

// Driver script. Usage: npm run cli -- <command>
//   channel      save channel details for YT_CHANNEL_HANDLE
//   videos       save videos of the uploads playlist YT_UPLOADS_PLAYLIST_ID
//   transcripts  fetch and store transcripts
//   analyse      send transcripts to the LLM (optionally only YT_VIDEO_ID) and store the responses
//   process      normalise stored LLM responses into the relational tables
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
            case 'transcripts':
                await retrieveAndSaveYoutubeVideoTranscript();
                break;
            case 'analyse':
                await analyseYoutubeVideoTranscripts(process.env.YT_VIDEO_ID || undefined);
                break;
            case 'process':
                await processOpenaiRuns();
                break;
            default:
                console.log('Usage: npm run cli -- <channel|videos|transcripts|analyse|process>');
        }
    } catch (error) {
        if (error instanceof ConfigError) {
            console.error(`-E- Configuration error: ${error.message}`);
        } else {
            console.error('-E- An error occurred:', error);
        }
        process.exitCode = 1;
    } finally {
        await disconnectPrisma();
    }
})();
