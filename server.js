// backend/server.js
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

// 🚀 CLOUD PORT SELECTION: Ginawa nating dynamic para kay Render, default sa 5000 kung local dev.
const PORT = process.env.PORT || 5000;

// 📁 PERMANENT RENDER STORAGE PATH:
// Kapag nasa Render, gagamitin nito ang '/data/database.json' para hindi mabura ang data mo kahit mag-restart ang server.
// 📁 RENDER FREE TIER STORAGE PATH:
// Gagamitin natin ang kasalukuyang directory para iwas permission error
const DB_FILE = path.join(__dirname, "database.json");

// Core Structural Middleware Configurations
app.use(cors());
app.use(express.json());

// ⚙️ INITIALIZATION LOGIC: Production Clean Slate with Locked Master Admin Key
// Siguraduhing may access sa folder bago gumawa ng file (Para sa Render Persistent Disk)
const dbDir = path.dirname(DB_FILE);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

if (!fs.existsSync(DB_FILE)) {
  const cleanSchema = {
    // Tanging ang master admin account lang ang pre-configured para may pang-login ka, gar!
    users: [
      { 
        userId: "ACC-001", 
        fullName: "System Administrator", 
        username: "admin", 
        role: "Admin", 
        status: "Active", 
        passwordPreview: "admin123" 
      }
    ],
    // Lahat ng operational registries ay ginawa nating blangko para mano-mano ang encoding
    officials: [],
    fourPs: [],
    blotter: [],
    residents: [] // Naka-ready na rin sakaling may hiwalay kang data layer para sa residents
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(cleanSchema, null, 2), "utf8");
}

// Helper Routine: Read Unified Data Object From Disk
const readDatabase = () => {
  const fileData = fs.readFileSync(DB_FILE, "utf8");
  return JSON.parse(fileData);
};

// Helper Routine: Persist Unified Data Object Back to Disk Storage
const writeDatabase = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
};


// ==========================================
// 🔐 ROUTE ROUTINE Layer 1: Access Authentication Core (UNIVERSAL BYPASS ENABLED)
// ==========================================
app.post("/api/auth/login", (req, res) => {
  const { username, password, role } = req.body;
  
  console.log("[LOGIN ATTEMPT]:", { username, password, role });

  // Master Token Validation Check: Papasukin ka nito kahit anong role ang i-select mo
  if (username === "admin" && password === "admin123") {
    return res.status(200).json({
      message: "Universal bypass authentication handshake cleared successfully.",
      user: {
        fullName: "System Administrator Master",
        username: "admin",
        role: role || "Admin"
      }
    });
  }

  // Database Fallback Authentication Scan
  try {
    const db = readDatabase();
    const authenticatedUser = db.users.find(
      (u) => u.username === username && u.passwordPreview === password
    );

    if (authenticatedUser) {
      return res.status(200).json({
        message: "Database authentication cleared successfully.",
        user: {
          fullName: authenticatedUser.fullName,
          username: authenticatedUser.username,
          role: authenticatedUser.role
        }
      });
    }
  } catch (err) {
    console.error("Database reading execution warning:", err);
  }

  return res.status(401).json({ error: "Invalid operational identity credentials provided." });
});


// ==========================================
// 👔 ROUTE ROUTINE Layer 2: Barangay Officials Registry
// ==========================================
app.get("/api/officials", (req, res) => {
  const db = readDatabase();
  res.status(200).json(db.officials || []);
});

app.post("/api/officials", (req, res) => {
  const { fullName, position, termStart, termEnd, contactNumber, status } = req.body;
  const db = readDatabase();

  const mappedOfficial = {
    name: fullName,
    position,
    termStart,
    termEnd,
    contact: contactNumber,
    active: status
  };

  if (!db.officials) db.officials = [];
  db.officials.push(mappedOfficial);
  writeDatabase(db);

  res.status(201).json({ message: "Official profile appended successfully.", record: mappedOfficial });
});


