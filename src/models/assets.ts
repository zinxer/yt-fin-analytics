// assets.ts
import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database'; // Adjust this import based on your actual Sequelize connection setup

class assets extends Model {
    declare id: string;
    declare platform: string;
    declare associatedId: string;
    declare topicId: string;
    declare assetName: string;
    declare country: string;
    declare marketType: string;
    declare weight: number;
    declare sentiment: string;
    declare shortTermSentiment: string;
    declare longTermSentiment: string;
    declare strength: string;
    declare weakness: string;
}

assets.init({
    id: { type: DataTypes.STRING(45), primaryKey: true, unique: true },
    platform: { type: DataTypes.STRING(45), allowNull: false },
    associatedId: { type: DataTypes.STRING(45), allowNull: false },
    topicId: { type: DataTypes.STRING(45), allowNull: true },
    assetName: { type: DataTypes.STRING(100), allowNull: false },
    country: { type: DataTypes.STRING(100), allowNull: true },
    marketType: { type: DataTypes.STRING(100), allowNull: true },
    weight: { type: DataTypes.FLOAT, allowNull: true },
    sentiment: { type: DataTypes.STRING(100), allowNull: true },
    shortTermSentiment: { type: DataTypes.STRING(100), allowNull: true },
    longTermSentiment: { type: DataTypes.STRING(100), allowNull: true },
    strength: { type: DataTypes.STRING(100), allowNull: true },
    weakness: { type: DataTypes.STRING(100), allowNull: true }
}, {
    sequelize,
    modelName: 'assets',
    tableName: 'assets', // Make sure this matches exactly with your table name
});

sequelize.sync({ force: false, alter: false }).then(() => {
    console.log("-I- All assets models were synchronized successfully.");
});

export default assets;
