import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// Interface for RateLimit attributes
interface RateLimitAttributes {
    id: string;
    appId: string;
    currentCount: number;
    windowStartTime: Date;
    lastRequest: Date;
    resetTime: Date;
    tokenBucket?: number; // For token bucket strategy
    createdAt?: Date;
    updatedAt?: Date;
}

// Interface for RateLimit creation attributes
interface RateLimitCreationAttributes extends Optional<RateLimitAttributes, 'id' | 'tokenBucket'> {}

// RateLimit model class
class RateLimit extends Model<RateLimitAttributes, RateLimitCreationAttributes> implements RateLimitAttributes {
    public id!: string;
    public appId!: string;
    public currentCount!: number;
    public windowStartTime!: Date;
    public lastRequest!: Date;
    public resetTime!: Date;
    public tokenBucket?: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

// Initialize RateLimit model
RateLimit.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        appId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'apps',
                key: 'id',
            },
        },
        currentCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        windowStartTime: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        lastRequest: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        resetTime: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        tokenBucket: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
    },
    {
        sequelize,
        modelName: 'RateLimit',
        tableName: 'rate_limits',
        timestamps: true,
    }
);

export default RateLimit;