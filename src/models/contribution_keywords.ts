import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database';

class contribution_keywords extends Model {
    public contributionId!: number;
    public keywordId!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

contribution_keywords.init({
    contributionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'contributions',
            key: 'contributionId'
        }
    },
    keywordId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'keywords',
            key: 'keywordId'
        }
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
    modelName: 'contribution_keywords',
    tableName: 'contribution_keywords',
    timestamps: true,
    indexes: [
        {
            name: 'pk_contribution_keywords',
            unique: true,
            fields: ['contributionId', 'keywordId']
        }
    ]
});

export default contribution_keywords;
