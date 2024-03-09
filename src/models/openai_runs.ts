import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database';

class openai_runs extends Model {
    public runId!: number;
    public videoId!: number;
    public model!: string;
    public promptTokens!: number;
    public completionTokens!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

openai_runs.init({
    runId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    videoId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'videos',
            key: 'videoId'
        },
        onDelete: 'CASCADE'
    },
    model: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    promptTokens: {
        type: DataTypes.MEDIUMINT,
        allowNull: false
    },
    completionTokens: {
        type: DataTypes.MEDIUMINT,
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
    modelName: 'openai_runs',
    tableName: 'openai_runs',
    timestamps: true
});

export default openai_runs;
