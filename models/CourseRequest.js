const mongoose = require("mongoose");

const courseRequestSchema = new mongoose.Schema({
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    courseName: {
      type: String,
      required: true
    },
    comment: String, 
    matchScore: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING"
    }
  }, { timestamps: true });   
  

module.exports = mongoose.model("CourseRequest", courseRequestSchema);
