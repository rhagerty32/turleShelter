# Turtle Shelter Website 🐢

Welcome to the Turtle Shelter Website Project! This Node.js and EJS-powered website is designed for a school project to demonstrate web development skills. The site supports **Turtle Shelter**, a nonprofit organization dedicated to crafting vests for homeless individuals.

---

## Site Navigation and Functionality 🐢

### **Home Page**
- **URL**: `/`
- **Description**: Mission and impact of the Turtle Shelter Project. FAQ and Donate buttons link to the current turtleshelterproject.org site 

### **Voluneer**
- **URL**: `/volunteer`
- **Description**: The two volunteer buttons on the home page link to a form which you can fill out with volunteer information. the volunteer information will be displayed in the volunteers tab which is in the dropdown under the admin tab which is available after login

### **Host and Event / Host**
- **URL**: `/hostAnEvent`
- **Description**: Both these buttons will link to an event form. When submitted this will information will be displayed in the events tab which is in the dropdown under the admin tab which is available after login

### **Volunteer Signup**
- **URL**: `/volunteer`
- **Description**: Join our team of volunteers and help sew vests or distribute them.

### **Contact Us**
- **URL**: `/contact`
- **Description**: A way for donors, volunteers, or those in need to get in touch with the Turtle Shelter team.

### **Admin Login**
- **URL**: `/admin`
- **Username**: `johndoe@example.com`
- **Password**: `password123`
- **Description**: Access the admin panel to manage site content and user data.

---

## Installation and Setup 🐢

Follow these steps to get the Turtle Shelter website up and running on your server.

### Prerequisites
- **Node.js** (v18 or later)
- **NPM**

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
├── README.md        # This guide
```

---

## How TAs Can Use the Website for Grading

1. **Access the Admin Panel**:
   - **URL**: `/admin`
   - **Username**: `johndoe@example.com`
   - **Password**: `password123`

2. **Review Site Content**:
   - Navigate through the different pages (Home, Adopt-a-Vest, Donation Portal, Volunteer Signup, Contact Us) to ensure all functionalities are working as expected.

3. **Check Admin Functionalities**:
   - Log in to the admin panel to verify the ability to manage site content and user data.

4. **Test Donation and Volunteer Signup**:
   - Use the donation portal and volunteer signup forms to ensure they are functioning correctly.

---

Thank you for reviewing the Turtle Shelter Website Project! 🐢💚

