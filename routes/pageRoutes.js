const express = require("express");
const bodyParser = require("body-parser");
const knex = require("../config/db"); // Database connection
const router = express.Router();
const nodemailer = require('nodemailer');
require('dotenv').config()

// Middleware to parse JSON and URL-encoded data
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

// Middleware to check if the user is authenticated
function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }
    req.session.originalUrl = req.originalUrl;
    res.redirect("/login");
}

// Define routes for each page
router.get("/", (req, res) => {
    // Query event outcome statistics
    knex("eventoutcome")
        .count("eventid as eventCount")
        .sum("headcount as totalHeadcount")
        .sum("servicehours as totalServiceHours")
        .then((stats) => {
            // Query total quantity of items with itemid > 13
            knex("eventitems")
                .sum("quantity as total")
                .where("itemid", ">", 13)
                .then((quantity) => {
                    // Query event status counts
                    knex("events")
                        .select("status")
                        .count("eventid as count")
                        .groupBy("status")
                        .then((statusCounts) => {
                            // Render the home page with the queried data
                            res.render("layout", {
                                title: "Home",
                                page: "home",
                                stats: stats[0],
                                quantity: quantity[0].total,
                                statusCounts: statusCounts,
                            });
                        })
                })

        })
        .catch((error) => {
            console.error("Error querying eventoutcome:", error);
            res.status(500).send("Internal Server Error");
        });
});

// Route to add a new volunteer
router.post("/newVolunteer", (req, res) => {
    const {
        firstname,
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
        notes,
    } = req.body;

    // Check if the email already exists
    knex("volunteer")
        .where({ email })
        .first() // Get the first matching record
        .then((existingVolunteer) => {
            if (existingVolunteer) {
                // If email already exists, return an error message
                res.status(400).send("Email already used. Please use a different email.");
            } else {
                // Insert location data (with conflict handling)
                knex("location")
                    .insert({ zip, city, state })
                    .onConflict("zip") // If zip exists, update city/state
                    .merge() // Merge updates for existing zip
                    .then(() => {
                        // Insert volunteer data
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
                                jobrole: 'Volunteer',
                            })
                            .then(() => {
                                // Retrieve and render skill levels
                                knex("skilllevel")
                                    .select()
                                    .then((skilllevel) => {
                                        res.render("layout", {
                                            title: "Volunteer Request",
                                            page: "volunteerRequest",
                                            skilllevel: skilllevel,
                                            submitted: true,
                                        });
                                    });
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
            }
        })
        .catch((error) => {
            console.error("Error checking for existing email:", error);
            return res.json({ success: false, message: "Email already used. Please use a different email." });
        });
});

// Route to render the login page
router.get("/login", (req, res) => {
    res.render("pages/login", {
        originalUrl: req.session.originalUrl || "/",
    });
});

// Route to handle login form submission
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
                jobrole: user.jobrole
            };
            res.redirect("/");
        })
        .catch((error) => {
            console.log(`\x1b[31m${error}\x1b[0m`);
            req.session.authenticated = false;
            res.redirect("/login");
        });
});

// Route to handle logout
router.get("/logout", async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.redirect("/");
        }
        res.redirect("/");
    });
});

// Route to render statistics page
router.get("/stats", checkAuthenticated, (req, res) => {
    // Query event outcome statistics
    knex("eventoutcome")
        .count("eventid as eventCount")
        .sum("headcount as totalHeadcount")
        .sum("servicehours as totalServiceHours")
        .then((stats) => {
            // Query total quantity of items with itemid > 13
            knex("eventitems")
                .sum("quantity as total")
                .where("itemid", ">", 13)
                .then((quantity) => {
                    // Query event status counts
                    knex("events")
                        .select("status")
                        .count("eventid as count")
                        .groupBy("status")
                        .then((statusCounts) => {
                            // Query survey data
                            knex("survey")
                                .select()
                                .then((survey) => {
                                    // Render the stats page with the queried data
                                    res.render("layout", {
                                        title: "Stats",
                                        page: "stats",
                                        stats: stats[0],
                                        itemCount: quantity[0].total,
                                        statusCounts: statusCounts,
                                        survey: survey
                                    });
                                })
                        })
                })
        })
        .catch((error) => {
            console.error("Error querying events:", error);
            res.status(500).send("Internal Server Error");
        });
});

