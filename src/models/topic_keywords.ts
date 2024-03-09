import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database';

class topic_keywords extends Model {
    public topicId!: string;
    public keywordId!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

topic_keywords.init({
    topicId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        references: { model: 'topics', key: 'topicId' }
    },
    keywordId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'keywords', key: 'keywordId' }
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
    modelName: 'topic_keywords',
    tableName: 'topic_keywords',
    timestamps: true,
    indexes: [
        {
            name: 'pk_topic_keywords',
            unique: true,
            fields: ['topicId', 'keywordId']
        }
    ]
});

export default topic_keywords;
