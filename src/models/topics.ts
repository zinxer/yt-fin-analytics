// topics.ts
import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database'; // Adjust this import based on your actual Sequelize connection setup

class topics extends Model {
    declare id: string;
    declare platform: string;
    declare associatedId: string;
    declare title: string;
    declare summary: string;
    declare sentiment: string;
    declare factualQuality: string;
}

topics.init({
    id: { type: DataTypes.STRING(45), primaryKey: true, unique: true },
    platform: { type: DataTypes.STRING(45), allowNull: false },
    associatedId: { type: DataTypes.STRING(45), allowNull: false },
    title: { type: DataTypes.STRING(100), allowNull: true },
    summary: { type: DataTypes.TEXT, allowNull: true },
    sentiment: { type: DataTypes.STRING(45), allowNull: true },
    factualQuality: { type: DataTypes.STRING(45), allowNull: true }
}, {
    sequelize,
    modelName: 'topics',
    tableName: 'topics', // Make sure this matches exactly with your table name
});

sequelize.sync({ force: false, alter: false }).then(() => {
    console.log("-I- All topcis models were synchronized successfully.");
});

export default topics;
