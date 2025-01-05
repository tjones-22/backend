import mysql from "mysql2/promise";

const setupTables = async () => {
    try {
        console.log("Initializing database...");

        // Connect to MySQL without specifying a database
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT || 3306,
        });

        console.log("Connected to MySQL!");

        // Create the database if it doesn't exist
        await connection.execute("CREATE DATABASE IF NOT EXISTS closetdb");
        console.log("Database 'closetdb' created or already exists.");

        // Connect to the newly created database
        await connection.changeUser({ database: "closetdb" });

        // Create the 'clothes' table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS clothes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                type TEXT NOT NULL,
                color VARCHAR(255) NOT NULL,
                style VARCHAR(255) NOT NULL,
                occasion VARCHAR(255) NOT NULL,
                image LONGBLOB NOT NULL
            )
        `);
        console.log("Table 'clothes' set up successfully!");

        // Create the 'outfits' table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS outfits (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log("Table 'outfits' set up successfully!");

        // Create the 'outfit_items' table (junction table)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS outfit_items (
                outfit_id INT NOT NULL,
                clothes_id INT NOT NULL,
                PRIMARY KEY (outfit_id, clothes_id),
                FOREIGN KEY (outfit_id) REFERENCES outfits(id) ON DELETE CASCADE,
                FOREIGN KEY (clothes_id) REFERENCES clothes(id) ON DELETE CASCADE
            )
        `);
        console.log("Table 'outfit_items' set up successfully!");

        // Close the connection
        await connection.end();
    } catch (error) {
        console.error("Error setting up database or tables:", error.message);
        process.exit(1); // Exit the process on failure
    }
};

export default setupTables;