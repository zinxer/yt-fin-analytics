// openai_prompts.ts
import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database'; // Adjust this import based on your actual Sequelize connection setup

class openai_prompts extends Model {
    declare key: string;
    declare prompt: string;
    declare responseJsonFormat: JSON;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

openai_prompts.init({
    key: { type: DataTypes.STRING(100), primaryKey: true, allowNull: false },
    prompt: { type: DataTypes.TEXT, allowNull: false },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    sequelize,
    modelName: 'openai_prompts',
    tableName: 'openai_prompts', // Make sure this matches exactly with your table name
    timestamps: true, // enable automatic generation of createdAt and updatedAt fields
});

export default openai_prompts;
