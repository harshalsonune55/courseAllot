require("dotenv").config();

const express = require("express");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const bcrypt = require("bcryptjs");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const CourseRequest = require("./models/CourseRequest");


const User = require("./models/User");

const app = express();
const PORT = process.env.PORT || 3000;

/* =============================
   MONGODB CONNECTION
============================= */
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("✅ MongoDB Atlas Connected"))
    .catch(err => console.log("Mongo Error:", err));

/* =============================
   ENSURE UPLOADS FOLDER EXISTS
============================= */
const uploadPath = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath);
}


/* =============================
   MIDDLEWARE
============================= */
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URL
    })
}));

/* =============================
   MULTER CONFIG
============================= */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({ storage });

/* =============================
   VIEW ENGINE
============================= */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layouts/main");
app.use(express.static(path.join(__dirname, "public")));

/* =============================
   AUTH MIDDLEWARE
============================= */
function isAuthenticated(req, res, next) {
    if (!req.session.user) return res.redirect("/");
    next();
}

/* =============================
   COURSE MATCHING LOGIC
============================= */
function matchCourses(cvText) {

    const courses = [
        { name: "Machine Learning", keywords: ["python", "machine learning", "tensorflow", "pytorch"] },
        { name: "Data Structures", keywords: ["algorithms", "data structures", "c++", "java"] },
        { name: "Database Management", keywords: ["sql", "database", "mysql", "mongodb"] },
        { name: "Computer Networks", keywords: ["network", "tcp", "udp", "routing"] }
    ];

    cvText = cvText.toLowerCase();
    let matches = [];

    courses.forEach(course => {
        let score = 0;

        course.keywords.forEach(keyword => {
            if (cvText.includes(keyword)) score++;
        });

        if (score > 0) {
            matches.push({
                course: course.name,
                matchScore: score * 25   // convert to percentage style
            });
        }
    });

    return matches.sort((a, b) => b.matchScore - a.matchScore);
}

function parseCV(cvText) {

    cvText = cvText.toLowerCase();

    const skillKeywords = [
        "python", "java", "c++", "machine learning",
        "sql", "mongodb", "data structures",
        "tensorflow", "network", "algorithms"
    ];

    let extractedSkills = skillKeywords.filter(skill =>
        cvText.includes(skill)
    );

    // Extract experience years
    let experienceMatch = cvText.match(/(\d+)\s+years?/);
    let experienceYears = experienceMatch ? parseInt(experienceMatch[1]) : 0;

    // Extract education (simple version)
    let education = "Unknown";
    if (cvText.includes("phd")) education = "PhD";
    else if (cvText.includes("master")) education = "Masters";
    else if (cvText.includes("bachelor")) education = "Bachelors";

    return {
        skills: extractedSkills,
        experienceYears,
        education
    };
}

function isValidCV(cvText) {
    cvText = cvText.toLowerCase();
  
    const cvIndicators = [
      "education",
      "experience",
      "skills",
      "project",
      "university",
      "bachelor",
      "master",
      "phd"
    ];
  
    let score = 0;
  
    cvIndicators.forEach(word => {
      if (cvText.includes(word)) score++;
    });
  
    return score >= 2; // minimum requirement
  }
  
  


function generateRecommendations(parsedData) {

    const courses = [
        { name: "Machine Learning", keywords: ["python", "machine learning", "tensorflow"] },
        { name: "Data Structures", keywords: ["algorithms", "data structures", "c++", "java"] },
        { name: "Database Management", keywords: ["sql", "mongodb"] },
        { name: "Computer Networks", keywords: ["network"] }
    ];

    let recommendations = [];

    courses.forEach(course => {

        let score = 0;

        course.keywords.forEach(keyword => {
            if (parsedData.skills.includes(keyword)) {
                score += 30;
            }
        });

        // Bonus for experience
        if (parsedData.experienceYears > 5) score += 20;

        if (score > 0) {
            recommendations.push({
                course: course.name,
                score: Math.min(score, 100),
                status: "PENDING"
            });
        }

    });

    return recommendations.sort((a, b) => b.score - a.score);
}


/* =============================
   ROUTES
============================= */

