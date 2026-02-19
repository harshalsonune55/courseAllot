const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    fullName: String,
    email: String,
    username: String,
    password: String,
    role: String,
    department: String,
    phone: String,
    cvStatus: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED"],
        default: "PENDING"
      },
      
      cvUploadedAt: {
        type: Date
      },
      
      cvReviewedAt: {
        type: Date
      },
      

    // 🔥 CV Parsed Data
    skills: [String],
    experienceYears: Number,
    education: String,
    authenticityScore: {
      type: Number,
      default: 0
    },
    
    authenticityReport: {
      type: String,
      default: ""
    },
    recommendedCourses: [
        {
            course: String,
            score: Number,
            status: { type: String, default: "PENDING" }
        }
    ]
});

module.exports = mongoose.model("User", userSchema);
