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
    // Query the user table to find the record
    knex("volunteer")
        .select()
        .where({ email, password })
        .first()
        .then((user) => {
            req.session.authenticated = true;
            req.session.user = {
                email: user.email,
            };
            res.redirect("/");
        })
        .catch((error) => {
            console.log(`\x1b[31m${error}\x1b[0m`);
            req.session.authenticated = false;
            res.redirect("/login");
        });
});

router.get("/logout", async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.redirect("/");
        }
        res.redirect("/");
    });
});

router.get("/stats", checkAuthenticated, (req, res) => {
    res.render("layout", {
        title: "Stats",
        page: "stats",
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

router.post("/addServiceEvent", (req, res) => {
    const {
        organization,
        status,
        date,
        starttime,
        plannedduration,
        address,
        city,
        state,
        zip,
        servicetypeid,
        jenstory,
        jenstorylength,
        sergers,
        sewingmachines,
        childrenunder10,
        adultparticipants,
        advancedsewers,
        basicsewers,
        venuesize,
        numrooms,
        numtablesround,
        numtablesrectangle,
        details,
    } = req.body;
    console.log(new Date(date))
    // Step 5: Insert or update the location table with zip, city, and state
    knex("location")
    .insert({ zip, city, state })
    .onConflict("zip") // If zip exists, update city/state
    .merge() // Merge updates for existing zip
    .then(() => {
      // Step 1: Insert data into the "events" table and get the generated eventid
      knex("events")
        .insert({
          starttime: starttime || '00:00:00',
          address: address || '',
          zip: zip || '00000',
          status: status || "",
          plannedduration: plannedduration || 0.0,
          details: details || '',
        })
        .returning("eventid") // Return the generated eventid
        .then(([ eventid ]) => {
            // Step 2: Use the eventid to insert related data into the "eventrequest" table
            knex("eventrequest")
                .insert({
                  eventid: eventid.eventid || 0, // Use the generated eventid
                  servicetypeid: servicetypeid || 1,
                  jenstorylength: jenstorylength || 0,
                  jenstory: jenstory || 0,
                  sergers: sergers || 0,
                  sewingmachines: sewingmachines || 0,
                  childrenunder10: childrenunder10 || 0,
                  advancedsewers: advancedsewers || 0,
                  basicsewers: basicsewers || 0,
                  adultparticipants: adultparticipants || 0,
                  organization: organization || '',
                  venuesize: venuesize || 0,
                  numrooms: numrooms || 0,
                  numtablesround: numtablesround || 0,
                  numtablesrectangle: numtablesrectangle || 0,
                  
                })
                .then(() => {
                    // Step 3: Check if the provided date already exists in the "dates" table
                    knex("dates")
                      .insert({ date: date || '2020-01-01' })
                      .returning("dateid")
                      .then(([newDateId]) => {
                          const dateId = newDateId.dateid; // Extract dateid here

                          knex("eventdates")
                              .insert({ eventid:eventid.eventid || 0, dateid: dateId || 0})
                              .onConflict(["eventid", "dateid"]) // Handle duplicate key
                              .ignore()
                              .then(() => {
                                  res.redirect("/events");
                              })
                              .catch((err) => {
                                  console.error("EventDates error:", err);
                                  res.status(500).send("Error updating eventdates");
                              });
                      })
                      .catch((err) => {
                          console.error("Dates error:", err);
                          res.status(500).send("Error inserting date");
                      });
                })
                .catch((err) => {
                    console.error("EventRequest error:", err);
                    res.status(500).send("Error updating eventRequest");
                });
        })
        .catch((err) => {
            console.error("Events error:", err);
            res.status(500).send("Error updating events");
        });
    }) // Redirect after successful insertions
    .catch((err) => {
        console.error("Location error:", err);
        res.status(500).send("Error updating location");
    });
});


router.post("/addDistributionEvent", (req, res) => {
  // Destructure incoming data from the form
  console.log("adding event")
  const {
      status,
      date,
      starttime,
      plannedduration,
      address,
      city,
      state,
      zip,
      details,
  } = req.body;
  console.log(new Date(date))
  // Step 1: Insert data into the "events" table and get the generated eventid
  knex("location")
      .insert({ zip, city, state })
      .onConflict("zip") // If zip exists, update city/state
      .merge() // Merge updates for existing zip
      .then(() => {
        knex("events")
          .insert({
            starttime: starttime || "00:00:00",
            address: address || '',
            zip: zip || '',
            status: status || '',
            plannedduration: plannedduration || 0,
            details: details || '',
          })
          .returning("eventid") // Return the generated eventid
          .then(([ eventid ]) => {
                      // Step 3: Check if the provided date already exists in the "dates" table
                      knex("dates")
                        .insert({ date:date || "2020-01-01" })
                        .returning("dateid")
                        .then(([newDateId]) => {
                            const dateId = newDateId.dateid; // Extract dateid here
                            const eventId = eventid.eventid
                            knex("eventdates")
                                .insert({ eventid:eventId || 0, dateid: dateId || 0})
                                .onConflict(["eventid", "dateid"]) // Handle duplicate key
                                .ignore()
                                .then(() => {
                                    res.redirect("/events");
                                })
                                .catch((err) => {
                                    console.error("EventDates error:", err);
                                    res.status(500).send("Error updating eventdates");
                                });
                        })
                        .catch((err) => {
                            console.error("Dates error:", err);
                            res.status(500).send("Error inserting date");
                        });
                  })
                  .catch((err) => {
                      console.error("EventRequest error:", err);
                      res.status(500).send("Error updating eventRequest");
                  });
          });
        });

router.post("/editEvent", (req, res) => {
    // Destructure incoming data from the form
    console.log("editing event")
    console.log(req.body); // Log the whole body to verify eventid is included
    const {
        organization,
        status,
        date,
        starttime,
        plannedduration,
        address,
        city,
        state,
        zip,
        servicetypeid,
        jenstory,
        jenstorylength,
        sergers,
        sewingmachines,
        childrenunder10,
        adultparticipants,
        advancedsewers,
        basicsewers,
        venuesize,
        numrooms,
        numtablesround,
        numtablesrectangle,
        details,
        eventid
    } = req.body;
    console.log(new Date(date))
    
    // Step 5: Insert or update the location table with zip, city, and state
    knex("location")
      .insert({ zip:zip || '', city:city || '', state:state || ''})
      .onConflict("zip") // If zip exists, update city/state
      .merge() // Merge updates for existing zip
      .then(() => {
        // Step 1: Update the "events" table with the provided eventid
        knex("events")
          .where({ eventid })
          .update({
            starttime: starttime || '00:00:00',
            address: address || '',
            zip: zip || '',
            status: status || '',
            plannedduration: plannedduration || 0,
            details: details || '',
          })
          .then(() => {
              // Step 2: Update data in the "eventrequest" table
              knex("eventrequest")
                .where({ eventid })
                .update({
                  servicetypeid: servicetypeid || 0,
                  jenstorylength: jenstorylength || 0,
                  jenstory: jenstory || 0,
                  sergers: sergers || 0,
                  sewingmachines: sewingmachines || 0,
                  childrenunder10: childrenunder10 || 0,
                  advancedsewers: advancedsewers || 0,
                  basicsewers: basicsewers || 0,
                  adultparticipants: adultparticipants || 0,
                  organization: organization || '',
                  venuesize: venuesize || 0,
                  numrooms: numrooms || 0,
                  numtablesround: numtablesround || 0,
                  numtablesrectangle: numtablesrectangle || 0,                    
                })
                .then(() => {
                    // Step 3: Check if the provided date already exists in the "dates" table
                    knex("dates")
                      .insert({ date:date || '2020-01-01' })
                      .onConflict("date") // Handle conflicts based on the "date" field
                      .merge() // If the date already exists, merge the update
                      .returning("dateid")
                      .then(([newDateId]) => {
                          const dateId = newDateId.dateid; // Extract dateid here

                          // Update the eventdates table with the new dateid
                          knex("eventdates")
                              .where({ eventid })  // Ensure we are updating the correct eventid
                              .update({ dateid: dateId || 0})
                              .then(() => {
                                  res.redirect(`/events/${eventid}`); // Correct URL with eventid
                              })
                              .catch((err) => {
                                  console.error("EventDates error:", err);
                                  res.status(500).send("Error updating eventdates");
                              });
                      })
                      .catch((err) => {
                          console.error("Dates error:", err);
                          res.status(500).send("Error updating date");
                      });
                  })
                  .catch((err) => {
                      console.error("EventRequest error:", err);
                      res.status(500).send("Error updating eventRequest");
                  });
          })
          .catch((err) => {
              console.error("Events error:", err);
              res.status(500).send("Error updating events");
          });
      })
      .catch((err) => {
          console.error("Location error:", err);
          res.status(500).send("Error updating location");
      });
});
      


  router.get("/events", checkAuthenticated, (req, res) => {
    console.log("getting events")
    knex("events as e")
        .leftJoin("eventdates as ed", "e.eventid", "ed.eventid")
        .leftJoin("dates as d", "ed.dateid", "d.dateid")
        .leftJoin("location as l", "e.zip", "l.zip")
        .leftJoin("eventrequest as er", "e.eventid", "er.eventid")
        .select(
            "d.date",
            "er.organization",
            "e.status",
            "e.address",
            "l.city",
            "l.state",
            "e.eventid"
        )
        .then((events) => {
            knex("servicetypes")
                .select()
                .then((servicetypes) => {
                  console.log(JSON.stringify(events, null, 2))
                    res.render("layout", {
                        title: "Events",
                        page: "events",
                        events: events,
                        servicetypes: servicetypes,
                    });
                });
        })
        .catch((error) => {
            console.error("Error updating volunteer:", error);
            res.status(500).send("Internal Server Error");
        });
})

router.get('/events/:eventid', (req, res) => {
    const eventid = req.params.eventid;

    knex('events as e')
        .join('eventdates as ed', 'e.eventid', 'ed.eventid')
        .join('dates as d', 'ed.dateid', 'd.dateid')
        .join('location as l', 'e.zip', 'l.zip')
        .join('eventrequest as er', 'e.eventid', 'er.eventid')
        .join('servicetypes as st', 'er.servicetypeid', 'st.servicetypeid')
        .select(
            'e.eventid',
            'e.starttime',
            'e.address',
            'e.zip',
            'e.status',
            'e.plannedduration',
            'e.details',
            'd.date',
            'l.city',
            'l.state',
            'er.servicetypeid',
            'er.jenstorylength',
            'er.jenstory',
            'er.sergers',
            'er.sewingmachines',
            'er.childrenunder10',
            'er.advancedsewers',
            'er.basicsewers',
            'er.adultparticipants',
            'er.organization',
            'er.venuesize',
            'er.numrooms',
            'er.numtablesround',
            'er.numtablesrectangle',
            'st.description'
        )
        .where('e.eventid', eventid)
        .first()
        .then((event) => {
            knex('servicetypes')
                .select()
                .then((servicetypes) => {
                  knex('items')
                    .select()
                    .then((items) => {
                        res.render('layout', {
                            title: 'Single Event',
                            page: 'singleEvent',
                            event: event,
                            servicetypes: servicetypes,
                            items:items,
                        });
                  })
                })
        })
        .catch((error) => {
            console.error('Error querying database:', error);
            res.status(500).send('Internal Server Error');
        });
});

router.get("/volunteers", checkAuthenticated, (req, res) => {
    knex("volunteer")
        .select()
        .orderBy("lastname", "asc")
        .then((volunteers) => {
            knex("skilllevel")
                .select()
                .orderBy("skillid", "asc")
                .then((skilllevel) => {
                    res.render("layout", {
                        title: "Volunteers",
                        page: "volunteers",
                        volunteers: volunteers,
                        skilllevel: skilllevel,
                    });
                })
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
          email: email || '',
          firstname: firstname || '',
          lastname: lastname || '',
          phone: phone || '',
          skillid: skillid || 0,
          city: city || '',
          state: state || '',
          availability: availability || '',
          discoverymethod: discoverymethod || '',
          notes: notes || '',
          
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
              firstname: firstname || '',
              lastname: lastname || '',
              email: email || '',
              phone: phone || '',
              skillid: skillid || 0,
              city: city || '',
              state: state || '',
              availability: availability || '',
              discoverymethod: discoverymethod || '',
              notes: notes || '',
              
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
              firstname: firstname || '',
              lastname: lastname || '',
              email: email || '',
              phone: phone || '',
              skillid: skillid || 0,
              city: city || '',
              state: state || '',
              availability: availability || '',
              discoverymethod: discoverymethod || '',
              notes: notes || '',
              
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
              firstname: firstname || '',
              lastname: lastname || '',
              phone: phone || '',
              skillid: skillid || 0,
              city: city || '',
              state: state || '',
              availability: availability || '',
              discoverymethod: discoverymethod || '',
              notes: notes || '',
              
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
