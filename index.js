let express = require("express");
let app = express();
let path = require("path");
let session = require('express-session');
// Import the pages get routes from pageRoutes.js (for navigation between pages)
let pagesRouter = require("./routes/pageRoutes");
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
// Serve static files (css, js, images) from the "public" folder
// For example you can link to a css file like this no matter what page you are on: <link rel="stylesheet" href="/styles.css">
app.use(express.static("public"));

app.use(session({
    secret: 'abc123',
    resave: false,
    saveUninitialized: true
}));

// Middleware to check if user is authenticated
app.use((req, res, next) => {
    req.isAuthenticated = () => req.session.authenticated;
    next();
});

//TODO Change connection details to match new database
const knex = require("knex")({
    client: "pg",
    connection: {
        host: process.env.RDS_HOSTNAME || "localhost",
        user: process.env.RDS_USERNAME || "postgres",
        password: process.env.RDS_PASSWORD || "admin",
        database: process.env.RDS_DB_NAME || "bakery",
        port: process.env.RDS_PORT || 5432,
        ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false
    }
})

app.get("/login", (req, res) => {
    res.render("pages/login", {
        originalUrl: req.session.originalUrl || '/'
    });
});
// the routes are imported as pagesRouter and defined in /routes/pageRoutes.js
// example: if we get a request to /home, the pagesRouter will handle it and render the home page
app.use("/", pagesRouter);

let authenticated = false;

app.post('/login', async (req, res) => {
    const username = req.body.username.toLowerCase();
    const password = req.body.password.toLowerCase();
    const originalUrl = req.body.originalUrl || '/';
    try {
        // Query the user table to find the record
        const user = await knex('users')
            .select('*')
            .where({ username, password }) // Replace with hashed password comparison in production
            .first(); // Returns the first matching record

        if (user) {
            req.session.authenticated = true;
            req.session.user = {
                username: user.username,
                email: user.email,
                fullName: user.full_name // Assuming the column name is full_name
            };
            res.redirect(originalUrl);
        } else {
            req.session.authenticated = false;
            res.redirect("/login");
        }
    } catch (error) {
        res.status(500).send('Database query failed: ' + error.message);
    }
});

app.listen(port, () => {
    console.log("Listening on port " + port);
    console.log(`Click here to open: http://localhost:${port}`);
});
