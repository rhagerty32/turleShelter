const express = require("express");
const router = express.Router();

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }
    req.session.originalUrl = req.originalUrl;
    res.redirect("/login");
}

// Define routes for each page
router.get("/", (req, res) => {
    // Render the layout with home page content in the body
    res.render("layout", {
        title: "Home",
        page: "home", // Dynamically include the home page
    });
});

router.get("/account", checkAuthenticated, (req, res) => {
    res.render("layout", {
        title: "Account",
        page: "account", // Dynamically include the account page
        user: {
            username: req.session.user.username,
        }
    });
});

router.get("/contact", (req, res) => {
    // Render the layout with contact page content in the body
    res.render("layout", {
        title: "Contact",
        page: "contact", // Dynamically include the contact page
    });
});

router.get("/volunteerRequest", (req, res) => {
    // Render the layout with shop page content in the body
    res.render("layout", {
        title: "Volunteer Request",
        page: "volunteerRequest", // Dynamically include the shop page
    });
});

router.get("/hostAnEvent", (req, res) => {
    // Render the layout with shop page content in the body
    res.render("layout", {
        title: "Host an Event",
        page: "hostAnEvent", // Dynamically include the shop page
    });
});

router.get("/login", (req, res) => {
    res.render("pages/login", {
        originalUrl: req.session.originalUrl || '/'
    });
});

router.post("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect("/account");
        }
        res.redirect("/login");
    });
});

module.exports = router;
