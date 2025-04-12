import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// Rate limiting strategies enum
export enum RateLimitStrategy {
    TOKEN_BUCKET = 'token_bucket',
    SLIDING_WINDOW = 'sliding_window',
    FIXED_WINDOW = 'fixed_window',
    LEAKY_BUCKET = 'leaky_bucket',
}

// Interface for App attributes
interface AppAttributes {
    id: string;
    name: string;
    userId: string;
    baseUrl: string;
    rateLimitStrategy: RateLimitStrategy;
    requestLimit: number;
    timeWindowMs: number;
    additionalConfig?: object;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

// Interface for App creation attributes
interface AppCreationAttributes extends Optional<AppAttributes, 'id' | 'additionalConfig' | 'isActive'> {}

// App model class
class App extends Model<AppAttributes, AppCreationAttributes> implements AppAttributes {
    public id!: string;
    public name!: string;
    public userId!: string;
    public baseUrl!: string;
    public rateLimitStrategy!: RateLimitStrategy;
    public requestLimit!: number;
    public timeWindowMs!: number;
    public additionalConfig!: object;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

// Initialize App model
App.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        baseUrl: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isUrl: true,
            },
        },
        rateLimitStrategy: {
            type: DataTypes.ENUM(...Object.values(RateLimitStrategy)),
            allowNull: false,
            defaultValue: RateLimitStrategy.TOKEN_BUCKET,
        },
        requestLimit: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 1,
            },
        },
        timeWindowMs: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 1000, // Minimum 1 second
            },
        },
        additionalConfig: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
    },
    {
        sequelize,
        modelName: 'App',
        tableName: 'apps',
        timestamps: true,
        validate: {
            validateBaseUrl() {
                // Ensure baseUrl ends with a slash
                if (this.baseUrl && typeof this.baseUrl === 'string' && !this.baseUrl.endsWith('/')) {
                    this.baseUrl = `${this.baseUrl}/`;
                }
            },
        },
    }
);

export default App;