// youtube_videos.ts
import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database'; // Adjust this import based on your actual Sequelize connection setup
import youtube_channels from './youtube_channels'; // Import the youtube_channels model

class youtube_videos extends Model {
    declare id: string;
    declare channelId: string; // Add the channel_id field
    declare url: string;
    declare title: string;
    declare titleInvestmentScore: string;
    declare titleMarketType: string;
    declare analysedTitle: string;
    declare titleSentiment: string;
    declare description: string;
    declare duration: number;
    declare thumbnailUrl: string;
    declare viewCount: number;
    declare likeCount: number;
    declare commentCount: number;
    declare transcript: string;
    declare summary: string;
    declare transcriptQuality: string;
    declare transcriptLang: string;
    declare aiModel: string;
    declare openaiAnalyseId: number;
    declare isFinance: boolean;
    declare publishedAt: Date;
    declare createdAt: Date;
    declare updatedAt: Date;
}

youtube_videos.init({
    id: { type: DataTypes.STRING(45), primaryKey: true, unique: true },
    channelId: { type: DataTypes.STRING(45), allowNull: false, references: { model: youtube_channels, key: 'id' } }, // Add the channel_id field with reference to youtube_channels id
    url: { type: DataTypes.TEXT, allowNull: false },
    title: { type: DataTypes.STRING(100), allowNull: false },
    titleInvestmentScore: { type: DataTypes.STRING(45), allowNull: true },
    titleMarketType: { type: DataTypes.STRING(45), allowNull: true },
    analysedTitle: { type: DataTypes.STRING(255), allowNull: true },
    titleSentiment: { type: DataTypes.STRING(45), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: false },
    duration: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    thumbnailUrl: { type: DataTypes.TEXT, allowNull: false },
    viewCount: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    likeCount: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    commentCount: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    transcript: { type: DataTypes.TEXT('long'), allowNull: true },
    summary: { type: DataTypes.TEXT, allowNull: true },
    transcriptQuality: { type: DataTypes.STRING(45), allowNull: true },
    transcriptLang: { type: DataTypes.STRING(45), allowNull: true },
    aiModel: { type: DataTypes.STRING(45), allowNull: true },
    openaiAnalyseId: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    isFinance: { type: DataTypes.BOOLEAN, allowNull: true },
    publishedAt: { type: DataTypes.DATE, allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
}, {
    sequelize,
    modelName: 'youtube_videos',
    tableName: 'youtube_videos', // Make sure this matches exactly with your table name
});

sequelize.sync({ force: false, alter: false }).then(() => {
    console.log("-I- All youtube_videos models were synchronized successfully.");
});

export default youtube_videos;
