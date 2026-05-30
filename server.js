require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, "database.json");

app.use(cors());
app.use(express.json());

// 🛢️ MONGODB CONNECTION — same database ng Barangay MIS
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to Barangay MIS MongoDB Atlas."))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ⚙️ JSON FILE INITIALIZATION (para sa officials, blotter, 4ps, accounts)
const dbDir = path.dirname(DB_FILE);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
if (!fs.existsSync(DB_FILE)) {
  const cleanSchema = {
    users: [{ userId: "ACC-001", fullName: "System Administrator", username: "admin", role: "Admin", status: "Active", passwordPreview: "admin123" }],
    officials: [],
    fourPs: [],
    blotter: [],
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(cleanSchema, null, 2), "utf8");
}

const readDatabase = () => JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
const writeDatabase = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");


// ==========================================
// 🔐 LAYER 1: AUTHENTICATION
// ==========================================
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const inputId = (username || "").trim();
  const inputPass = (password || "").toString().trim().toLowerCase();

  console.log("[LOGIN ATTEMPT] ID:", inputId);

  // 1. ADMIN BYPASS (mula sa database.json)
  if (inputId === "admin" && password === "admin123") {
    return res.status(200).json({
      success: true,
      user: { fullName: "System Administrator", username: "admin", role: "Admin", purok: "Executive Office" }
    });
  }

  // 2. JSON FILE USERS (secretary, etc.)
  try {
    const db = readDatabase();
    const localUser = db.users.find(
      (u) => u.username === inputId && u.passwordPreview === password
    );
    if (localUser) {
      return res.status(200).json({
        success: true,
        user: { fullName: localUser.fullName, username: localUser.username, role: localUser.role, purok: "Executive Office" }
      });
    }
  } catch (err) {
    console.error("JSON DB read error:", err);
  }

  // 3. ✅ RESIDENT LOGIN — kukunin mula sa MongoDB ng Barangay MIS
  try {
    const db = mongoose.connection.db;
    
    // Case-insensitive search sa residentId
    const resident = await db.collection("residents").findOne({
      residentId: { $regex: new RegExp(`^${inputId.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, "i") }
    });

    if (!resident) {
      return res.status(404).json({ success: false, message: "Resident ID not found. Please contact the Barangay." });
    }

    const dbPass = (resident.password || "").toString().trim().toLowerCase();

    console.log("[RESIDENT LOGIN] Found:", resident.residentId);
    console.log("[RESIDENT LOGIN] DB Pass:", dbPass, "| Input Pass:", inputPass);

    if (!dbPass) {
      return res.status(401).json({ success: false, message: "No password set for this account. Please contact the Barangay." });
    }

    if (dbPass !== inputPass) {
      return res.status(401).json({ success: false, message: "Incorrect password. Please try again." });
    }

    return res.status(200).json({
      success: true,
      user: {
        residentId: resident.residentId,
        fullName: resident.fullName || `${resident.firstName} ${resident.lastName}`,
        role: resident.role || "Resident",
        purok: resident.zoneAssignment || resident.purok || "Zone I"
      }
    });

  } catch (err) {
    console.error("MongoDB resident lookup error:", err);
    return res.status(500).json({ success: false, message: "Authentication engine crash.", error: err.message });
  }
});


// ==========================================
// 👔 LAYER 2: OFFICIALS
// ==========================================
app.get("/api/officials", (req, res) => {
  const db = readDatabase();
  res.status(200).json(db.officials || []);
});

app.post("/api/officials", (req, res) => {
  const { fullName, position, termStart, termEnd, contactNumber, status } = req.body;
  const db = readDatabase();
  const mappedOfficial = { name: fullName, position, termStart, termEnd, contact: contactNumber, active: status };
  if (!db.officials) db.officials = [];
  db.officials.push(mappedOfficial);
  writeDatabase(db);
  res.status(201).json({ message: "Official profile appended successfully.", record: mappedOfficial });
});


// ==========================================
// 🏅 LAYER 3: 4PS
// ==========================================
app.get("/api/four-ps", (req, res) => {
  const db = readDatabase();
  res.status(200).json(db.fourPs || []);
});

app.post("/api/four-ps", (req, res) => {
  const { fourPsId, householdHead, address, purok, status, remarks, registeredDate } = req.body;
  const db = readDatabase();
  const formattedAddress = `${purok.replace("urok ", "-")} ${address}`;
  const mappedHousehold = {
    id: fourPsId, head: householdHead, address: formattedAddress,
    status, remarks: remarks || "Active Enrollment Index",
    registeredDate: registeredDate || new Date().toISOString().split("T")[0]
  };
  if (!db.fourPs) db.fourPs = [];
  db.fourPs.push(mappedHousehold);
  writeDatabase(db);
  res.status(201).json({ message: "Household matrix linked successfully.", record: mappedHousehold });
});


// ==========================================
// ⚖️ LAYER 4: BLOTTER
// ==========================================
app.get("/api/blotter", (req, res) => {
  const db = readDatabase();
  res.status(200).json(db.blotter || []);
});

app.post("/api/blotter", (req, res) => {
  const { complainantName, respondentName, incidentType, incidentDate, incidentDetails, caseStatus } = req.body;
  const db = readDatabase();
  if (!db.blotter) db.blotter = [];
  const generatedCaseId = `BLTR-2026-00${db.blotter.length + 1}`;
  const mappedCase = {
    caseId: generatedCaseId, complainant: complainantName, respondent: respondentName,
    type: incidentType, date: incidentDate || new Date().toISOString().split("T")[0],
    status: caseStatus, details: incidentDetails
  };
  db.blotter.push(mappedCase);
  writeDatabase(db);
  res.status(201).json({ message: "Incident record logged permanently.", record: mappedCase });
});

app.put("/api/blotter/:id", (req, res) => {
  const { id } = req.params;
  const { complainantName, respondentName, incidentType, incidentDate, incidentDetails, caseStatus } = req.body;
  const db = readDatabase();
  if (!db.blotter) db.blotter = [];
  const caseIndex = db.blotter.findIndex((item) => item.caseId === id);
  if (caseIndex === -1) return res.status(404).json({ error: "Blotter record not found." });
  db.blotter[caseIndex] = { ...db.blotter[caseIndex], complainant: complainantName, respondent: respondentName, type: incidentType, date: incidentDate, status: caseStatus, details: incidentDetails };
  writeDatabase(db);
  res.status(200).json({ message: "Incident log updated.", record: db.blotter[caseIndex] });
});

app.delete("/api/blotter/:id", (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  if (!db.blotter) db.blotter = [];
  const initialCount = db.blotter.length;
  db.blotter = db.blotter.filter((item) => item.caseId !== id);
  if (db.blotter.length === initialCount) return res.status(404).json({ error: "Record not found." });
  writeDatabase(db);
  res.status(200).json({ message: "Blotter record purged successfully." });
});


// ==========================================
// 🔐 LAYER 5: ACCOUNTS
// ==========================================
app.get("/api/accounts", (req, res) => {
  const db = readDatabase();
  res.status(200).json(db.users || []);
});

app.post("/api/accounts", (req, res) => {
  const { fullName, username, password, role, status } = req.body;
  const db = readDatabase();
  if (!db.users) db.users = [];
  const generatedAccountId = `ACC-00${db.users.length + 1}`;
  const mappedAccount = { userId: generatedAccountId, fullName, username, role, status, passwordPreview: password };
  db.users.push(mappedAccount);
  writeDatabase(db);
  res.status(201).json({ message: "User profile provisioned.", record: mappedAccount });
});

app.delete("/api/accounts/:id", (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  if (!db.users) db.users = [];
  const initialCount = db.users.length;
  db.users = db.users.filter((user) => user.userId !== id);
  if (db.users.length === initialCount) return res.status(404).json({ error: "User not found." });
  writeDatabase(db);
  res.status(200).json({ message: "User profile deleted." });
});


// ==========================================
// 🚀 SERVER BOOT
// ==========================================
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`[SERVER] Running on port: ${PORT}`);
  console.log(`[STORAGE] JSON file: ${DB_FILE}`);
  console.log(`[DATABASE] MongoDB: Barangay MIS Atlas`);
  console.log(`===================================================`);
});