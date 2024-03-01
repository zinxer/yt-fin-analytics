// countries.ts
import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database'; // Adjust this import based on your actual Sequelize connection setup

class countries extends Model {
    declare id: string;
    declare platform: string;
    declare associatedId: string;
    declare topicId: string;
    declare countryName: string;
}

countries.init({
    id: { type: DataTypes.STRING(45), primaryKey: true, unique: true },
    platform: { type: DataTypes.STRING(45), allowNull: false },
    associatedId: { type: DataTypes.STRING(45), allowNull: false },
    topicId: { type: DataTypes.STRING(45), allowNull: true },
    countryName: { type: DataTypes.STRING(100), allowNull: false },
}, {
    sequelize,
    modelName: 'countries',
    tableName: 'countries', // Make sure this matches exactly with your table name
});

sequelize.sync({ force: false, alter: false }).then(() => {
    console.log("-I- All countries models were synchronized successfully.");
});

export default countries;
