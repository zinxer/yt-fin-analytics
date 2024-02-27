// YoutubeVideos.ts
import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database';

class YoutubeVideos extends Model {
    declare video_id: string;
    declare source_id: number | null;
    declare video_url: string;
    declare title: string;
    declare description: string;
    declare publish_date: Date | null;
    declare duration: number | null;
    declare thumbnail_url: string;
    declare view_count: bigint | null;
    declare like_count: bigint | null;
    declare comment_count: bigint | null;
}

YoutubeVideos.init({
    video_id: { type: DataTypes.STRING(45), primaryKey: true },
    channel_id: { type: DataTypes.STRING(45), allowNull: true },
    video_url: { type: DataTypes.TEXT, allowNull: false },
    title: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    publish_date: { type: DataTypes.DATE, allowNull: true },
    duration: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    thumbnail_url: { type: DataTypes.TEXT, allowNull: true },
    view_count: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    like_count: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    comment_count: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
}, {
    sequelize,
    modelName: 'YoutubeVideos',
    tableName: 'YoutubeVideos',
});

export default YoutubeVideos;
