// participant_sentiments.ts
import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database'; // Adjust this import based on your actual Sequelize connection setup
import openai_analyse_ids from './openai_analyse_ids';

class participant_sentiments extends Model {
    declare id: string;
    declare platform: string;
    declare associatedId: string;
    declare assetName: string;
    declare participantName: string;
    declare sentiment: string;
    declare emotion: string;
    declare openaiAnalyseId: number;
}

participant_sentiments.init({
    id: { type: DataTypes.STRING(45), primaryKey: true, unique: true },
    platform: { type: DataTypes.STRING(45), allowNull: false },
    associatedId: { type: DataTypes.STRING(45), allowNull: false },
    assetName: { type: DataTypes.STRING(100), allowNull: false },
    participantName: { type: DataTypes.STRING(100), allowNull: false },
    sentiment: { type: DataTypes.STRING(100), allowNull: true },
    emotion: { type: DataTypes.STRING(100), allowNull: true },
    openaiAnalyseId: { type: DataTypes.INTEGER, allowNull: false }
}, {
    sequelize,
    modelName: 'participant_sentiments',
    tableName: 'participant_sentiments', // Make sure this matches exactly with your table name
});

participant_sentiments.belongsTo(openai_analyse_ids, { foreignKey: 'openaiAnalyseId', targetKey: 'id' });
openai_analyse_ids.hasMany(participant_sentiments, { foreignKey: 'openaiAnalyseId', onDelete: 'CASCADE' });

sequelize.sync({ force: false, alter: false }).then(() => {
    console.log("-I- All participant_sentiments models were synchronized successfully.");
});

export default participant_sentiments;