// Route to render contact page
router.get("/contact", (req, res) => {
    res.render("layout", {
        title: "Contact",
        page: "contact",
    });
});

// Route to render volunteer request page
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

// Route to render host an event page
router.get("/hostAnEvent", (req, res) => {
    knex("servicetypes")
        .select()
        .then((servicetypes) => {
            knex("dates")
                .select()
                .then((dates) => {
                    res.render("layout", {
                        title: "Host an Event",
                        page: "hostAnEvent",
                        servicetypes: servicetypes,
                        dates: dates
                    });
                })
        })
})

// Route to add a new service event
router.post("/addServiceEvent", (req, res) => {
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
    // Create a transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: process.env.EMAIL,
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            refreshToken: process.env.REFRESH_TOKEN,
            accessToken: process.env.ACCESS_TOKEN
        }
    });

    // Define the email options
    const mailOptions = {
        from: 'rdhagerty@gmail.com',
        to: 'ryan@spotparking.app',
        subject: 'Service Event Details',
        html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h2 style="color: #4CAF50;">Service Event Requested</h2>
                <p><strong>Organization:</strong> ${organization}</p>
                <p><strong>Status:</strong> ${status}</p>
                <p><strong>Date:</strong> ${Array.isArray(date) ? date.join(', ') : date}</p>
                <p><strong>Start Time:</strong> ${starttime}</p>
                <p><strong>Planned Duration:</strong> ${plannedduration}</p>
                <p><strong>Address:</strong> ${address}, ${city}, ${state}, ${zip}</p>
                <p><strong>Service Type ID:</strong> ${servicetypeid}</p>
                <p><strong>Jen Story:</strong> ${jenstory}</p>
                <p><strong>Jen Story Length:</strong> ${jenstorylength}</p>
                <p><strong>Sergers:</strong> ${sergers}</p>
                <p><strong>Sewing Machines:</strong> ${sewingmachines}</p>
                <p><strong>Children Under 10:</strong> ${childrenunder10}</p>
                <p><strong>Adult Participants:</strong> ${adultparticipants}</p>
                <p><strong>Advanced Sewers:</strong> ${advancedsewers}</p>
                <p><strong>Basic Sewers:</strong> ${basicsewers}</p>
                <p><strong>Venue Size:</strong> ${venuesize}</p>
                <p><strong>Number of Rooms:</strong> ${numrooms}</p>
                <p><strong>Number of Round Tables:</strong> ${numtablesround}</p>
                <p><strong>Number of Rectangle Tables:</strong> ${numtablesrectangle}</p>
                <p><strong>Details:</strong> ${details}</p>
                <h3 style="color: #4CAF50;">Requesters</h3>
                <p>${Array.isArray(firstname) ? firstname.map((fn, i) => `${fn} ${lastname[i]} (${email[i]}, ${phonenumber[i]})`).join('<br>') : `${firstname} ${lastname} (${email}, ${phonenumber})`}</p>
            </div>
        `
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
            res.status(500).send('Error sending email');
        } else {
            console.log('Email sent');
        }
    });
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
            if (typeof firstname === 'string') {
                const currentfirstname = firstname || '';
                const currentlastname = lastname || '';
                const currentemail = email || '';
                const currentphonenumber = phonenumber || '';
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
            else {


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
            }
            return eventid
        })
        .then((eventid) => {
            // Step 3: Check if the provided date already exists in the "dates" table
            if (typeof date === 'string') {
                const currentDate = new Date(date) || '2020-01-01';
                currentDate.setDate(currentDate.getDate() + 1)
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
                        res.redirect("/events"); // Redirect after the last insert
                    })
                    .catch(err => {
                        console.error("Error inserting date:", err);
                        res.status(500).send("Error processing dates and eventdates");
                    });
            }
            else {
                for (let i = 0; i < date.length; i++) {
                    const currentDate = new Date(date[i]) || '2020-01-01';
                    currentDate.setDate(currentDate.getDate() + 1)
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
            }
        })

        .catch((err) => {
            console.error("Error:", err);
            res.status(500).send("Error processing service event");
        });
});

router.post("/addDistributionEvent", (req, res) => {
    const {
        status,
        date = [],
        starttime,
        plannedduration,
        address,
        city,
        state,
        zip,
        details,
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
            // Step 3: Check if the provided date already exists in the "dates" table
            if (typeof date === 'string') {
                const currentDate = new Date(date) || '2020-01-01';
                currentDate.setDate(currentDate.getDate() + 1)
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
                        res.redirect("/events"); // Redirect after the last insert
                    })
                    .catch(err => {
                        console.error("Error inserting date:", err);
                        res.status(500).send("Error processing dates and eventdates");
                    });
            }
            else {
                for (let i = 0; i < date.length; i++) {
                    const currentDate = new Date(date[i]) || '2020-01-01';
                    currentDate.setDate(currentDate.getDate() + 1)
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
            }
        })
        .catch((err) => {
            console.error("Error:", err);
            res.status(500).send("Error processing service event");
        });
});
router.post("/deleteDate", (req, res) => {
    var { dateid, eventid } = req.body;

    // Convert to date to avoid issues with time zones
    dateid = new Date(dateid);

    // Log to verify the date format

    knex('dates')
        .select('dateid')
        .where({ date: dateid })
        .then(([dateidd]) => {
            if (!dateidd) {
                return res.status(404).send("Date not found.");
            }


            // Log current eventdates for debugging
            knex("eventdates")
                .where({ eventid })
                .andWhere({ dateid: dateidd.dateid })
                .then((eventDateRows) => {

                    // Perform the deletion
                    knex("eventdates")
                        .where({ eventid })
                        .andWhere({ dateid: dateidd.dateid })
                        .del()
                        .then(deletedRows => {

                            if (deletedRows > 0) {
                                return res.status(200).send("Date deleted successfully.");
                            } else {
                                return res.status(404).send("No matching eventdates found.");
                            }
                        })
                        .catch(err => {
                            console.error("Error deleting EventDate:", err);
                            return res.status(500).send("Internal Server Error");
                        });
                })
                .catch(err => {
                    console.error("Error fetching eventdates:", err);
                    return res.status(500).send("Internal Server Error");
                });
        })
        .catch(err => {
            console.error("Error fetching date:", err);
            return res.status(500).send("Internal Server Error");
        });
});
// Route to get city and state based on zip code
router.get("/getCityState", (req, res) => {
    const { zip } = req.query;

    // Query the location table to get city and state for the given zip
    knex("location")
        .select("city", "state")
        .where({ zip })
        .first()
        .then((location) => {
            if (location) {
                // If location is found, send the city and state in the response
                res.json({
                    places: [
                        {
                            city: location.city,
                            state: location.state,
                        },
                    ],
                });
            } else {
                // If location is not found, send a 404 error
                res.status(404).json({ error: "Location not found" });
            }
        })
        .catch((error) => {
            // Handle any errors that occur during the query
            console.error("Error querying location:", error);
            res.status(500).send("Internal Server Error");
        });
});

// Route to edit an existing event
router.post("/editEvent", checkAuthenticated, (req, res) => {
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
        phone = [],
        eventid,
        headcount,
        servicehours,
        item = [],
        quantity = [],
    } = req.body;

    // Step 1: Update the "location" table with zip, city, and state
    knex("location")
        .insert({ zip, city, state })
        .onConflict("zip") // If zip exists, update city/state
        .merge() // Merge updates for existing zip
        .then(() => {
            // Step 2: Update data in the "events" table
            return knex("events")
                .where("eventid", eventid)
                .update({
                    starttime: starttime || '00:00:00',
                    address: address || '',
                    zip: zip || '00000',
                    status: status || 'Pending',
                    plannedduration: plannedduration || 0.0,
                    details: details || '',
                });
        })
        .then(() => {
            // Step 3: Update the "eventrequest" table
            return knex("eventrequest")
                .where("eventid", eventid)
                .update({
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
                });
        })
        .then(() => {
            // Step 3.5: Update the "eventoutcome" table
            return knex("eventoutcome")
                .where("eventid", eventid)
                .update({
                    headcount: headcount || 0,
                    servicehours: servicehours || 0,
                })
                .then(() => {
                    // Step 3.5.2: Update the "eventitems" table
                    if (Array.isArray(item) && item.length > 0) {
                        item.forEach((currentitemid, index) => {
                            const currentquantity = quantity[index] || 0;
                            knex("eventitems")
                                .where("eventid", eventid)
                                .andWhere("itemid", currentitemid)
                                .update({
                                    itemid: currentitemid || 0,
                                    quantity: currentquantity || 0,
                                })
                                .then((newitem) => {
                                    if (newitem) {
                                    }
                                    else {
                                        knex("eventitems")
                                            .insert({
                                                eventid: eventid,
                                                itemid: currentitemid,
                                                quantity: currentquantity
                                            })
                                            .then(() => {
                                                return console.log('');
                                            })
                                    }
                                })
                                .catch((err) => {
                                    console.error("Error:", err);
                                    res.status(500).send("Error updating eventitems info");
                                });
                        });
                    } else if (typeof item === 'string') {
                        // If item is a string, update that item
                        const currentitemid = item || 0;
                        const currentquantity = quantity || 0;

                        knex("eventitems")
                            .where("eventid", eventid)
                            .andWhere("itemid", currentitemid)
                            .update({
                                itemid: currentitemid || 0,
                                quantity: currentquantity || 0,
                            })
                            .then((newitem) => {
                                if (newitem) {
                                }
                                else {
                                    knex("eventitems")
                                        .insert({
                                            eventid: eventid,
                                            itemid: currentitemid,
                                            quantity: currentquantity
                                        })
                                        .then(() => {
                                            return console.log('');
                                        })
                                }
                            })
                            .catch((err) => {
                                console.error("Error:", err);
                                res.status(500).send("Error updating eventitems info");
                            });
                    }
                })
        })
        .then(() => {
            // Step 4: Update users in the "requester" table
            if (Array.isArray(firstname) && firstname.length > 0) {
                firstname.forEach((currentfirstname, index) => {
                    const currentlastname = lastname[index] || '';
                    const currentemail = email[index] || '';
                    const currentphonenumber = phone[index] || '';
                    knex("requester")
                        .where("eventid", eventid)
                        .andWhere("firstname", currentfirstname)
                        .update({
                            firstname: currentfirstname,
                            lastname: currentlastname,
                            phone: currentphonenumber,
                            email: currentemail
                        })
                        .then((newperson) => {

                            if (newperson) {
                                //if newperson exists, then it was already updated
                            }
                            else {
                                knex("requester")
                                    .insert({
                                        eventid: eventid,
                                        firstname: currentfirstname,
                                        lastname: currentlastname,
                                        phone: currentphonenumber,
                                        email: currentemail
                                    })
                                    .then(() => {
                                        return console.log('');
                                    })
                            }
                        })
                        .catch((err) => {
                            console.error("Error:", err);
                            res.status(500).send("Error updating requester info");
                        });
                });
            } else if (typeof firstname === 'string') {
                // If firstname is a string, update that user
                const currentfirstname = firstname || '';
                const currentlastname = lastname || '';
                const currentemail = email[1] || '';
                const currentphonenumber = phone[1] || '';
                knex("requester")
                    .where("eventid", eventid)
                    .andWhere("firstname", currentfirstname)
                    .update({
                        firstname: currentfirstname,
                        lastname: currentlastname,
                        phone: currentphonenumber,
                        email: currentemail
                    })
                    .then((newperson) => {

                        if (newperson) {
                            //if newperson exists, then it was already updated
                        }
                        else {
                            knex("requester")
                                .insert({
                                    eventid: eventid,
                                    firstname: currentfirstname,
                                    lastname: currentlastname,
                                    phone: currentphonenumber,
                                    email: currentemail
                                })
                                .then(() => {
                                    return console.log('');
                                })
                        }
                    })
                    .catch((err) => {
                        console.error("Error:", err);
                        res.status(500).send("Error updating requester info");
                    });
            }
            //delete all dates for eventid in eventdates
            knex("eventdates")
                .where({ eventid })
                .del()
                .then(() => {
                    return console.log('');

                    0
                });
            // Step 5: Update dates in the "eventdates" table
            if (Array.isArray(date) && date.length > 0) {
                date.forEach((currentDate, index) => {
                    const dateToUpdate = new Date(currentDate) || '2020-01-01';
                    dateToUpdate.setDate(dateToUpdate.getDate() + 1)
                    knex("dates")
                        .select("dateid")
                        .where({ date: dateToUpdate })
                        .first()
                        .then(existingDate => {
                            if (existingDate) {
                                // Date exists, update eventdates table
                                return knex("eventdates")
                                    .insert({ eventid: eventid, dateid: existingDate.dateid })
                                    .onConflict(["eventid", "dateid"]) // Handle duplicate key
                                    .merge(); // Update the entry if it already exists


                            } else {
                                // Date doesn't exist, insert it and link with eventdates
                                return knex("dates")
                                    .insert({ date: dateToUpdate })
                                    .returning("dateid")
                                    .then(([newDateId]) => {
                                        const dateId = newDateId.dateid;
                                        return knex("eventdates")
                                            .insert({ eventid: eventid, dateid: dateId })
                                            .onConflict(["eventid", "dateid"])
                                            .ignore();
                                    });
                            }
                        })
                        .then(() => {
                            if (index === date.length - 1) {
                                res.redirect("/events/" + eventid); // Redirect after last update
                            }
                        })
                        .catch(err => {
                            console.error("Error updating date:", err);
                            res.status(500).send("Error processing dates and eventdates");
                        });
                });
            } else if (typeof date === 'string') {
                // If date is a string, process it as a single date
                const currentDate = new Date(date) || '2020-01-01';
                currentDate.setDate(currentDate.getDate() + 1)
                knex("dates")
                    .select("dateid")
                    .where({ date: currentDate })
                    .first()
                    .then(existingDate => {
                        if (existingDate) {
                            // Date exists, update eventdates table
                            return knex("eventdates")
                                .insert({ eventid: eventid, dateid: existingDate.dateid })
                                .onConflict(["eventid", "dateid"])
                                .merge(); // Update the entry if it already exists
                        } else {
                            // Date doesn't exist, insert it and link with eventdates
                            return knex("dates")
                                .insert({ date: currentDate })
                                .returning("dateid")
                                .then(([newDateId]) => {
                                    const dateId = newDateId.dateid;
                                    return knex("eventdates")
                                        .insert({ eventid: eventid, dateid: dateId })
                                        .onConflict(["eventid", "dateid"])
                                        .ignore();
                                });
                        }
                    })
                    .then(() => {
                        res.redirect("/events"); // Redirect after update
                    })
                    .catch(err => {
                        console.error("Error updating date:", err);
                        res.status(500).send("Error processing dates and eventdates");
                    });
            }
        })
        .catch((err) => {
            console.error("Error:", err);
            res.status(500).send("Error processing service event update");
        });
});


// Route to get all events
router.get("/events", checkAuthenticated, (req, res) => {
    // Query to get event details along with related data
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
            // Query to get service types
            knex("servicetypes")
                .select()
                .then((servicetypes) => {
                    // Render the events page with the queried data
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
});

// Route to get details of a single event
router.get('/events/:eventid', checkAuthenticated, (req, res) => {
    const eventid = req.params.eventid;

    // Query to get event details along with related data
    knex('events as e')
        .leftJoin('eventdates as ed', 'e.eventid', 'ed.eventid')
        .leftJoin('dates as d', 'ed.dateid', 'd.dateid')
        .leftJoin('location as l', 'e.zip', 'l.zip')
        .leftJoin('eventrequest as er', 'e.eventid', 'er.eventid')
        .leftJoin('servicetypes as st', 'er.servicetypeid', 'st.servicetypeid')
        .leftJoin('distributionevent as de', 'de.eventid', 'e.eventid')
        .leftJoin('eventoutcome as eo', 'eo.eventid', 'e.eventid')
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
            'st.description',
            'de.temperature',
            'eo.headcount',
            'eo.servicehours'
        )
        .where('e.eventid', eventid)
        .first()
        .then((event) => {
            // Query to get service types
            knex('servicetypes')
                .select()
                .then((servicetypes) => {
                    // Query to get items
                    knex('items')
                        .select()
                        .then((items) => {
                            // Query to get dates related to the event
                            knex('dates as d')
                                .join('eventdates as ed', 'd.dateid', 'ed.dateid')
                                .select('d.date')
                                .where('ed.eventid', eventid)
                                .then((dates) => {
                                    // Query to get requesters related to the event
                                    knex('requester')
                                        .select('firstname', 'lastname', 'email', 'phone')
                                        .where({ eventid })
                                        .then((requesters) => {
                                            // Query to get recipients related to the event
                                            knex('recipients')
                                                .select('name', 'itemid')
                                                .where({ eventid })
                                                .then((recipients) => {
                                                    // Query to get event items related to the event
                                                    knex('eventitems')
                                                        .join('items as i', "i.itemid", 'eventitems.itemid')
                                                        .select('i.itemid', 'description', 'quantity')
                                                        .where({ eventid })
                                                        .then((eventitems) => {
                                                            // Render the single event page with the queried data
                                                            res.render('layout', {
                                                                title: 'Single Event',
                                                                page: 'singleEvent',
                                                                event: event,
                                                                servicetypes: servicetypes,
                                                                items: items,
                                                                dates: dates,
                                                                requesters: requesters,
                                                                recipients: recipients,
                                                                eventitems: eventitems,
                                                            });
                                                        })
                                                })
                                                .catch((error) => {
                                                    console.error('Error querying recipients:', error);
                                                    res.status(500).send('Internal Server Error');
                                                });
                                        })
                                        .catch((error) => {
                                            console.error('Error querying recipients:', error);
                                            res.status(500).send('Internal Server Error');
                                        });
                                })
                                .catch((error) => {
                                    console.error('Error querying requesters:', error);
                                    res.status(500).send('Internal Server Error');
                                });
                        })
                })
        })
});

// Route to get all volunteers
router.get("/volunteers", checkAuthenticated, (req, res) => {
    // Query to get all volunteers
    knex("volunteer")
        .select()
        .orderBy("lastname", "asc")
        .then((volunteers) => {
            // Query to get all skill levels
            knex("skilllevel")
                .select()
                .orderBy("skillid", "asc")
                .then((skilllevel) => {
                    // Query to get all locations
                    knex("location")
                        .select()
                        .then((location) => {
                            // Render the volunteers page with the queried data
                            res.render("layout", {
                                title: "Volunteers",
                                page: "volunteers",
                                volunteers: volunteers,
                                skilllevel: skilllevel,
                                location: location
                            });
                        })
                        .catch((error) => {
                            console.error("Error querying location database:", error);
                            res.status(500).send("Internal Server Error");
                        });
                })
                .catch((error) => {
                    console.error("Error querying skill level database:", error);
                    res.status(500).send("Internal Server Error");
                });
        })
        .catch((error) => {
            console.error("Error querying volunteer database:", error);
            res.status(500).send("Internal Server Error");
        });
});

// Route to edit a volunteer
router.post("/editVolunteer", (req, res) => {
    const {
        firstname,
        lastname,
        email,
        phonenumber,
        skillid,
        city,
        zip,
        state,
        availability,
        discoverymethod,
        notes,
        password,
        jobrole,
        teacher,
        range,
        leader,
    } = req.body;

    // Insert or update location data
    knex("location")
        .insert({ zip: zip || 0, city: city || '', state: state || '' })
        .onConflict("zip") // If zip exists, update city/state
        .merge() // Merge updates for existing zip
        .then(() => {
            // Update volunteer data
            knex("volunteer")
                .where({ email })
                .update({
                    email: email || '',
                    firstname: firstname || '',
                    lastname: lastname || '',
                    phonenumber: phonenumber || '',
                    skillid: skillid || 0,
                    availability: availability || '',
                    discoverymethod: discoverymethod || '',
                    notes: notes || '',
                    password: password || '',
                    teacher: teacher || false,
                    leader: leader || false,
                    range: range || 0,
                    jobrole: jobrole || 'Volunteer',
                    zip: zip || 0,
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

// Route to delete an event
router.post("/deleteEvent", (req, res) => {
    const { eventid } = req.body;

    // Delete event by eventid
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

// Route to delete a volunteer
router.post("/deleteVolunteer", (req, res) => {
    const { email } = req.body;

    // Delete volunteer by email
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

// Route to render the login page
router.get("/login", (req, res) => {
    res.render("pages/login", {
        originalUrl: req.session.originalUrl || "/",
    });
});

// Route to handle logout
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
    const discoverymethod = req.body.discoverymethod; // Ensure the correct value is coming in

    // SQL query targeting the "survey" table
    knex('survey')
        .where({ discoverymethod }) // Match the correct discoverymethod
        .increment('total', 1) // Increment the total column by 1
        .then((result) => {
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

// Route to get session data
router.get("/session-data", (req, res) => {
    res.json({
        authenticated: req.session.authenticated || false,
        user: req.session.user || null,
    });
});

module.exports = router;