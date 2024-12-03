// Import required modules
let express = require("express");
let path = require("path");
let session = require("express-session");

// Initialize the Express application
let app = express();

// Set the port (use environment variable or default to 3000)
const port = process.env.PORT || 3000;

// Import configuration and routes
const knex = require("./config/db"); // Database connection
let pagesRouter = require("./routes/pageRoutes"); // Pages router for navigation

// Set the view engine and views directory
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware to parse URL-encoded bodies (for form submissions)
app.use(express.urlencoded({ extended: true }));

// Serve static files (CSS, JavaScript, images) from the "public" folder
// Example usage in views: <link rel="stylesheet" href="/styles.css">
app.use(express.static("public"));

// Configure session management
app.use(
    session({
        secret: "abc123", // Secret used to sign the session ID cookie
        resave: false, // Do not save session if unchanged
        saveUninitialized: true, // Save uninitialized sessions
    })
);

// Middleware to check if the user is authenticated
app.use((req, res, next) => {
    req.isAuthenticated = () => req.session.authenticated; // Define isAuthenticated method 
    res.locals.authenticated = req.isAuthenticated(); // Pass authenticated status to views
    next();
});

// the routes are imported as pagesRouter and defined in /routes/pageRoutes.js
// example: if we get a request to /home, the pagesRouter will handle it and render the home page
app.use("/", pagesRouter);

let authenticated = false;

app.listen(port, () => {
    console.log("Listening on port " + port);
    console.log(`Click here to open: http://localhost:${port}`);
});
