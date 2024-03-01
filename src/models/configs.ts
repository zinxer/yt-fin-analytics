// config.ts
import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database'; // Adjust this import based on your actual Sequelize connection setup

class configs extends Model {
  public key!: string;
  public value!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

configs.init(
  {
    key: {
      type: DataTypes.STRING(45),
      allowNull: false,
      primaryKey: true,
      unique: true,
    },
    value: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    modelName: 'configs',
    tableName: 'configs',
    sequelize, // passing the `sequelize` instance is required
    timestamps: true, // enable automatic generation of createdAt and updatedAt fields
  }
);

sequelize.sync({ force: false, alter: true }).then(() => {
  console.log("-I- All configs models were synchronized successfully.");
});

export default configs;
