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


mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("MongoDB Atlas Connected"))
    .catch(err => console.log("Mongo Error:", err));


const uploadPath = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath);
}



app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URL
    })
}));
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 } 
});


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layouts/main");
app.use(express.static(path.join(__dirname, "public")));



function isAuthenticated(req, res, next) {
    if (!req.session.user) return res.redirect("/");
    next();
}

// async function verifyCVWithGemini(parsedData, rawText) {
//   try {

//     const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

//     const prompt = `
// You are an academic CV authenticity verification system.

// Analyze the CV and return ONLY valid JSON.

// Check:
// - Valid college name
// - Logical experience dates
// - Realistic skill alignment
// - Consistency between education & experience

// Parsed Data:
// Education: ${parsedData.education}
// Experience Years: ${parsedData.experienceYears}
// Skills: ${parsedData.skills.join(", ")}

// Full CV Text:
// ${rawText}

// Return JSON format:

// {
//   "authenticityScore": number,
//   "collegeValid": true/false,
//   "datesValid": true/false,
//   "experienceValid": true/false,
//   "overallAssessment": "short explanation"
// }
// `;

//     const response = await ai.models.generateContent({
//       model,
//       contents: [
//         {
//           role: "user",
//           parts: [{ text: prompt }]
//         }
//       ]
//     });

//     const text = response.text;
//     const cleaned = text.replace(/```json|```/g, "").trim();

//     return JSON.parse(cleaned);

//   } catch (error) {
//     console.error("Gemini Verification Error:", error);

//     return {
//       authenticityScore: 50,
//       collegeValid: false,
//       datesValid: false,
//       experienceValid: false,
//       overallAssessment: "AI verification failed"
//     };
//   }
// }