app.post("/request-course", isAuthenticated, async (req, res) => {

    const { courseName, score } = req.body;
  
    // ✅ CHECK IF REQUEST ALREADY EXISTS
    const existing = await CourseRequest.findOne({
      faculty: req.session.user._id,
      courseName,
      status: "PENDING"
    });
  
    if (existing) {
      return res.redirect("/allocations");
    }
  
    // ✅ CREATE NEW REQUEST IF NOT EXISTS
    await CourseRequest.create({
      faculty: req.session.user._id,
      courseName,
      matchScore: score,
      status: "PENDING"
    });
  
    res.redirect("/allocations");
  });
  
  


  app.get("/faculty-members", isAuthenticated, async (req, res) => {

    if (req.session.user.role !== "HOD") {
      return res.redirect("/home");
    }
  
    const facultyList = await User.find({ role: "Faculty" });
  
    res.render("faculty-members", {
      layout: "layouts/hod-layout",
      currentPage: "faculty",
      facultyList,
      data: {
        user: {
          name: req.session.user.fullName,
          role: req.session.user.role
        }
      }
    });
  });
  

  app.get("/hod-allocations", isAuthenticated, async (req, res) => {

    if (req.session.user.role !== "HOD") {
      return res.redirect("/home");
    }
  
    const requests = await CourseRequest
      .find()
      .populate("faculty");
  
    res.render("allocation_approve", {
      layout: "layouts/hod-layout",
      requests,
      currentPage: "allocations",
      data: {
        user: {
          name: req.session.user.fullName,
          role: req.session.user.role
        }
      }
    });
  
  });
  

  app.get("/hod-dashboard", isAuthenticated, async (req, res) => {

    if (req.session.user.role !== "HOD") {
      return res.redirect("/home");
    }
  
    const requests = await CourseRequest
        .find()
        .populate("faculty");
  
    res.render("hod-dashboard", {
      layout: "layouts/hod-layout",
      requests,
      currentPage: "dashboard",
      data: {
        user: {
          name: req.session.user.fullName,
          role: req.session.user.role
        }
      }
    });
  });
  
  app.post("/approve/:id", isAuthenticated, async (req, res) => {

    if (req.session.user.role !== "HOD") {
      return res.redirect("/home");
    }
  
    await CourseRequest.findByIdAndUpdate(req.params.id, {
      status: "APPROVED",
      approvedAt: new Date()
    });
  
    res.redirect("/hod-dashboard");
  });
  
  
  app.post("/reject/:id", isAuthenticated, async (req, res) => {

    if (req.session.user.role !== "HOD") {
      return res.redirect("/home");
    }
  
    await CourseRequest.findByIdAndUpdate(req.params.id, {
      status: "REJECTED",
      approvedAt: new Date()
    });
  
    res.redirect("/hod-dashboard");
  });
  
    

// Login Page

app.get("/", (req, res) => {
    res.render("index", { layout: false });
});



// Faculty Login Page
app.get("/faculty-login", (req, res) => {
    res.render("login-faculty", { layout: false, error: null });
});

