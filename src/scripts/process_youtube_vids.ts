import 'dotenv/config';
import axios from 'axios';
import { YoutubeTranscript } from 'youtube-transcript';
import OpenAI from 'openai';
import { countryNameToCode, isJsonString, openaiNumTokensFromString } from '../utils/utils';

// Database models
import { video_sources, youtube_channels, videos, topics, keywords, topic_keywords, participants, contributions, contribution_keywords, mentioned_assets, mentioned_countries, mentioned_sectors, video_keyphrases } from '../models';
import { Op } from 'sequelize';
import openai_prompts from '../models/openai_prompts';
import openai_runs from '../models/openai_runs';
import sequelize from '../../config/database';
import md5 from 'md5';

// Define your API key and the model you want to use
const openai = new OpenAI(process.env.OPENAI_API_KEY as any); // Provide a default value for OPENAI_API_KEY
const YOUTUBE_API_KEY = process.env.YOUTUBE_DATA_API_KEY;
const VIDEO_LIMIT = 50
const OPENAI_MODEL = process.env.OPENAI_MODEL_ID;
const OPENAI_MAX_TOKEN = Number(process.env.OPENAI_MODEL_COMPLETION_MAX_TOKEN);

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
                const videoUid = video.videoUid;

                let response;
                try {
                    response = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
                } catch (error) { // Explicitly type 'error' as 'Error'
                    // check if the error contains 'Transcript is disabled'
                    if ((error as any).message.includes('Transcript is disabled')) {
                        console.log(`-W- Transcript is disabled for videoUid: ${videoUid}, removing from database.`);
                        // delete video from database
                        await video.destroy();
                        continue;
                    }
                    console.error(`-E- An error occurred while fetching transcript for ${videoUid}:`, error);
                    continue;
                }
                const transcript = response.map((item: any) => item.text).join(' ');

                // continue if transcript character length is larger than MYSQL TEXT type
                if (transcript.length > 65535) {
                    console.log(`-W- Transcript for videoUid: ${videoUid} is too large, removing from database.`);
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

        // Filter out videos that already have a responseJson in openai_runs corresponding to the videoId table (it means that the video has already been analysed by OpenAI and we don't need to do it again); We also filter out videos that have been marked as processedError (this way we process the videos that have been marked as processedError possibly from dirty openai_runs responseJson)
        const videoIds = videosWithTranscript.map((video) => video.videoId);
        const openaiRuns = await openai_runs.findAll({ where: { videoId: videoIds, model: OPENAI_MODEL, responseJson: { [Op.ne]: null }, processedError: false } });
        const openaiRunVideoIds = openaiRuns.map((openaiRun) => openaiRun.videoId);
        const filteredVideos = videosWithTranscript.filter((video) => !openaiRunVideoIds.includes(video.videoId));
        // return if there are no videos with transcript
        if (filteredVideos.length === 0) { return }

        const openaiPrompt = await openai_prompts.findOne({ where: { key: 'OPENAI_VIDEO_TRANSCRIPT' } });
        const { prompt } = openaiPrompt!;
        // loop through the videos and analyse the transcript
        for (let i = 0; i < filteredVideos.length; i++) {
            await promptOpenAIandSave(filteredVideos[i], prompt);
            // delay 5 seconds to avoid openAi rate limit
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    } catch (error) {
        console.error('-E- An error occurred:', error);
    }
}

