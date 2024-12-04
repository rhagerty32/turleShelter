const express = require("express");
const knex = require("../config/db"); // Database connection
const router = express.Router();

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  req.session.originalUrl = req.originalUrl;
  res.redirect("/login");
}

// TEMPORARY: Test the AWS database connection
router.get("/test-db", async (req, res) => {
  let response = { success: false, error: null, data: {} };

  try {
    // Test: Check which database we're connected to
    const result = await knex.raw("SELECT current_database();");
    console.log("Current Database:", result.rows[0].current_database);
    response.data.currentDatabase = result.rows[0].current_database; // Include in the response
  } catch (error) {
    console.error("Error fetching current database:", error);
    response.error = `Error fetching current database: ${error.message}`;
    return res.status(500).json(response); // Return error response
  }

  try {
    // Test: Check if SSL connection is enabled (optional)
    console.log("Checking SSL connection status...");
    const sslTest = await knex.raw("SHOW ssl;");
    console.log("SSL Status:", sslTest.rows[0]);
    response.data.sslStatus = sslTest.rows[0]; // Include in the response
  } catch (error) {
    console.error("Error fetching SSL status:", error);
    response.error = `Error fetching SSL status: ${error.message}`;
    return res.status(500).json(response); // Return error response
  }

  try {
    // Test: Query the test_table
    const testTable = await knex.raw("SELECT * FROM survey;");
    console.log("Test table data:", testTable.rows);
    response.data.testTable = testTable.rows; // Include test table data in the response
  } catch (error) {
    console.error("Error querying survey:", error);
    response.error = `Error querying survey: ${error.message}`;
    return res.status(500).json(response); // Return error response
  }

  // Send the successful response with all collected data
  response.success = true;
  res.status(200).json(response);
});

// Define routes for each page
router.get("/", (req, res) => {
  res.render("layout", {
    title: "Home",
    page: "home",
  });
});

router.post("/newVolunteer", (req, res) => {
  const { firstname, lastname, skillid, city, state, zip, phone, email } =
    req.body;

  knex("volunteer")
    .insert({ firstname, lastname, skillid, city, state, zip, phone, email })
    .then(() => {
      res.redirect("/users");
    })
    .catch((error) => {
      console.error("Error adding user:", error);
      res.status(500).send("Internal Server Error");
    });
});

router.get("/login", (req, res) => {
  res.render("pages/login", {
    originalUrl: req.session.originalUrl || "/",
  });
});

router.post("/login", async (req, res) => {
  const email = req.body.email.toLowerCase();
  const password = req.body.password.toLowerCase();
  const originalUrl = req.body.originalUrl || "/stats";
  try {
    // Query the user table to find the record
    const user = await knex("volunteer")
      .select()
      .where({ email, password }) // Replace with hashed password comparison in production
      .first(); // Returns the first matching record

    if (user) {
      req.session.authenticated = true;
      req.session.user = {
        email: user.email,
      };
      res.redirect(originalUrl);
    } else {
      req.session.authenticated = false;
      res.redirect("/login");
    }
  } catch (error) {
    res.status(500).send("Database query failed: " + error.message);
  }
});

router.get("/logout", async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect("/");
    }
    res.redirect("/");
  });
});

