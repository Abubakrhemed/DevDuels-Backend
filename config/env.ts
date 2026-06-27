import dotenv from "dotenv"
dotenv.config()

function requireEnv(name: string): string {
    const value = process.env[name]
    if (!value) {
        throw new Error(`${name} is not defined in environment variables`)
    }
    return value
}

export const JWT_SECRET = requireEnv("JWT_SECRET")
export const MONGODB_URI = requireEnv("MONGODB_URI")
export const PORT = requireEnv("PORT")