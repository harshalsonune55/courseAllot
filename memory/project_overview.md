---
name: CAS Project Overview
description: Course Allocation System — tech stack, models, routes, and feature status
type: project
---

Node/Express + MongoDB + EJS + Tailwind CSS app for university course allocation management.

Two roles: Faculty and HOD. AI-powered CV matching to courses.

**Key files:**
- `app.js` — all routes + data constants (COLLEGES, MULTIMEDIA_COURSES, CS_COURSES, ALL_COURSES)
- `models/User.js` — includes preferredCourses[], college, cvStatus
- `models/CourseRequest.js` — includes rejectionReason field

**Colleges:** Sciences, Computing & Informatics, Engineering, Business Administration
**Deans:** Nouar Tabet, Abbes Amira, Abdul Mohammad, Ilhan Ozturk

**Why:** Large feature update completed Apr 2026 covering notifications, colleges view, real course data (MM + CS), faculty preferences, reject-with-reason, dashboard cleanup.

**How to apply:** When working on new features, respect the existing route/view naming conventions and the two-layout system (layouts/main.ejs for faculty, layouts/hod-layout.ejs for HOD).
