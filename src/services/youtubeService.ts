import 'dotenv/config';
import axios from 'axios';
import { iso8601DurationToSeconds } from '../utils/utils';
import { YoutubeTranscript } from 'youtube-transcript';
import fs from 'fs';
import youtube_channels from '../models/youtube_channels';
import videos from '../models/videos';
import { Op } from 'sequelize';

const API_KEY = process.env.YOUTUBE_DATA_API_KEY;
