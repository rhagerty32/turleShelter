// configuration and connection to the DB
//TODO Change connection details to match new database
const knex = require("knex")({
    client: "pg",
    connection: {
        host: process.env.RDS_HOSTNAME || "localhost",
        user: process.env.RDS_USERNAME || "postgres",
        password: process.env.RDS_PASSWORD || "admin",
        database: process.env.RDS_DB_NAME || "turtleShelter",
        port: process.env.RDS_PORT || 5433,
        ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false
    }
});

module.exports = knex;