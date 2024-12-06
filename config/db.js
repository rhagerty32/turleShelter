const fs = require("fs");
const path = require("path");

// Helper function to load SSL configuration
const getSSLConfig = () => {
    if (process.env.DB_SSL === "true") {
        try {
            return {
                ca: fs.readFileSync(process.env.SSL_CERT_PATH || 
                    path.join(__dirname, "certs", "us-east-1-bundle.pem")),
                rejectUnauthorized: true, // Enforce certificate validation
            };
        } catch (err) {
            console.error("Error loading SSL certificate:", err.message);
            process.exit(1); // Exit process if SSL config fails
        }
    }
    return false; // No SSL if DB_SSL is not enabled
};

const knex = require("knex")({
    client: "pg",
    connection: {
        host: process.env.RDS_HOSTNAME || "localhost",
        user: process.env.RDS_USERNAME || "postgres",
        password: process.env.RDS_PASSWORD || "admin",
        database: process.env.RDS_DB_NAME || "turtleShelter",
        port: process.env.RDS_PORT || 5432,
        ssl: getSSLConfig(),
    },
});

module.exports = knex;
