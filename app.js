require("dotenv").config();

console.log("Google Client ID:", process.env.GOOGLE_CLIENT_ID);
console.log("Google Client Secret:", process.env.GOOGLE_CLIENT_SECRET);

const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcrypt");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const AppleStrategy = require("passport-apple").Strategy;
const dns = require("dns");
const multer = require("multer");

const app = express();
const port = process.env.PORT || 3000;
const saltRounds = 10;

// Define the email validation function
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Define the function to check if the email domain exists
function checkEmailDomain(email) {
  const domain = email.split("@")[1];

  return new Promise((resolve, reject) => {
    dns.resolveMx(domain, (err, addresses) => {
      if (err || addresses.length === 0) {
        reject(new Error("Invalid email domain"));
      } else {
        resolve(true);
      }
    });
  });
}

// Middleware Setup
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "views")));

// Session Setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === "production" }, // Use secure cookies in production
  })
);

app.use(passport.initialize());
app.use(passport.session());
// Initialize session middleware
app.use(session({ secret: 'your-secret-key', resave: false, saveUninitialized: true }));

// MySQL Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  database: "qcacac_pet_adoption",
});

db.connect((err) => {
  if (err) {
    console.error("MySQL Connection Error: ", err);
    throw err;
  }
  console.log("MySQL Connected...");
});

// Passport Configuration
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.query("SELECT * FROM users WHERE id = ?", [id], (err, results) => {
    done(err, results[0]);
  });
});

// Google OAuth Configuration
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    (accessToken, refreshToken, profile, done) => {
      db.query(
        "SELECT * FROM users WHERE google_id = ?",
        [profile.id],
        (err, results) => {
          if (err) return done(err);
          if (results.length > 0) {
            return done(null, results[0]);
          } else {
            const newUser = {
              google_id: profile.id,
              username: profile.displayName,
              email: profile.emails[0].value,
            };
            db.query("INSERT INTO users SET ?", newUser, (err, results) => {
              if (err) return done(err);
              newUser.id = results.insertId;
              return done(null, newUser);
            });
          }
        }
      );
    }
  )
);

// Facebook OAuth Configuration
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: "/auth/facebook/callback",
      profileFields: ["id", "displayName", "emails"],
    },
    (accessToken, refreshToken, profile, done) => {
      db.query(
        "SELECT * FROM users WHERE facebook_id = ?",
        [profile.id],
        (err, results) => {
          if (err) return done(err);
          if (results.length > 0) {
            return done(null, results[0]);
          } else {
            const newUser = {
              facebook_id: profile.id,
              username: profile.displayName,
              email: profile.emails[0].value,
            };
            db.query("INSERT INTO users SET ?", newUser, (err, results) => {
              if (err) return done(err);
              newUser.id = results.insertId;
              return done(null, newUser);
            });
          }
        }
      );
    }
  )
);

// Apple OAuth Configuration
passport.use(
  new AppleStrategy(
    {
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      privateKeyLocation: path.join(__dirname, "path/to/your/apple/key.p8"),
      callbackURL: "/auth/apple/callback",
    },
    (accessToken, refreshToken, idToken, profile, done) => {
      db.query(
        "SELECT * FROM users WHERE apple_id = ?",
        [profile.id],
        (err, results) => {
          if (err) return done(err);
          if (results.length > 0) {
            return done(null, results[0]);
          } else {
            const newUser = {
              apple_id: profile.id,
              username: profile.displayName,
              email: profile.emails[0].value,
            };
            db.query("INSERT INTO users SET ?", newUser, (err, results) => {
              if (err) return done(err);
              newUser.id = results.insertId;
              return done(null, newUser);
            });
          }
        }
      );
    }
  )
);

// Social Media Authentication Routes
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/profile");
  }
);

app.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);

app.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/profile");
  }
);

app.get("/auth/apple", passport.authenticate("apple"));

app.post(
  "/auth/apple/callback",
  passport.authenticate("apple", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/profile");
  }
);

// Serve index.html from views/user folder
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "user", "index.html"));
});

function validateEmail(email) {
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailPattern.test(email);
}

async function checkEmailDomain(email) {
  const domain = email.split('@')[1];
  try {
    const mxRecords = await dns.resolveMx(domain);
    return mxRecords.length > 0;
  } catch (error) {
    console.error('Error checking email domain:', error);
    return false;
  }
}

