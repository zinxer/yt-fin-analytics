// YoutubeChannels.ts
import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database'; // Adjust this import based on your actual Sequelize connection setup

class YoutubeChannels extends Model {
    declare channel_id: string;
    declare channel_name: string | null;
    declare custom_url: string | null;
    declare channel_url: string;
    declare description: string;
    declare publish_date: Date | null;
    declare thumbnail_url: string;
    declare country: string | null;
    declare subscriber_count: bigint | null;
    declare video_count: bigint | null;
    declare view_count: bigint | null;
}

YoutubeChannels.init({
    channel_id: { type: DataTypes.STRING(45), primaryKey: true },
    channel_name: { type: DataTypes.STRING(100), allowNull: true },
    custom_url: { type: DataTypes.STRING(45), allowNull: true, unique: true },
    channel_url: { type: DataTypes.TEXT, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    publish_date: { type: DataTypes.DATE, allowNull: true },
    thumbnail_url: { type: DataTypes.TEXT, allowNull: true },
    country: { type: DataTypes.STRING(45), allowNull: true },
    subscriber_count: { type: DataTypes.BIGINT, allowNull: true },
    video_count: { type: DataTypes.BIGINT, allowNull: true },
    view_count: { type: DataTypes.BIGINT, allowNull: true },
}, {
    sequelize,
    modelName: 'YoutubeChannels',
    tableName: 'YoutubeChannels', // Make sure this matches exactly with your table name
});

export default YoutubeChannels;
