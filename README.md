# Turtle Shelter Website 🐢

Welcome to the Turtle Shelter website project! This Node.js and EJS-powered website is designed to support **Turtle Shelter**, a nonprofit organization dedicated to crafting turtle-inspired vests for homeless individuals. Our goal is to provide warmth, comfort, and hope—one shell at a time. 🐢💚

---

## Features 🌊

- **Home Page**: A welcoming landing page to introduce visitors to the mission of Turtle Shelter.
- **Adopt-a-Vest Page**: Learn about our unique, turtle-themed vests and how to support our initiative.
- **Donation Portal**: A simple and secure way to donate to the cause.
- **Volunteer Signup**: Join our team of volunteers and help sew vests or distribute them.
- **Contact Us**: A way for donors, volunteers, or those in need to get in touch with the Turtle Shelter team.

---

## Installation and Setup 🐢

Follow these steps to get the Turtle Shelter website up and running on your shell... uh, server. 🐚

### Prerequisites
- **Node.js** (v18 or later)
- **NPM**
- A terminal with a love for turtles 🐢

### Steps to Install
1. **Clone the Repository**:
    ```bash
    git clone https://github.com/your-username/turtle-shelter-website.git
    cd turtle-shelter-website
    ```

2. **Install Dependencies**:
    ```bash
    npm install
    ```

3. **Run the Application**:
    ```bash
    npm start
    ```

4. Open your browser and visit:
    ```
    http://localhost:3000
    ```

---

## Directory Structure 📂

```plaintext
turtle-shelter-website/
├── public/          # Static files (CSS, images, etc.)
├── views/           # EJS templates for the site pages
│   ├── partials/    # Reusable EJS components like headers and footers
│   ├── index.ejs    # Home page
│   ├── donate.ejs   # Donation page
│   ├── adopt.ejs    # Adopt-a-Vest page
├── routes/          # Routing files for different parts of the site
│   ├── index.js     # Routes for the home page and main site
│   ├── donate.js    # Routes for the donation functionality
├── app.js           # Main application file
├── package.json     # NPM configuration
├── README.md        # This beautiful guide