// Faculty Login Submit
app.post("/login-faculty", async (req, res) => {

    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user || user.role !== "Faculty") {
        return res.render("login-faculty", { layout: false, error: "Invalid Faculty Account" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.render("login-faculty", { layout: false, error: "Invalid Password" });
    }

    req.session.user = user;
    res.redirect("/home");
});
 
// HOD Login Page
app.get("/hod-login", (req, res) => {
    res.render("login-hod", { layout: false, error: null });
});

// HOD Login Submit
app.post("/login-hod", async (req, res) => {

    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user || user.role !== "HOD") {
        return res.render("login-hod", { layout: false, error: "Invalid HOD Account" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.render("login-hod", { layout: false, error: "Invalid Password" });
    }

    req.session.user = user;
    res.redirect("/hod-dashboard");  // IMPORTANT
});


// Faculty Signup Page
app.get("/faculty-signup", (req, res) => {
    res.render("signup-faculty", { layout: false, error: null });
});

// Faculty Signup Submit
app.post("/signup-faculty", async (req, res) => {

    const { fullName, email, username, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.render("signup-faculty", { layout: false, error: "Passwords do not match" });
    }

    const existingUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existingUser) {
        return res.render("signup-faculty", { layout: false, error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
        fullName,
        email,
        username,
        password: hashedPassword,
        role: "Faculty"
    });

    res.redirect("/faculty-login");
});


// HOD Signup Page
app.get("/hod-signup", (req, res) => {
    res.render("signup-hod", { layout: false, error: null });
});

// HOD Signup Submit
app.post("/hod-signup", async (req, res) => {

    const { fullName, email, username, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.render("signup-hod", { layout: false, error: "Passwords do not match" });
    }

    const existingUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existingUser) {
        return res.render("signup-hod", { layout: false, error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
        fullName,
        email,
        username,
        password: hashedPassword,
        role: "HOD"
    });

    res.redirect("/hod-login");
});




// Dashboard
app.get("/home", isAuthenticated, async (req, res) => {

    const user = req.session.user;
  
    // 🔥 Get all requests made by this faculty
    const requests = await CourseRequest.find({
      faculty: user._id
    });
  
    const approved = requests.filter(r => r.status === "APPROVED").length;
    const pending = requests.filter(r => r.status === "PENDING").length;
    const rejected = requests.filter(r => r.status === "REJECTED").length;
  
    res.render("dashboard", {
      data: {
        user: {
          name: user.fullName,
          role: user.role
        },
        stats: {
          skills: user.skills ? user.skills.length : 0,
          experience: user.experienceYears || 0,
          education: user.education || "Not Found",
          approvedCourses: approved,
          pendingRequests: pending
        },
        recommendations: user.recommendedCourses || [],
        requests: requests
      },
      currentPage: "dashboard"
    });
  });
  






// Allocations
app.get("/allocations", isAuthenticated, async (req, res) => {

    const user = req.session.user;
  
    // 🔥 Fetch real requests from DB
    const requests = await CourseRequest.find({
      faculty: user._id
    });
  
    res.render("allocations", {
      data: {
        user: {
          name: user.fullName,
          role: user.role
        },
        recommendations: user.recommendedCourses || [],
        requests: requests
      },
      currentPage: "allocations"
    });
  });
  


// Notifications
app.get("/notifications", isAuthenticated, async (req, res) => {

    const requests = await CourseRequest.find({
      faculty: req.session.user._id,
      status: { $in: ["APPROVED", "REJECTED"] }
    }).sort({ updatedAt: -1 });
  
    res.render("notifications", {
      data: {
        user: {
          name: req.session.user.fullName,
          role: req.session.user.role
        },
        requests
      },
      currentPage: "notifications"
    });
  });
  

// Update Profile
app.post("/update-profile", isAuthenticated, async (req, res) => {

    const { fullName, email, department, phone } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
        req.session.user._id,
        { fullName, email, department, phone },
        { new: true }
    );

    req.session.user = updatedUser;

    res.redirect("/home");
});

app.get("/upload-cv", isAuthenticated, async (req, res) => {

    const user = await User.findById(req.session.user._id);
  
    req.session.user = user;
  
    res.render("upload", {
      data: {
        user
      },
      currentPage: "upload",
      success: req.query.success,
      rejected: req.query.rejected,
      error: req.query.error
    });
  });
  
  


  app.post("/upload-cv", isAuthenticated, upload.single("cv"), async (req, res) => {

    if (!req.file) {
      return res.redirect("/upload-cv?error=true");
    }
  
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    const cvText = pdfData.text;
  
    const now = new Date();
    const valid = isValidCV(cvText);
  
    if (!valid) {
  
      await User.findByIdAndUpdate(req.session.user._id, {
        cvStatus: "REJECTED",
        cvUploadedAt: now,
        cvReviewedAt: now,
        skills: [],
        experienceYears: 0,
        education: "",
        recommendedCourses: []
      });
  
      return res.redirect("/upload-cv?rejected=true");
    }
  
    // ✅ VALID CV
    const parsedData = parseCV(cvText);
    const recommendations = generateRecommendations(parsedData);
  
    const updatedUser = await User.findByIdAndUpdate(
      req.session.user._id,
      {
        skills: parsedData.skills,
        experienceYears: parsedData.experienceYears,
        education: parsedData.education,
        recommendedCourses: recommendations,
        cvStatus: "APPROVED",
        cvUploadedAt: now,
        cvReviewedAt: now
      },
      { new: true }
    );
  
    req.session.user = updatedUser;
  
    res.redirect("/upload-cv?success=true");
  });
  
  


// Logout
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