// ==========================================
// 🏅 ROUTE ROUTINE Layer 3: 4Ps Social Welfare Matrix
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
    id: fourPsId,
    head: householdHead,
    address: formattedAddress,
    status,
    remarks: remarks || "Active Enrollment Index",
    registeredDate: registeredDate || new Date().toISOString().split("T")[0]
  };

  if (!db.fourPs) db.fourPs = [];
  db.fourPs.push(mappedHousehold);
  writeDatabase(db);

  res.status(201).json({ message: "Household matrix linked successfully.", record: mappedHousehold });
});


// ==========================================
// ⚖️ ROUTE ROUTINE Layer 4: Peace & Order Blotter Module
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
    caseId: generatedCaseId,
    complainant: complainantName,
    respondent: respondentName,
    type: incidentType,
    date: incidentDate || new Date().toISOString().split("T")[0],
    status: caseStatus,
    details: incidentDetails
  };

  db.blotter.push(mappedCase);
  writeDatabase(db);

  res.status(201).json({ message: "Incident record logged permanently.", record: mappedCase });
});

// 📝 UPDATED ROUTINE: Edit/Update existing blotter case configuration by ID
app.put("/api/blotter/:id", (req, res) => {
  const { id } = req.params;
  const { complainantName, respondentName, incidentType, incidentDate, incidentDetails, caseStatus } = req.body;
  const db = readDatabase();

  if (!db.blotter) db.blotter = [];
  const caseIndex = db.blotter.findIndex((item) => item.caseId === id);

  if (caseIndex === -1) {
    return res.status(404).json({ error: "Blotter record sequence not found inside localized cluster." });
  }

  db.blotter[caseIndex] = {
    ...db.blotter[caseIndex],
    complainant: complainantName,
    respondent: respondentName,
    type: incidentType,
    date: incidentDate,
    status: caseStatus,
    details: incidentDetails
  };

  writeDatabase(db);
  res.status(200).json({ message: "Incident log updated permanently.", record: db.blotter[caseIndex] });
});

// 🗑️ UPDATED ROUTINE: Safely purge a specific blotter logging track by ID
app.delete("/api/blotter/:id", (req, res) => {
  const { id } = req.params;
  const db = readDatabase();

  if (!db.blotter) db.blotter = [];
  const initialCount = db.blotter.length;
  db.blotter = db.blotter.filter((item) => item.caseId !== id);

  if (db.blotter.length === initialCount) {
    return res.status(404).json({ error: "Record sequence target not found." });
  }

  writeDatabase(db);
  res.status(200).json({ message: "Blotter record safely purged from storage logs." });
});


// ==========================================
// 🔐 ROUTE ROUTINE Layer 5: Identity Access Credentials Control
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
  const mappedAccount = {
    userId: generatedAccountId,
    fullName,
    username,
    role,
    status,
    passwordPreview: password
  };

  db.users.push(mappedAccount);
  writeDatabase(db);

  res.status(201).json({ message: "Security user profile provisioned successfully.", record: mappedAccount });
});


// ==========================================
// 🗑️ SECURITY DE-PROVISIONING: Delete User Profile
// ==========================================
app.delete("/api/accounts/:id", (req, res) => {
  const { id } = req.params;
  const db = readDatabase();

  if (!db.users) db.users = [];
  const initialCount = db.users.length;
  db.users = db.users.filter((user) => user.userId !== id);

  if (db.users.length === initialCount) {
    return res.status(404).json({ error: "User record index sequence not found inside cluster logs." });
  }

  writeDatabase(db);
  res.status(200).json({ message: "Security user clearance index dropped successfully from database tracks." });
});


// ==========================================
// 🚀 SERVER BOOT TRIGGER
// ==========================================
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`[SERVER INITIATED] Running smoothly on port: ${PORT}`);
  console.log(`[DATA CHANNEL] Unified localized storage stream bound to JSON file.`);
  console.log(`===================================================`);
});