// openai_analyse_ids.ts
import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database'; // Adjust this import based on your actual Sequelize connection setup

class openai_analyse_ids extends Model {
    declare id: number;
    declare model: string;
    declare platform: string;
    declare associatedId: string;
    declare promptTokens: number;
    declare completionTokens: number;
    declare createdAt: Date;
    declare updatedAt: Date;
}

openai_analyse_ids.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, unique: true },
    platform: { type: DataTypes.STRING(45), allowNull: false },
    associatedId: { type: DataTypes.STRING(45), allowNull: false },
    model: { type: DataTypes.STRING(45), allowNull: false },
    promptTokens: { type: DataTypes.INTEGER, allowNull: false },
    completionTokens: { type: DataTypes.INTEGER, allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
}, {
    sequelize,
    modelName: 'openai_analyse_ids',
    tableName: 'openai_analyse_ids', // Make sure this matches exactly with your table name
});

sequelize.sync({ force: false, alter: false }).then(() => {
    console.log("-I- All openai_analyse_ids models were synchronized successfully.");
});

export default openai_analyse_ids;