router.get("/account", checkAuthenticated, (req, res) => {
  res.render("layout", {
    title: "Account",
    page: "account",
    user: {
      username: req.session.user.username,
    },
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

router.get("/events", checkAuthenticated, (req, res) => {
  knex("events")
    .select()
    .orderBy("date", "desc")
    .then((events) => {
      res.render("layout", {
        title: "Events",
        page: "events",
        events: events,
      });
    })
    .catch((error) => {
      console.error("Error querying database:", error);
      res.status(500).send("Internal Server Error");
    });
});

router.get("/volunteers", checkAuthenticated, (req, res) => {
  knex("volunteer")
    .select()
    .orderBy("lastname", "asc")
    .then((volunteers) => {
      res.render("layout", {
        title: "Volunteers",
        page: "volunteers",
        volunteers: volunteers,
      });
    })
    .catch((error) => {
      console.error("Error querying database:", error);
      res.status(500).send("Internal Server Error");
    });
});

router.post("/editVolunteer", (req, res) => {
  const {
    firstname,
    lastname,
    email,
    phone,
    skillid,
    city,
    state,
    availability,
    discoverymethod,
    notes,
  } = req.body;

  knex("volunteer")
    .where({ email })
    .update({
      email,
      firstname,
      lastname,
      phone,
      skillid,
      city,
      state,
      availability,
      discoverymethod,
      notes,
    })
    .then(() => {
      res.redirect("/volunteers");
    })
    .catch((error) => {
      console.error("Error updating volunteer:", error);
      res.status(500).send("Internal Server Error");
    });
});

router.post("/makeAdmin", (req, res) => {
  const {
    firstname,
    lastname,
    email,
    password,
    phone,
    jobrole,
    skillid,
    city,
    state,
    availability,
    discoverymethod,
    notes,
  } = req.body;

  knex("login")
    .insert({ email, password, jobrole })
    .then(() => {
      return knex("volunteer").update({
        firstname,
        lastname,
        email,
        phone,
        skillid,
        city,
        state,
        availability,
        discoverymethod,
        notes,
      });
    })
    .then(() => {
      res.redirect("/volunteers");
    })
    .catch((error) => {
      console.error("Error making admin:", error);
      res.status(500).send("Internal Server Error");
    });
});

router.post("/deleteVolunteer", (req, res) => {
  const { email } = req.body;

  knex("volunteer")
    .where({ email })
    .del()
    .then(() => {
      res.redirect("/volunteers");
    })
    .catch((error) => {
      console.error("Error deleting volunteer:", error);
      res.status(500).send("Internal Server Error");
    });
});

router.get("/users", checkAuthenticated, (req, res) => {
  knex("login")
    .join("volunteer", "login.email", "volunteer.email")
    .join("skilllevel", "volunteer.skillid", "skilllevel.skillid")
    .select(
      "volunteer.*",
      "login.password",
      "login.jobrole",
      "skilllevel.description"
    )
    .then((users) => {
      res.render("layout", {
        title: "Users",
        page: "users",
        users: users,
      });
    })
    .catch((error) => {
      console.error("Error querying database:", error);
      res.status(500).send("Internal Server Error");
    });
});

router.post("/addUser", (req, res) => {
  const {
    firstname,
    lastname,
    email,
    password,
    phone,
    jobrole,
    skillid,
    city,
    state,
    availability,
    discoverymethod,
    notes,
  } = req.body;

  knex("login")
    .insert({ email, password, jobrole })
    .then(() => {
      return knex("volunteer").insert({
        firstname,
        lastname,
        email,
        phone,
        skillid,
        city,
        state,
        availability,
        discoverymethod,
        notes,
      });
    })
    .then(() => {
      res.redirect("/users");
    })
    .catch((error) => {
      console.error("Error adding user:", error);
      res.status(500).send("Internal Server Error");
    });
});

router.post("/editUser", (req, res) => {
  const {
    firstname,
    lastname,
    email,
    password,
    phone,
    jobrole,
    skillid,
    city,
    state,
    availability,
    discoverymethod,
    notes,
  } = req.body;

  knex("login")
    .where({ email })
    .update({ password, jobrole })
    .then(() => {
      return knex("volunteer").where({ email }).update({
        firstname,
        lastname,
        phone,
        skillid,
        city,
        state,
        availability,
        discoverymethod,
        notes,
      });
    })
    .then(() => {
      res.redirect("/users");
    })
    .catch((error) => {
      console.error("Error updating user:", error);
      res.status(500).send("Internal Server Error");
    });
});

router.get("/login", (req, res) => {
  res.render("pages/login", {
    originalUrl: req.session.originalUrl || "/",
  });
});

router.post("/deleteUser", (req, res) => {
  const { email } = req.body;

  knex("volunteer")
    .where({ email })
    .del()
    .then(() => {
      return knex("login").where({ email }).del();
    })
    .then(() => {
      res.redirect("/users");
    })
    .catch((error) => {
      console.error("Error deleting user:", error);
      res.status(500).send("Internal Server Error");
    });
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect("/account");
    }
    res.redirect("/login");
  });
});

module.exports = router;
