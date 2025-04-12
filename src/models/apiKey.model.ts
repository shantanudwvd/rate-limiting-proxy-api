import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

// Interface for ApiKey attributes
interface ApiKeyAttributes {
    id: string;
    key: string;
    userId: string;
    isActive: boolean;
    lastUsed?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

// Interface for ApiKey creation attributes
interface ApiKeyCreationAttributes extends Optional<ApiKeyAttributes, 'id' | 'key' | 'lastUsed' | 'isActive'> {}

// ApiKey model class
class ApiKey extends Model<ApiKeyAttributes, ApiKeyCreationAttributes> implements ApiKeyAttributes {
    public id!: string;
    public key!: string;
    public userId!: string;
    public isActive!: boolean;
    public lastUsed!: Date;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

// Initialize ApiKey model
ApiKey.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        key: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        lastUsed: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        modelName: 'ApiKey',
        tableName: 'api_keys',
        timestamps: true,
        hooks: {
            // Generate API key before creation
            beforeCreate: (apiKey: ApiKey) => {
                const prefix = process.env.API_KEY_PREFIX || 'rlp_';
                apiKey.key = `${prefix}${uuidv4().replace(/-/g, '')}`;
            },
        },
    }
);

export default ApiKey;