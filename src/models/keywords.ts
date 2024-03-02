// keywords.ts
import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database'; // Adjust this import based on your actual Sequelize connection setup
import openai_analyse_ids from './openai_analyse_ids';

class keywords extends Model {
    declare id: string;
    declare platform: string;
    declare associatedId: string;
    declare topicId: string;
    declare word: string;
    declare openaiAnalyseId: number;
}

keywords.init({
    id: { type: DataTypes.STRING(45), primaryKey: true, unique: true },
    platform: { type: DataTypes.STRING(45), allowNull: false },
    associatedId: { type: DataTypes.STRING(45), allowNull: false },
    topicId: { type: DataTypes.STRING(45), allowNull: false },
    word: { type: DataTypes.STRING(100), allowNull: true },
    openaiAnalyseId: { type: DataTypes.INTEGER, allowNull: false }
}, {
    sequelize,
    modelName: 'keywords',
    tableName: 'keywords', // Make sure this matches exactly with your table name
});

keywords.belongsTo(openai_analyse_ids, { foreignKey: 'openaiAnalyseId', targetKey: 'id' });
openai_analyse_ids.hasMany(keywords, { foreignKey: 'openaiAnalyseId', onDelete: 'CASCADE' });

sequelize.sync({ force: false, alter: false }).then(() => {
    console.log("-I- All keywords models were synchronized successfully.");
});

export default keywords;
