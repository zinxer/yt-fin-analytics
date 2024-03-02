// markets.ts
import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database'; // Adjust this import based on your actual Sequelize connection setup
import openai_analyse_ids from './openai_analyse_ids';

class markets extends Model {
    declare id: string;
    declare platform: string;
    declare associatedId: string;
    declare topicId: string;
    declare marketType: string;
    declare openaiAnalyseId: number;
}

markets.init({
    id: { type: DataTypes.STRING(45), primaryKey: true, unique: true },
    platform: { type: DataTypes.STRING(45), allowNull: false },
    associatedId: { type: DataTypes.STRING(45), allowNull: false },
    topicId: { type: DataTypes.STRING(45), allowNull: false },
    marketType: { type: DataTypes.STRING(100), allowNull: false },
    openaiAnalyseId: { type: DataTypes.INTEGER, allowNull: false }
}, {
    sequelize,
    modelName: 'markets',
    tableName: 'markets', // Make sure this matches exactly with your table name
});

markets.belongsTo(openai_analyse_ids, { foreignKey: 'openaiAnalyseId', targetKey: 'id' });
openai_analyse_ids.hasMany(markets, { foreignKey: 'openaiAnalyseId', onDelete: 'CASCADE' });

sequelize.sync({ force: false, alter: false }).then(() => {
    console.log("-I- All markets models were synchronized successfully.");
});

export default markets;
