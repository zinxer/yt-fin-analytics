import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database';

class video_sources extends Model {
  public sourceId!: string;
  public sourceName!: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

video_sources.init({
  sourceId: {
    type: DataTypes.STRING(255),
    primaryKey: true,
    allowNull: false
  },
  sourceName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
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
  modelName: 'video_sources',
  tableName: 'video_sources',
  timestamps: true
});

export default video_sources;
