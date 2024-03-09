import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database';

class contributions extends Model {
    public contributionId!: number;
    public participantId!: string;
    public topicId!: string;
    public sentiment!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

contributions.init({
    contributionId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    participantId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        references: {
            model: 'participants',
            key: 'participantId'
        }
    },
    topicId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        references: {
            model: 'topics',
            key: 'topicId'
        }
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
    modelName: 'contributions',
    tableName: 'contributions',
    timestamps: true
});

export default contributions;
