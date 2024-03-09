import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database';

class mentioned_countries extends Model {
    public countryId!: number;
    public topicId!: string;
    public countryCode!: string;
    public mentions!: number;
    public sentiment!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

mentioned_countries.init({
    countryId: {
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
    countryCode: {
        type: DataTypes.STRING(3),
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
    modelName: 'mentioned_countries',
    tableName: 'mentioned_countries',
    timestamps: true
});

export default mentioned_countries;
