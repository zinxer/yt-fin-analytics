import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database';

class topics extends Model {
    public topicId!: string;
    public title!: string;
    public summary!: string;
    public openaiRunId!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

topics.init({
    topicId: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    summary: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    openaiRunId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'openai_runs',
            key: 'runId'
        }
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
    modelName: 'topics',
    tableName: 'topics',
    timestamps: true
});

export default topics;