// sub function to openaiAnalyseTranscript to prompt openai and save the response in openai_runs responseJson
async function promptOpenAIandSave(video: any, prompt: string) {
    try {
        const videoTitle = video.title;
        const videoDescription = video.description;
        const transcript = video.transcript;
        const messages = [{
            role: 'system',
            content: prompt
        }, {
            role: 'user',
            content: `video_title:${videoTitle}; video_description:${videoDescription}; video_transcript:${transcript}`
        }]

        // construct openai prompt
        const openaiPrompt = {
            model: OPENAI_MODEL,
            messages: messages,
            temperature: 0.7,
            max_tokens: OPENAI_MAX_TOKEN,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
            response_format: { "type": "json_object" }
        }
        //skip if prompt token length is larger than 16385 - 2000 (account for completion_tokens) for MODEL: gpt-3.5-turbo
        const contextTokenSize = openaiNumTokensFromString(JSON.stringify(messages), OPENAI_MODEL!);
        const tokenLimit = 16385 - OPENAI_MAX_TOKEN;
        if (Number(contextTokenSize) > tokenLimit) {
            console.log(`-E- The number of tokens in the prompt for ${video.videoUid} exceeds the limit of ${tokenLimit}, removing from database.`);
            // remove video from database
            await video.destroy();
            return
        }

        // find or create openai_runs so that we don't create another run for the same videoId and model
        const [openaiRun, created] = await openai_runs.findOrCreate({
            where: { videoId: video.videoId, model: OPENAI_MODEL },
            defaults: { videoId: video.videoId, model: OPENAI_MODEL }
        });

        // send request to openai
        console.log(`-I- Sending request to openai for videoUid: ${video.videoUid}`)
        const response = await openai.chat.completions.create(openaiPrompt as any);
        if (!response) { return; }
        const openaiResponseContent = response.choices[0].message.content;
        if (!openaiResponseContent) { return; }
        if (!isJsonString(openaiResponseContent)) { console.log(`-W- Response for openai_runs runId: ${openaiRun.runId} is not a JSON object for videoUid: ${video.videoUid}`); return; }

        openaiRun.responseJson = JSON.parse(openaiResponseContent);
        openaiRun.promptTokens = response.usage!.prompt_tokens;
        openaiRun.completionTokens = response.usage!.completion_tokens;
        openaiRun.totalTokens = response.usage!.total_tokens;
        openaiRun.processedError = false; // reset processedError to false
        await openaiRun.save();
    } catch (error) {
        console.error('-E- An error occurred:', error);
    }
}

async function processOpenaiRunsResponse() {
    try {
        // get all openai_runs with responseJson
        const openaiRuns = await openai_runs.findAll({ where: { responseJson: { [Op.ne]: null }, processed: false, processedError: false } });
        if (openaiRuns.length === 0) { return }
        console.log(`-I- Processing ${openaiRuns.length} openai_runs`);
        // loop through the openai_runs and process the responseJson
        for (let i = 0; i < openaiRuns.length; i++) {
            const openaiRun = openaiRuns[i];
            const videoId = openaiRun.videoId;
            const responseJson = openaiRun.responseJson;
            const openaiRunId = openaiRun.runId;

            console.log(`-I- Processing openai_run runId: ${openaiRunId} for videoId: ${videoId}`)
            await processAnalysedTranscriptData(videoId, responseJson, openaiRunId);
        }
    } catch (error) {
        console.error('-E- An error occurred:', error);
    }
}

