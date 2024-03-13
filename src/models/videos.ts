import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database';

class videos extends Model {
  public videoId!: number;
  public videoUid!: string;
  public sourceId!: string;
  public title!: string;
  public description!: string;
  public transcript!: string;
  public analysedTitle!: string;
  public overallSentiment!: string;
  public publishedAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

videos.init({
  videoId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  videoUid: {
    type: DataTypes.STRING(45),
    allowNull: false
  },
  sourceId: {
    type: DataTypes.STRING(255),
    allowNull: false,
    references: {
      model: 'video_sources',
      key: 'sourceId'
    },
    onDelete: 'CASCADE'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  transcript: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  analysedTitle: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  overallSentiment: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  publishedAt: {
    type: DataTypes.DATE,
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
  modelName: 'videos',
  tableName: 'videos',
  timestamps: true
});

export default videos;