function matchCourses(cvText) {

    const courses = [
     
        {
          name: "Machine Learning",
          category: "Technical",
          keywords: ["python", "machine learning", "tensorflow", "pytorch", "ai", "data science"]
        },
        {
          name: "Data Structures",
          category: "Technical",
          keywords: ["algorithms", "data structures", "c++", "java"]
        },
        {
          name: "Database Management",
          category: "Technical",
          keywords: ["sql", "database", "mysql", "mongodb"]
        },
        {
          name: "Computer Networks",
          category: "Technical",
          keywords: ["network", "tcp", "udp", "routing"]
        },
      
  
        {
          name: "Project Management",
          category: "Management",
          keywords: ["project management", "planning", "scrum", "agile", "leadership"]
        },
        {
          name: "Entrepreneurship",
          category: "Management",
          keywords: ["startup", "business", "entrepreneur", "innovation"]
        },
      

        {
          name: "Technical Communication",
          category: "Humanities",
          keywords: ["communication", "presentation", "technical writing"]
        },
        {
          name: "Professional Ethics",
          category: "Humanities",
          keywords: ["ethics", "professional ethics", "compliance"]
        },
      
   
        {
          name: "Engineering Mathematics",
          category: "Mathematics",
          keywords: ["calculus", "linear algebra", "probability", "statistics"]
        },
        {
          name: "Applied Physics",
          category: "Science",
          keywords: ["physics", "mechanics", "thermodynamics"]
        },
      
       
        {
          name: "Leadership & Team Management",
          category: "Soft Skills",
          keywords: ["leadership", "team management", "coordination"]
        },
        {
          name: "Research Methodology",
          category: "Academic",
          keywords: ["research", "publications", "journal", "conference"]
        }
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
                matchScore: score * 25   
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
        "tensorflow", "network", "algorithms",
      
    
        "project management", "agile", "scrum", "leadership",
      

        "communication", "technical writing", "presentation",
      
      
        "calculus", "statistics", "linear algebra",
      
        
        "research", "publications", "conference", "journal",
      
       
        "entrepreneur", "startup", "innovation"
      ];
      

    let extractedSkills = skillKeywords.filter(skill =>
        cvText.includes(skill)
    );

   
    let experienceMatch = cvText.match(/(\d+)\s+years?/);
    let experienceYears = experienceMatch ? parseInt(experienceMatch[1]) : 0;

 
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
  
    return score >= 2; 
  }
  
  


  function generateRecommendations(parsedData) {

    const courses = [
       
        {
          name: "Machine Learning",
          category: "Technical",
          keywords: ["python", "machine learning", "tensorflow", "pytorch", "ai", "data science"]
        },
        {
          name: "Data Structures",
          category: "Technical",
          keywords: ["algorithms", "data structures", "c++", "java"]
        },
        {
          name: "Database Management",
          category: "Technical",
          keywords: ["sql", "database", "mysql", "mongodb"]
        },
        {
          name: "Computer Networks",
          category: "Technical",
          keywords: ["network", "tcp", "udp", "routing"]
        },
      
 
        {
          name: "Project Management",
          category: "Management",
          keywords: ["project management", "planning", "scrum", "agile", "leadership"]
        },
        {
          name: "Entrepreneurship",
          category: "Management",
          keywords: ["startup", "business", "entrepreneur", "innovation"]
        },
      

        {
          name: "Technical Communication",
          category: "Humanities",
          keywords: ["communication", "presentation", "technical writing"]
        },
        {
          name: "Professional Ethics",
          category: "Humanities",
          keywords: ["ethics", "professional ethics", "compliance"]
        },
      
  
        {
          name: "Engineering Mathematics",
          category: "Mathematics",
          keywords: ["calculus", "linear algebra", "probability", "statistics"]
        },
        {
          name: "Applied Physics",
          category: "Science",
          keywords: ["physics", "mechanics", "thermodynamics"]
        },
      
  
        {
          name: "Leadership & Team Management",
          category: "Soft Skills",
          keywords: ["leadership", "team management", "coordination"]
        },
        {
          name: "Research Methodology",
          category: "Academic",
          keywords: ["research", "publications", "journal", "conference"]
        }
      ];
      
  
    let recommendations = [];
  
    courses.forEach(course => {
  
      let score = 0;
  
      course.keywords.forEach(keyword => {
        if (parsedData.skills.includes(keyword)) {
          score += 20;
        }
      });
  
    
      if (parsedData.experienceYears >= 3) score += 10;
      if (parsedData.experienceYears >= 7) score += 20;
  
      if (score > 0) {
        recommendations.push({
          course: course.name,
          category: course.category,
          score: Math.min(score, 100),
          status: "PENDING"
        });
      }
    });
  
    return recommendations.sort((a, b) => b.score - a.score);
  }

  async function rejectCV(userId, now) {
    await User.findByIdAndUpdate(userId, {
      cvStatus: "REJECTED",
      cvUploadedAt: now,
      cvReviewedAt: now,
      skills: [],
      experienceYears: 0,
      education: "",
      recommendedCourses: []
    });
  }
  

  function calculateCVMatchScore(cvText) {

    const courses = [
      {
        keywords: ["python", "machine learning", "tensorflow", "pytorch", "ai", "data science"]
      },
      {
        keywords: ["algorithms", "data structures", "c++", "java"]
      },
      {
        keywords: ["sql", "database", "mysql", "mongodb"]
      },
      {
        keywords: ["network", "tcp", "udp", "routing"]
      }
    ];
  
    cvText = cvText.toLowerCase();
  
    let totalKeywords = 0;
    let matchedKeywords = 0;
  
    courses.forEach(course => {
      course.keywords.forEach(keyword => {
        totalKeywords++;
        if (cvText.includes(keyword)) {
          matchedKeywords++;
        }
      });
    });
  
    const percentage = (matchedKeywords / totalKeywords) * 100;
  
    return Math.round(percentage);
  }
  
  



