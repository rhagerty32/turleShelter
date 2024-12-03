// configuration and connection to the DB
//TODO Change connection details to match new database
const knex = require("knex")({
  client: "pg",
  connection: {
    // access the environment propreties as set up in Elastic Beanstalk
    host: process.env.RDS_HOSTNAME || "localhost",
    user: process.env.RDS_USERNAME || "postgres",
    password: process.env.RDS_PASSWORD || "admin",
    database: process.env.RDS_DB_NAME || "turtleShelter",
    port: process.env.RDS_PORT || 5432,
    // enable SSL to connect to the AWS database
    ssl:
      process.env.DB_SSL === "true"
        ? {
            ca: fs.readFileSync(
              path.join(__dirname, "certs", "us-east-1-bundle.pem")
            ),
            rejectUnauthorized: true,
          }
        : false,
  },
});

module.exports = knex;
