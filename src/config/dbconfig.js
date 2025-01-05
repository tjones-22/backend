import mysql from "mysql2/promise";
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
    try {
        const connection = await mysql.createPool({
            host: '127.0.0.1',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            port: process.env.DB_PORT,
            connectionLimit: 10,
            queueLimit: 0,
        });

        console.log("Connected to MySQL database!");
        return connection;
    } catch (err) {
        console.error("Error connecting to MySQL:", err.message);
        process.exit(1);
    }
};

export default connectDB;