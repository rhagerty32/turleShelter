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
    res.render("layout", {
        title: "Home",
        page: "home",
    });
});

router.get("/account", checkAuthenticated, (req, res) => {
    res.render("layout", {
        title: "Account",
        page: "account",
        user: {
            username: req.session.user.username,
        }
    });
});

router.get("/contact", (req, res) => {
    res.render("layout", {
        title: "Contact",
        page: "contact",
    });
});

router.get("/volunteerRequest", (req, res) => {
    res.render("layout", {
        title: "Volunteer Request",
        page: "volunteerRequest",
    });
});

router.get("/hostAnEvent", (req, res) => {
    res.render("layout", {
        title: "Host an Event",
        page: "hostAnEvent",
    });
});

router.get("/events", (req, res) => {
    res.render("layout", {
        title: "Events",
        page: "events",
        events: req.events,
    });
});

router.get("/volunteers", (req, res) => {
    res.render("layout", {
        title: "Volunteers",
        page: "volunteers",
        volunteers: req.volunteers,
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
