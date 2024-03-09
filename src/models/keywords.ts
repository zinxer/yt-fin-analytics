import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database';

class keywords extends Model {
    public keywordId!: number;
    public keyword!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

keywords.init({
    keywordId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    keyword: {
        type: DataTypes.STRING(255),
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
    modelName: 'keywords',
    tableName: 'keywords',
    timestamps: true
});

export default keywords;
