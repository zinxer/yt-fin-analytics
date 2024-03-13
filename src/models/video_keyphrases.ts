import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database';

class video_keyphrases extends Model {
    public id!: number;
    public videoId!: string;
    public keyphrase!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

video_keyphrases.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    videoId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'videos', key: 'videoId' }
    },
    openaiRunId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'openai_runs', key: 'id' }
    },
    keyphrase: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    sequelize,
    modelName: 'video_keyphrases',
    tableName: 'video_keyphrases',
    timestamps: true,
    indexes: [
        {
            name: 'pk_video_keyphrases',
            unique: true,
            fields: ['videoId', 'openaiRunId']
        }
    ]
});

export default video_keyphrases;
