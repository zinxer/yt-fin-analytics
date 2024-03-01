// youtube_channels.ts
import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database'; // Adjust this import based on your actual Sequelize connection setup

class youtube_channels extends Model {
    declare id: string;
    declare customUrl: string | null;
    declare channelName: string | null;
    declare url: string;
    declare description: string;
    declare thumbnailUrl: string;
    declare country: string | null;
    declare subscriberCount: bigint | null;
    declare videoCount: bigint | null;
    declare viewCount: bigint | null;
    declare publishedAt: Date | null;
}

youtube_channels.init({
    id: { type: DataTypes.STRING(45), primaryKey: true, unique: true },
    customUrl: { type: DataTypes.STRING(45), allowNull: true, unique: true },
    channelName: { type: DataTypes.STRING(100), allowNull: true },
    url: { type: DataTypes.TEXT, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    thumbnailUrl: { type: DataTypes.TEXT, allowNull: true },
    country: { type: DataTypes.STRING(45), allowNull: true },
    subscriberCount: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    videoCount: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    viewCount: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    publishedAt: { type: DataTypes.DATE, allowNull: true },
}, {
    sequelize,
    modelName: 'youtube_channels',
    tableName: 'youtube_channels', // Make sure this matches exactly with your table name
});

sequelize.sync({ force: false, alter: false }).then(() => {
    console.log("-I- All youtube_channels models were synchronized successfully.");
});

export default youtube_channels;
