import { openaiNumTokensFromString } from '../utils/utils';
import openai_prompts from '../models/openai_prompts';
import youtube_videos from '../models/youtube_videos';
import youtube_channels from '../models/youtube_channels';
import topics from '../models/topics';
import OpenAI from 'openai';
import { Op } from 'sequelize';
import md5 from 'md5';
import sequelize from '../../config/database';
import markets from '../models/markets';
import countries from '../models/countries';
import assets from '../models/assets';
import keywords from '../models/keywords';
import participant_sentiments from '../models/participant_sentiments';

// Define your API key and the model you want to use
const openai = new OpenAI(process.env.OPENAI_API_KEY as any); // Provide a default value for OPENAI_API_KEY
const MODEL = process.env.OPENAI_MODEL_ID!; // Using the cheaper model as per your request
const MODEL_TOKEN_LIMIT: number = Number(process.env.OPENAI_MODEL_TOKEN_LIMIT!);

// Function to query the OpenAI API
async function queryOpenAI(prompt: string, isJson = true, maxTokenSize = MODEL_TOKEN_LIMIT) {
    const contextTokenSize = openaiNumTokensFromString(prompt, MODEL);
    if (Number(contextTokenSize) > MODEL_TOKEN_LIMIT) {
        console.log(`-E- The number of tokens in the prompt exceeds the limit of ${MODEL_TOKEN_LIMIT}`);
        return
    }

    try {
        const response = await openai.chat.completions.create({
            model: MODEL,
            messages: [
                {
                    "role": "system",
                    "content": prompt
                }],
            //max_tokens: maxTokenSize,
            temperature: 0.7, // Adjust for creativity level,
            response_format: {
                "type": isJson ? "json_object" : "text"
            }
        });
        return response.choices[0];
    } catch (error) {
        console.error('-E- Error:', error);
        return
    }
}

export async function analyseYoutubeVideoTitle(videoId: string = '', forceUpdate: boolean = false) {
    // process video title if videoId is provided, else process all video titles in youtube_videos table
    if (videoId) {
        //get video title from youtube_videos table
        let queryParam = { id: videoId, titleInvestmentScore: null, titleMarketType: null } as any
        if (forceUpdate) {
            delete queryParam.titleInvestmentScore;
            delete queryParam.titleMarketType;
        }
        const video = await youtube_videos.findOne({ where: queryParam });
        if (video) {
            const openaiPrompt = await openai_prompts.findOne({ where: { key: 'VIDEO_TITLE' } });
            if (openaiPrompt) {
                const { prompt, responseJsonFormat } = openaiPrompt;
                const fullPrompt = `Video title: ${video.title}; ${prompt}; ${JSON.stringify(responseJsonFormat)}`;

                // query the openai API
                const response = await queryOpenAI(fullPrompt);
                if (response !== undefined) {
                    // check if response.message.content value is a valid JSON object
                    try {
                        const responseJson = JSON.parse((response as any).message.content);
                        // update the video record with the response
                        await video.update({
                            titleInvestmentScore: responseJson.is_title_investment_related,
                            titleMarketType: responseJson.market_type,
                        });
                    } catch (error) {
                        console.error('-E- Error parsing JSON:', error);
                    }
                }
            }
            return video
        }
    } else {
        //get video title from youtube_videos table
        let queryParam = { titleInvestmentScore: null, titleMarketType: null } as any
        if (forceUpdate) {
            delete queryParam.titleInvestmentScore;
            delete queryParam.titleMarketType;
        }
        const video = await youtube_videos.findAll({ where: queryParam });
        if (video.length > 0) {
            const openaiPrompt = await openai_prompts.findOne({ where: { key: 'VIDEO_TITLE' } });
            if (openaiPrompt) {
                const { prompt, responseJsonFormat } = openaiPrompt;

                for (const videoItem of video) {
                    const fullPrompt = `Video title: ${videoItem.title}; ${prompt}; ${JSON.stringify(responseJsonFormat)}`;

                    // query the openai API
                    const response = await queryOpenAI(fullPrompt);
                    if (response !== undefined) {
                        // check if response.message.content value is a valid JSON object
                        try {
                            const responseJson = JSON.parse((response as any).message.content);
                            // update the video record with the response
                            await videoItem.update({
                                titleInvestmentScore: responseJson.is_title_investment_related,
                                titleMarketType: responseJson.market_type,
                            });
                        } catch (error) {
                            console.error('-E- Error parsing JSON:', error);
                        }
                    }
                }
            }
            return video
        }
    }
    return null
}

