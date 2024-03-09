import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database';

class mentioned_sectors extends Model {
    public sectorId!: number;
    public topicId!: string;
    public sectorName!: string;
    public mentions!: number;
    public sentiment!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

mentioned_sectors.init({
    sectorId: {
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
    sectorName: {
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
    modelName: 'mentioned_sectors',
    tableName: 'mentioned_sectors',
    timestamps: true
});

export default mentioned_sectors;
