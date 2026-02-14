const express = require("express");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");

const app = express();

// View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layouts/main");

// Static Files
app.use(express.static(path.join(__dirname, "public")));


// ✅ DEFINE DATA ONCE
const dashboardData = {
    user: {
        name: "Dr. Smith",
        role: "Faculty"
    },
    stats: {
        courses: 5,
        faculty: 3,
        matches: 3,
        pending: 1
    },
    recommendations: [
        {
            faculty: "Dr. Smith",
            course: "Intro to Programming",
            score: 95,
            status: "APPROVED"
        },
        {
            faculty: "Dr. Johnson",
            course: "Data Structures",
            score: 88,
            status: "APPROVED"
        },
        {
            faculty: "Dr. Williams",
            course: "Computer Networks",
            score: 72,
            status: "PENDING"
        }
    ]
};
app.get("/home", (req, res) => {
    res.render("dashboard", {
        data: dashboardData,
        currentPage: "dashboard"
    });
});

app.get("/faculty", (req, res) => {
    res.render("faculty", {
        data: dashboardData,
        currentPage: "faculty"
    });
});
app.get("/upload-cv", (req, res) => {
    res.render("upload", {
        data: dashboardData,
        currentPage: "upload"
    });
});

app.get("/allocations", (req, res) => {
    res.render("allocations", {
        data: dashboardData,
        currentPage: "allocations"
    });
});

app.get("/notifications", (req, res) => {
    res.render("notifications", {
        data: dashboardData,
        currentPage: "notifications"
    });
});
app.get("/", (req, res) => {
    res.render("index", { layout: false });
});