// sub function to processOpenaiRunsResponse to process the responseJson and save the data in the database
async function processAnalysedTranscriptData(videoId: number, responseJson: any, openaiRunId: number) {
    const transaction = await sequelize.transaction();
    try {
        // Save analysedTitle and overallSentiment from responseJson if videoId exists in the database
        const video = await videos.findOne({ where: { videoId: videoId } });
        if (video) {
            video.analysedTitle = responseJson.title;
            video.overallSentiment = responseJson.analysis.overall_sentiment;
            await video.save({ transaction });

            // Process Keyphrases
            for (const keyphrase of responseJson.analysis.key_phrases) {
                if (['unknown', 'none'].includes(keyphrase.toLowerCase())) {
                    continue;
                }
                const [videoKeyphrase] = await video_keyphrases.findOrCreate({
                    where: { videoId: videoId, keyphrase: keyphrase },
                    defaults: { videoId: videoId, keyphrase: keyphrase, openaiRunId: openaiRunId },
                    transaction
                });
            }
        }

        // Process Topics
        for (const topicData of responseJson.analysis.topics) {
            if (['unknown', 'none'].includes(topicData.title.toLowerCase())) {
                continue;
            }
            const topicId = md5(`${videoId}-${topicData.topic_id}-${openaiRunId}`).substring(0, 12)
            // find or create topic
            const [topic, created] = await topics.findOrCreate({
                where: { videoId: videoId, title: topicData.title },
                defaults: {
                    topicId: topicId,
                    videoId: videoId,
                    title: topicData.title,
                    summary: topicData.summary,
                    openaiRunId: openaiRunId
                },
                transaction
            });

            // Assuming keywords are associated with topics
            for (const keywordText of topicData.keywords) {
                const [keyword] = await keywords.findOrCreate({
                    where: { keyword: keywordText },
                    defaults: { keyword: keywordText },
                    transaction
                });
                await topic_keywords.findOrCreate({
                    where: { topicId: topicId, keywordId: keyword.keywordId },
                    defaults: { topicId: topicId, keywordId: keyword.keywordId },
                    transaction
                });
            }
        } // end of topics loop

        // Process Participants and their Contributions
        for (const participantData of responseJson.analysis.participants) {
            if (['unknown', 'none'].includes(participantData.name.toLowerCase())) { continue }
            const participantId = md5(`${participantData.name}-${participantData.affiliation}`).substring(0, 12)
            // find or create participant
            const [participant] = await participants.findOrCreate({
                where: { participantId: participantId },
                defaults: {
                    participantId: participantId,
                    name: participantData.name,
                    affiliation: participantData.affiliation
                },
                transaction
            });

            for (const contributionData of participantData.contributions) {
                let topicId = md5(`${videoId}-${contributionData.topic_id}-${openaiRunId}`).substring(0, 12)

                // Check if topicId is unknown or none, if so, give it a topicId from the topics table based on videoId
                if (['unknown', 'none'].includes(contributionData.topic_id.toLowerCase())) {
                    const topic = await topics.findOne({ where: { videoId: videoId } });
                    if (topic) {
                        topicId = topic.topicId;
                    } else {
                        continue;
                    }
                }
                const [contribution] = await contributions.findOrCreate({
                    where: {
                        participantId: participantId,
                        topicId: topicId,
                        sentiment: contributionData.sentiment
                    },
                    defaults: {
                        participantId: participantId,
                        topicId: topicId,
                        sentiment: contributionData.sentiment
                    },
                    transaction
                });

                // Process Contribution Keywords
                for (const keywordText of contributionData.keywords) {
                    const [keyword] = await keywords.findOrCreate({
                        where: { keyword: keywordText },
                        defaults: { keyword: keywordText },
                        transaction
                    });
                    await contribution_keywords.findOrCreate({
                        where: {
                            contributionId: contribution.contributionId,
                            keywordId: keyword.keywordId
                        },
                        defaults: {
                            contributionId: contribution.contributionId,
                            keywordId: keyword.keywordId
                        },
                        transaction
                    });
                }

                // Process Mentioned Assets
                for (const assetName of contributionData.mentioned_assets) {
                    if (['unknown', 'none'].includes(assetName.toLowerCase())) {
                        continue;
                    }
                    for (const keyAsset of responseJson.analysis.key_assets) {
                        if (keyAsset.asset_name === assetName) {
                            const [mentionedAsset] = await mentioned_assets.findOrCreate({
                                where: {
                                    topicId: topicId,
                                    assetName: assetName
                                },
                                defaults: {
                                    topicId: topicId,
                                    assetName: assetName,
                                    mentions: keyAsset.mentions ? keyAsset.mentions : 1,
                                    sentiment: keyAsset.sentiment
                                },
                                transaction
                            });
                        }
                    }
                }

                // Process Mentioned Countries
                for (const countryName of contributionData.mentioned_countries) {
                    if (['unknown', 'none'].includes(countryName.toLowerCase())) {
                        continue;
                    }
                    for (const keyCountry of responseJson.analysis.key_countries) {
                        if (keyCountry.country_name === countryName) {
                            const [mentionedCountry] = await mentioned_countries.findOrCreate({
                                where: {
                                    topicId: topicId,
                                    countryCode: countryNameToCode(countryName)?.toLocaleUpperCase()
                                },
                                defaults: {
                                    topicId: topicId,
                                    countryCode: countryNameToCode(countryName)?.toLocaleUpperCase(),
                                    mentions: keyCountry.mentions ? keyCountry.mentions : 1,
                                    sentiment: keyCountry.sentiment
                                },
                                transaction
                            });
                        }
                    }
                }

                // Process Mentioned Sectors
                for (const sectorName of contributionData.mentioned_sectors) {
                    if (['unknown', 'none'].includes(sectorName.toLowerCase())) {
                        continue;
                    }
                    for (const keySector of responseJson.analysis.key_sectors) {
                        if (keySector.sector_name === sectorName) {
                            const [mentionedSector] = await mentioned_sectors.findOrCreate({
                                where: {
                                    topicId: topicId,
                                    sectorName: sectorName
                                },
                                defaults: {
                                    topicId: topicId,
                                    sectorName: sectorName,
                                    mentions: keySector.mentions ? keySector.mentions : 1,
                                    sentiment: keySector.sentiment
                                },
                                transaction
                            });
                        }
                    }
                }

            } // end of contributions loop

        } // end of participants loop
        await openai_runs.update({ processed: true }, { where: { runId: openaiRunId }, transaction });
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        await openai_runs.update({ processedError: true }, { where: { runId: openaiRunId } });
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
        console.log('-I- OpenAI analysis completed successfully');

        await processOpenaiRunsResponse();
        console.log('-I- OpenAI runs processed successfully');

    } catch (error) {
        console.error('-E- An error occurred:', error);
    }
})();