export async function analyseYoutubeVideoTranscript(videoId: string = '', forceUpdate: boolean = false) {
    // process video title if videoId is provided, else process all video titles in youtube_videos table
    if (videoId) {
        //get video title from youtube_videos table
        let queryParam = { id: videoId, transcript: { [Op.not]: null }, summary: null } as any
        if (forceUpdate) {
            delete queryParam.summary;
        }
        const video = await youtube_videos.findOne({ where: queryParam });
        if (video) {

            // TODO: filter long descriptions
            // TODO: filter long transcripts
            const openaiPrompt = await openai_prompts.findOne({ where: { key: 'VIDEO_TRANSCRIPT' } });
            if (openaiPrompt) {
                const { prompt, responseJsonFormat } = openaiPrompt;
                // get channel name from youtube_channel table using video.channelId
                const channel = await youtube_channels.findOne({ where: { id: video.channelId } });
                const fullPrompt = `channel_name: ${channel?.channelName}; video_title: ${video.title}; video_description: ${video.description}; video_transcript: ${video.transcript}; ${JSON.stringify(responseJsonFormat)}\n\n${prompt}`;

                // query the openai API
                console.time('openai_query');
                const response = await queryOpenAI(fullPrompt);
                console.timeEnd('openai_query');
                if (response !== undefined) {
                    // check if response.message.content value is a valid JSON object
                    try {
                        const responseJson = JSON.parse((response as any).message.content);
                        await recordAnalysedYoutubeVideoData(video, responseJson);

                    } catch (error) {
                        console.error('-E- Error parsing JSON:', error);
                    }
                }
            }
            return video
        }
    }
    return null
}

async function recordAnalysedYoutubeVideoData(video: any, responseJson: any) {
    const transaction = await sequelize.transaction();
    console.log("debug0", responseJson)

    try {
        // Perform database operations within the transaction
        await video.update({
            analysedTitle: responseJson.title.text,
            titleSentiment: responseJson.title.title_sentiment,
            summary: responseJson.conclusion.summary,
            transcriptQuality: responseJson.conclusion.transcript_quality_score,
            transcriptLang: responseJson.conclusion.transcript_lang,
            aiModel: MODEL,
            isFinance: responseJson.conclusion.is_finance_related,
        }, { transaction });

        // process topic_discussed
        if (responseJson.topic_discussed.length > 0) {
            // loop through topic_discussed
            for (const topic of responseJson.topic_discussed) {
                console.log("debug topic", topic.topic)
                const topicId = (md5(video.id + topic.topic)).substring(0, 10)

                // topics table
                await topics.upsert({
                    id: topicId,
                    platform: 'youtube_videos',
                    associatedId: video.id,
                    title: topic.topic,
                    summary: topic.summary,
                    sentiment: topic.sentiment,
                    factualQuality: topic.factual_quality_score,
                }, { transaction });

                if (topic.market_type.length > 0) {
                    // markets table
                    for (let market of topic.market_type) {
                        market = market.toLowerCase();
                        await markets.upsert({
                            id: (md5(video.id + market)).substring(0, 10),
                            platform: 'youtube_videos',
                            associatedId: video.id,
                            topicId: topicId,
                            marketType: market,
                        }, { transaction });
                    }
                }
                if (topic.related_country.length > 0) {
                    // countries table
                    for (let country of topic.related_country) {
                        country = country.toLowerCase();
                        await countries.upsert({
                            id: (md5(video.id + country)).substring(0, 10),
                            platform: 'youtube_videos',
                            associatedId: video.id,
                            topicId: topicId,
                            countryName: country
                        }, { transaction });
                    }
                }

                if (topic.asset_discussed.length > 0) {
                    // assets table
                    for (let asset of topic.asset_discussed) {
                        asset = asset.toLowerCase();
                        await assets.upsert({
                            id: (md5(video.id + asset)).substring(0, 10),
                            platform: 'youtube_videos',
                            associatedId: video.id,
                            topicId: topicId,
                            assetName: asset,
                        }, { transaction });
                    }
                }

                if (topic.keywords.length > 0) {
                    // keywords table
                    for (let keyword of topic.keywords) {
                        keyword = keyword.toLowerCase();
                        await keywords.upsert({
                            id: (md5(video.id + keyword)).substring(0, 10),
                            platform: 'youtube_videos',
                            associatedId: video.id,
                            topicId: topicId,
                            word: keyword
                        }, { transaction });
                    }
                }
            } // end of topic_discussed loop
        }   // end of process topic_discussed

        // process asset_discussed
        if (responseJson.asset_discussed.length > 0) {
            for (let asset of responseJson.asset_discussed) {
                // assets table
                asset.asset_name = asset.asset_name.toLowerCase();
                await assets.upsert({
                    id: (md5(video.id + asset.asset_name)).substring(0, 10),
                    platform: 'youtube_videos',
                    associatedId: video.id,
                    assetName: asset.asset_name,
                    country: asset.related_country,
                    marketType: asset.market_type,
                    weight: asset.weight,
                    sentiment: asset.overall_sentiment,
                    shortTermSentiment: asset.prediction.short_term,
                    longTermSentiment: asset.prediction.long_term,
                    strength: asset.strength,
                    weakness: asset.weakness
                }, { transaction });

                if (asset.participant.length > 0) {
                    // participant_sentiment table
                    for (let participant of asset.participant) {
                        participant.name = participant.name.toLowerCase();
                        await participant_sentiments.upsert({
                            id: (md5(video.id + participant.name)).substring(0, 10),
                            platform: 'youtube_videos',
                            associatedId: video.id,
                            assetName: asset.asset_name,
                            participantName: participant.name,
                            sentiment: participant.sentiment,
                            emotion: participant.emotion
                        }, { transaction });
                    }
                }
            }
        } // end of process asset_discussed

        await transaction.commit();
    } catch (error) {
        // Rollback the transaction if any operation fails
        await transaction.rollback();
        console.error('Error occurred during database transactions:', error);
    }
}