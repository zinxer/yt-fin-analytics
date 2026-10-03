import 'dotenv/config';

export class ConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ConfigError';
    }
}

// Returns the value of a required environment variable or throws a clear ConfigError.
export function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new ConfigError(`Missing required environment variable ${name} (see .env.example)`);
    }
    return value;
}

export function requireNumberEnv(name: string): number {
    const value = Number(requireEnv(name));
    if (!Number.isFinite(value)) {
        throw new ConfigError(`Environment variable ${name} must be a number`);
    }
    return value;
}
