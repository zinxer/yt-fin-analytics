// YoutubeVideoTranscripts.ts
import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database';

class YoutubeVideoTranscripts extends Model {
    declare transcript_id: number;
    declare video_id: string;
    declare language_code: string;
    declare transcript: string;
    declare is_auto_generated: boolean;
    declare created_at: Date | null;
    declare updated_at: Date | null;
}

YoutubeVideoTranscripts.init({
    transcript_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    video_id: { type: DataTypes.STRING(45), allowNull: false, references: { model: 'YoutubeVideos', key: 'video_id' } },
    language_code: { type: DataTypes.STRING(10), allowNull: false },
    transcript: { type: DataTypes.TEXT('long'), allowNull: false },
    is_auto_generated: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, onUpdate: 'NOW' }
}, {
    sequelize,
    modelName: 'YoutubeVideoTranscripts',
    tableName: 'YoutubeVideoTranscripts',
});

export default YoutubeVideoTranscripts;
