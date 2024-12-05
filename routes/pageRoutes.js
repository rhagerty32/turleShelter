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

// Define routes for each page
router.get("/", (req, res) => {
    knex("eventoutcome")
        .count("eventid as eventCount")
        .sum("headcount as totalHeadcount")
        .sum("servicehours as totalServiceHours")
        .then((stats) => {
            res.render("layout", {
                title: "Home",
                page: "home",
                stats: stats[0],
            });
        })
        .catch((error) => {
            console.error("Error querying eventoutcome:", error);
            res.status(500).send("Internal Server Error");
        });
});

router.post("/newVolunteer", (req, res) => {
    console.log("Posting volunteer")
    const { firstname,
        lastname,
        skillid,
        city,
        state,
        zip,
        phonenumber,
        email,
        password,
        teacher,
        leader,
        availability,
        range,
        discoverymethod,
        notes, } =
        req.body;
    knex("location")
        .insert({ zip, city, state })
        .onConflict("zip") // If zip exists, update city/state
        .merge() // Merge updates for existing zip
        .then(() => {
            knex("volunteer")
                .insert({
                    firstname: firstname || '',
                    lastname: lastname || '',
                    skillid: skillid || 0,
                    zip: zip || '',
                    phonenumber: phonenumber || '',
                    email: email || '',
                    password: password || '',
                    teacher: teacher || '',
                    leader: leader || '',
                    availability: availability || '',
                    range: range || '',
                    discoverymethod: discoverymethod || '',
                    notes: notes || '',
                    jobrole: 'Volunteer'
                })
                .then(() => {
                    knex("skilllevel")
                        .select()
                        .then((skilllevel) => {
                            console.log("Volunteer added")
                            console.log(skilllevel)
                            console.log({ submitted: true })
                            res.render("layout", {
                                title: "Volunteer Request",
                                page: "volunteerRequest",
                                skilllevel: skilllevel,
                                submitted: true,
                            });
                        })
                })
                .catch((error) => {
                    console.error("Error adding volunteer:", error);
                    res.status(500).send("Internal Server Error");
                });
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
    knex("eventoutcome")
        .count("eventid as eventCount")
        .sum("headcount as totalHeadcount")
        .sum("servicehours as totalServiceHours")
        .then((stats) => {
            res.render("layout", {
                title: "Stats",
                page: "stats",
                stats: stats[0],
            });
        })
        .catch((error) => {
            console.error("Error querying eventoutcome:", error);
            res.status(500).send("Internal Server Error");
        });
});

router.get("/contact", (req, res) => {
    res.render("layout", {
        title: "Contact",
        page: "contact",
    });
});

router.get("/volunteerRequest", (req, res) => {
    knex("skilllevel")
        .select()
        .then((skilllevel) => {
            res.render("layout", {

                title: "Volunteer Request",
                page: "volunteerRequest",
                skilllevel: skilllevel,
                submitted: false,
            });
        })
});

router.get("/hostAnEvent", (req, res) => {
    knex("servicetypes")
        .select()
        .then((servicetypes) => {
            res.render("layout", {

                title: "Host an Event",
                page: "hostAnEvent",
                servicetypes: servicetypes
            });
        })
})

router.post("/addServiceEvent", (req, res) => {
    console.log("Adding Service Event");
    console.log(JSON.stringify(req.body, null, 2));
    const {
        organization,
        status,
        date = [],
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
        firstname = [],
        lastname = [],
        email = [],
        phonenumber = []
    } = req.body;

    // Step 5: Insert or update the location table with zip, city, and state
    knex("location")
        .insert({ zip, city, state })
        .onConflict("zip") // If zip exists, update city/state
        .merge() // Merge updates for existing zip
        .then(() => {
            // Step 1: Insert data into the "events" table and get the generated eventid
            return knex("events")
                .insert({
                    starttime: starttime || '00:00:00',
                    address: address || '',
                    zip: zip || '00000',
                    status: status || 'Pending',
                    plannedduration: plannedduration || 0.0,
                    details: details || '',
                })
                .returning("eventid"); // Return the generated eventid
        })
        .then(([eventid]) => {
            console.log("Step 2 event id: " + eventid.eventid)
            // Step 2: Use the eventid to insert related data into the "eventrequest" table
            return knex("eventrequest")
                .insert({
                    eventid: eventid.eventid || 0,
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
                .then(() => eventid); // Return eventid for next step
        })
        .then((eventid) => {
            //query in the users one by one
            console.log("query users event id: " + eventid.eventid)
            for (let i = 0; i < firstname.length; i++) {
                const currentfirstname = firstname[i] || '';
                const currentlastname = lastname[i] || '';
                const currentemail = email[i] || '';
                const currentphonenumber = phonenumber[i] || '';
                knex("requester")
                    .insert({
                        eventid: eventid.eventid || 0,
                        firstname: currentfirstname,
                        lastname: currentlastname,
                        phone: currentphonenumber,
                        email: currentemail
                    })
                    .returning("eventid")
                    .catch((err) => {
                        console.error("Error:", err);
                        res.status(500).send("Error adding requester info");
                    });
            }
            return eventid
        })
        .then((eventid) => {
            // Step 3: Check if the provided date already exists in the "dates" table
            console.log("Step 3 event id: " + eventid.eventid)
            for (let i = 0; i < date.length; i++) {
                const currentDate = new Date(date[i]) || '2020-01-01';
                knex("dates")
                    .select("dateid")
                    .where({ date: currentDate })
                    .first() // Only get the first matching record
                    .then(existingDate => {
                        if (existingDate) {
                            // Date already exists, use the existing dateid
                            const dateId = existingDate.dateid;
                            return knex("eventdates")
                                .insert({ eventid: eventid.eventid || 0, dateid: dateId })
                                .onConflict(["eventid", "dateid"]) // Handle duplicate key
                                .ignore();
                        } else {
                            // Date does not exist, insert it
                            return knex("dates")
                                .insert({ date: currentDate })
                                .returning("dateid")
                                .then(([newDateId]) => {
                                    const dateId = newDateId.dateid;
                                    return knex("eventdates")
                                        .insert({ eventid: eventid.eventid || 0, dateid: dateId })
                                        .onConflict(["eventid", "dateid"])
                                        .ignore();
                                });
                        }
                    })
                    .then(() => {
                        if (i === date.length - 1) {
                            res.redirect("/events"); // Redirect after the last insert
                        }
                    })
                    .catch(err => {
                        console.error("Error inserting date:", err);
                        res.status(500).send("Error processing dates and eventdates");
                    });
            }
        })

        .catch((err) => {
            console.error("Error:", err);
            res.status(500).send("Error processing service event");
        });
});

router.post("/addDistributionEvent", (req, res) => {
    // Destructure incoming data from the form
    console.log("adding distribution event")
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
                .then((eventid) => {
                  // Step 3: Check if the provided date already exists in the "dates" table
                  console.log("Step 3 event id: " + eventid.eventid)
                  for (let i = 0; i < date.length; i++) {
                      const currentDate = new Date(date[i]) || '2020-01-01';
                      knex("dates")
                          .select("dateid")
                          .where({ date: currentDate })
                          .first() // Only get the first matching record
                          .then(existingDate => {
                              if (existingDate) {
                                  // Date already exists, use the existing dateid
                                  const dateId = existingDate.dateid;
                                  return knex("eventdates")
                                      .insert({ eventid: eventid.eventid || 0, dateid: dateId })
                                      .onConflict(["eventid", "dateid"]) // Handle duplicate key
                                      .ignore();
                              } else {
                                  // Date does not exist, insert it
                                  return knex("dates")
                                      .insert({ date: currentDate })
                                      .returning("dateid")
                                      .then(([newDateId]) => {
                                          const dateId = newDateId.dateid;
                                          return knex("eventdates")
                                              .insert({ eventid: eventid.eventid || 0, dateid: dateId })
                                              .onConflict(["eventid", "dateid"])
                                              .ignore();
                                      });
                              }
                          })
                          .then(() => {
                              if (i === date.length - 1) {
                                  res.redirect("/events"); // Redirect after the last insert
                              }
                          })
                          .catch(err => {
                              console.error("Error inserting date:", err);
                              res.status(500).send("Error processing dates and eventdates");
                          });
                  }
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
        .insert({ zip: zip || '', city: city || '', state: state || '' })
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
                                .insert({ date: date || '2020-01-01' })
                                .onConflict("date") // Handle conflicts based on the "date" field
                                .merge() // If the date already exists, merge the update
                                .returning("dateid")
                                .then(([newDateId]) => {
                                    const dateId = newDateId.dateid; // Extract dateid here

                                    // Update the eventdates table with the new dateid
                                    knex("eventdates")
                                        .where({ eventid })  // Ensure we are updating the correct eventid
                                        .update({ dateid: dateId || 0 })
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
        .orderByRaw(`CASE 
            WHEN e.status = 'Pending' THEN 1 
            WHEN e.status = 'Scheduled' THEN 2 
            WHEN e.status = 'Completed' THEN 3 
            ELSE 4 
        END`)
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
        .leftJoin('eventdates as ed', 'e.eventid', 'ed.eventid')
        .leftJoin('dates as d', 'ed.dateid', 'd.dateid')
        .leftJoin('location as l', 'e.zip', 'l.zip')
        .leftJoin('eventrequest as er', 'e.eventid', 'er.eventid')
        .leftJoin('servicetypes as st', 'er.servicetypeid', 'st.servicetypeid')
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
                            knex('dates as d')
                                .join('eventdates as ed', 'd.dateid', 'ed.dateid')
                                .select('d.date')
                                .where('ed.eventid', eventid)
                                .then((dates) => {
                                    knex('requester')
                                        .select('firstname', 'lastname', 'email', 'phone')
                                        .where({ eventid })
                                        .then((requesters) => {
                                            res.render('layout', {
                                                title: 'Single Event',
                                                page: 'singleEvent',
                                                event: event,
                                                servicetypes: servicetypes,
                                                items: items,
                                                dates: dates,
                                                requesters: requesters,
                                            });
                                        })
                                        .catch((error) => {
                                            console.error('Error querying requesters:', error);
                                            res.status(500).send('Internal Server Error');
                                        });
                                })
                        })
                })
        })
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
        phonenumber,
        skillid,
        city,
        state,
        availability,
        discoverymethod,
        notes,
        password,
        jobrole,
    } = req.body;
    knex("location")
        .insert({ zip, city, state })
        .onConflict("zip") // If zip exists, update city/state
        .merge() // Merge updates for existing zip
        .then(() => {
            knex("volunteer")
                .where({ email })
                .update({
                    email: email || '',
                    firstname: firstname || '',
                    lastname: lastname || '',
                    phonenumber: phonenumber || '',
                    skillid: skillid || 0,
                    city: city || '',
                    state: state || '',
                    availability: availability || '',
                    discoverymethod: discoverymethod || '',
                    notes: notes || '',
                    password: password || '',
                    jobrole: jobrole || 'Volunteer',

                })
                .then(() => {
                    res.redirect("/volunteers");
                })
                .catch((error) => {
                    console.error("Error updating volunteer:", error);
                    res.status(500).send("Internal Server Error");
                });
        })
        .catch((error) => {
            console.error("Error updating volunteer:", error);
            res.status(500).send("Internal Server Error");
        });
});
router.post("/deleteEvent", (req, res) => {
    const { eventid } = req.body;

    knex("events")
        .where({ eventid })
        .del()
        .then(() => {
            res.redirect("/events");
        })
        .catch((error) => {
            console.error("Error deleting event:", error);
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

router.get("/login", (req, res) => {
    res.render("pages/login", {
        originalUrl: req.session.originalUrl || "/",
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


//discoveryMethod route
router.get('/discoveryMethod', (req, res) => {
  try {
    // Render the discoverymethod.ejs page
    res.render('pages/discoveryMethod'); // Ensure this matches your EJS file's name
  } catch (err) {
    console.error('Error loading the discovery method page:', err.message);
    res.status(500).send('An error occurred while loading the page.');
  }
});


router.post('/submitDiscoveryMethod', (req, res) => {
  console.log('Request body:', req.body); // Log the request body
  const discoverymethod = req.body.discoverymethod; // Ensure the correct value is coming in
  
  console.log('Discovery Method:', discoverymethod); // Log the discovery method
  // SQL query targeting the "survey" table
  knex('survey')
  .where({ discoverymethod }) // Match the correct discoverymethod
  .increment('total', 1) // Increment the total column by 1
  .then((result) => {
  console.log('Rows affected:', result); // Log the number of rows affected
    if (result === 0) {
      // If no rows are updated, it means the discoverymethod doesn't exist
      return res.status(404).send('Discovery method not found.');
    }

      // Success response
      
    })
    .catch((err) => {
      console.error('Error updating the total column:', err.message);
      res.status(500).send('Something went wrong!');
    });
});

module.exports = router;