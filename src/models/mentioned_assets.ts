import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database';

class mentioned_assets extends Model {
    public assetId!: number;
    public topicId!: string;
    public assetName!: string;
    public mentions!: number;
    public sentiment!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

mentioned_assets.init({
    assetId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    topicId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        references: {
            model: 'topics',
            key: 'topicId'
        }
    },
    assetName: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    mentions: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    sentiment: {
        type: DataTypes.STRING(50),
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
    modelName: 'mentioned_assets',
    tableName: 'mentioned_assets',
    timestamps: true
});

export default mentioned_assets;