app.post("/request-course", isAuthenticated, async (req, res) => {

    const { courseName } = req.body;
  
    const user = await User.findById(req.session.user._id);
  
  
    const existing = await CourseRequest.findOne({
      faculty: user._id,
      courseName,
      status: { $in: ["PENDING", "APPROVED"] }
    });
  
    if (existing) {
      return res.redirect("/allocations");
    }
  
  
    const recommendation = user.recommendedCourses.find(
      r => r.course === courseName
    );
  
    const score = recommendation ? recommendation.score : 50;
  
    await CourseRequest.create({
      faculty: user._id,
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
  
    



app.get("/", (req, res) => {
    res.render("index", { layout: false });
});




app.get("/faculty-login", (req, res) => {
    res.render("login-faculty", { layout: false, error: null });
});


app.post("/login-faculty", async (req, res) => {

  const { identifier, password } = req.body;

  // 🔹 Find by username OR email
  const user = await User.findOne({
    $or: [
        { username: new RegExp(`^${identifier}$`, "i") },
        { email: new RegExp(`^${identifier}$`, "i") }
    ]
});


  if (!user || user.role !== "Faculty") {
      return res.render("login-faculty", {
          layout: false,
          error: "Invalid Username / Email"
      });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
      return res.render("login-faculty", {
          layout: false,
          error: "Invalid Password"
      });
  }

  req.session.user = user;
  res.redirect("/home");
});

 

app.get("/hod-login", (req, res) => {
    res.render("login-hod", { layout: false, error: null });
});

app.post("/login-hod", async (req, res) => {

  const { identifier, password } = req.body;

  const user = await User.findOne({
      $or: [
          { username: identifier },
          { email: identifier }
      ]
  });

  if (!user || user.role !== "HOD") {
      return res.render("login-hod", {
          layout: false,
          error: "Invalid Username / Email"
      });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
      return res.render("login-hod", {
          layout: false,
          error: "Invalid Password"
      });
  }

  req.session.user = user;
  res.redirect("/hod-dashboard");
});




app.get("/signup-faculty", (req, res) => {
    res.render("signup-faculty", { layout: false, error: null });
});


app.post("/faculty-signup", async (req, res) => {

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



app.get("/hod-signup", (req, res) => {
    res.render("signup-hod", { layout: false, error: null });
});


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





app.get("/home", isAuthenticated, async (req, res) => {

    const user = req.session.user;
  
   
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
  







app.get("/allocations", isAuthenticated, async (req, res) => {

    const user = req.session.user;
  

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
  


  app.post("/update-profile", isAuthenticated, async (req, res) => {
    try {
      const { fullName, email, department, phone } = req.body;
  
      const updatedUser = await User.findByIdAndUpdate(
        req.session.user._id,
        { fullName, email, department, phone },
        { returnDocument: "after" }
      );
  
      req.session.user = updatedUser;
  
      res.redirect("/home");
    } catch (err) {
      console.error("Update Profile Error:", err);
      res.redirect("/home");
    }
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
    const now = new Date();   // ✅ define first
  
    // 🔹 Mandatory University Check
    if (!cvText.toLowerCase().includes("university of sharjah")) {
      await rejectCV(req.session.user._id, now);
      return res.redirect("/upload-cv?rejected=true");
    }
  
    // 🔹 Basic structure validation
    if (!isValidCV(cvText)) {
      await rejectCV(req.session.user._id, now);
      return res.redirect("/upload-cv?rejected=true");
    }
  
    // 🔹 Match score validation
    const matchPercentage = calculateCVMatchScore(cvText);
  
    if (matchPercentage < 55) {  // better logic
      await rejectCV(req.session.user._id, now);
      return res.redirect("/upload-cv?rejected=true");
    }
  
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
      { returnDocument: "after" }
    );
  
    req.session.user = updatedUser;
  
    res.redirect("/upload-cv?success=true");
  });
  
  

  app.post("/save-preferences", isAuthenticated, async (req, res) => {

    let selectedCourses = req.body.selectedCourses;
  
    if (!selectedCourses) {
      return res.redirect("/allocations");
    }
  

    if (!Array.isArray(selectedCourses)) {
      selectedCourses = [selectedCourses];
    }
  
    const user = await User.findById(req.session.user._id);
  
    for (let courseName of selectedCourses) {
  

      const existing = await CourseRequest.findOne({
        faculty: user._id,
        courseName,
        status: { $in: ["PENDING", "APPROVED"] }
      });
  
      if (!existing) {
  

        const recommendation = user.recommendedCourses.find(
          r => r.course === courseName
        );
  
        const score = recommendation ? recommendation.score : 50;
  
        await CourseRequest.create({
          faculty: user._id,
          courseName,
          matchScore: score,
          status: "PENDING"
        });
      }
    }
  
    res.redirect("/allocations");
  });
  
  
  



app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
