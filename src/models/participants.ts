import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database';

class participants extends Model {
    public participantId!: string;
    public name!: string;
    public affiliation!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

participants.init({
    participantId: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    affiliation: {
        type: DataTypes.STRING(255),
        allowNull: true
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
    modelName: 'participants',
    tableName: 'participants',
    timestamps: true
});

export default participants;