// Sign-Up Route
app.post("/signup", async (req, res) => {
  const { first_name, last_name, email, username, password, confirm_password, profile_pic } = req.body;

  // Check if passwords match
  if (password !== confirm_password) {
    return res.json({ error: "Passwords do not match." });
  }

  // Validate the email format
  if (!validateEmail(email)) {
    return res.json({ error: "Invalid email format." });
  }

  try {
    // Check if email already exists in the database
    db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.json({ error: "Server error." });
      }

      if (results.length > 0) {
        return res.json({ error: "Email already registered." });
      }

      // Calculate initials from first and last name
      const initials = (first_name.charAt(0) + last_name.charAt(0)).toUpperCase();

      // Hash the password
      const hashedPassword = bcrypt.hashSync(password, saltRounds);

      // Create a new user object
      const newUser = {
        first_name,
        last_name,
        email,
        username,
        password: hashedPassword,
        initials, // Include initials
        profile_pic: profile_pic || null, // Include profile_pic (default to null if not provided)
      };

      // Insert the new user into the database
      db.query("INSERT INTO users SET ?", newUser, (err) => {
        if (err) {
          console.error("Error inserting user:", err);
          return res.json({ error: "Server error." });
        }
        
        // Log successful registration
        console.log("User registration successful:", username);

        // Successful registration
        return res.json({ success: true, message: "Registration successful!" });
      });
    });
  } catch (error) {
    console.error("Error during signup:", error);
    return res.json({ error: "Server error." });
  }
});

// Sign-In Route
app.post("/signin", (req, res) => {
  const { email, password } = req.body;
  console.log(`Received email: ${email}, password: ${password}`);

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.json({ error: "server_error" });
      }

      if (results.length === 0) {
        console.log("Email not found:", email);
        return res.json({ error: "email_not_found" });
      }

      const user = results[0];
      console.log("User found:", user);

      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          console.error("Error comparing passwords:", err);
          return res.json({ error: "server_error" });
        }

        if (!isMatch) {
          console.log("Password does not match");
          return res.json({ error: "invalid_email_or_password" });
        }

        console.log("Password matches, login successful");
        req.session.user = {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username,
          profilePic: user.profile_pic, // Include profile picture URL
        };

        if (user.email === process.env.ADMIN_EMAIL) {
          req.session.isAdmin = true;
          return res.json({
            redirect: "/admin-dashboard",
            user: req.session.user // Include user details
          });
        } else {
          return res.json({
            redirect: "/petgallery",
            user: req.session.user // Include user details
          });
        }
      });
    }
  );
});


// Pet Gallery Route
app.get("/petgallery", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "user", "petgallery.html"));
});


// Admin Dashboard Route
app.get("/admin-dashboard", (req, res) => {
  if (req.session.isAdmin) {
    res.sendFile(
      path.join(__dirname, "views", "admin", "admin-dashboard.html")
    );
  } else {
    res.redirect("/");
  }
});

// Services Route
app.get("/services", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "user", "services.html"));
});

//QC Animal Pound Route
app.get("/QCAnimalPound", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "user", "QCAnimalPound.html"));
});

// Login Route
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "signin.html"));
});
// Route for the Cats section
app.get("/cats", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "user", "cats.html"));
});

app.get("/userprofile", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "user", "userprofile.html"));
});






/*ADMIN FILES ROUTE*/

// Admin Dashboard Route
app.get("/admin-dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "admin", "admin-dashboard.html"));
});

// Manage Pets Route
app.get("/manage-pets", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "admin", "manage-pets.html"));
});

// Edit Mainpage Content Route
app.get("/homepage-content", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "admin", "homepage-content.html"));
});

// Manage Lost Pet Reports Route
app.get("/manage-lost-pet-reports", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "admin", "manage-lost-pet-reports.html"));
});

// Manage Adoption Reports Route
app.get("/manage-adoption-reports", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "admin", "manage-adoption-reports.html"));
});



// Configure multer for file uploads
const upload = multer({ dest: path.join(__dirname, "upload_pet_images") });

// Serve static files in the upload_pet_images folder
app.use("/upload_pet_images", express.static(path.join(__dirname, "upload_pet_images")));
console.log("Static file server is set up for /upload_pet_images");

// Add Pet Route for Image Upload and Pet Details
app.post("/api/addPet", upload.single("petImage"), (req, res) => {
  const { petName, petBreed, petType, petGender, petAge } = req.body;
  const petImage = req.file ? req.file.filename : null;

  // Log the uploaded file path
  if (req.file) {
    console.log("Uploaded file path:", req.file.path);
  } else {
    console.log("No image uploaded.");
  }

  const sql = "INSERT INTO pets (PetName, PetBreed, pet_type, PetGender, PetAge, PetImage) VALUES (?, ?, ?, ?, ?, ?)";
  db.query(sql, [petName, petBreed, petType, petGender, petAge, petImage], (err, result) => {
      if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ error: "Failed to save pet details." });
      }

      console.log(`Successfully added pet: Name: ${petName}, Breed: ${petBreed}, Type: ${petType}, Gender: ${petGender}, Age: ${petAge}, Image: ${petImage}`);

      // Return the added pet details
      const addedPet = { PetName: petName, PetBreed: petBreed, pet_type: petType, PetGender: petGender, PetAge: petAge, PetImage: petImage };
      return res.json({ success: true, message: "Pet added successfully!", pet: addedPet });
  });
});

// Get Pets Route to Retrieve All Pet Entries
app.get("/api/getPets", (req, res) => {
  const sql = "SELECT * FROM pets";
  db.query(sql, (err, results) => {
      if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ error: "Failed to retrieve pets." });
      }
      res.json(results); // Send all pets as JSON response
  });
});


// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
