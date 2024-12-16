import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const admin_password_correct = process.env.PASS_ADMIN;

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware to protect routes
const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Forbidden" });
    req.user = user;
    next();
  });
};

// Health check
app.get("/", (req, res) => {
  res.send("Portfolio API is running");
});

// User registration
app.post("/register", async (req, res) => {
  const { name, email, password, admin_password } = req.body;
  if (admin_password == admin_password_correct) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const { data, error } = await supabase
        .from("users")
        .insert([{ name, email, password: hashedPassword }]);

      if (error) throw error;
      res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
});

// User login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !data) throw new Error("User not found");

    const validPassword = await bcrypt.compare(password, data.password);
    if (!validPassword) throw new Error("Invalid credentials");

    const token = jwt.sign(
      { id: data.id, email: data.email },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );
    res.json({ token });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Fetch all portfolio items
app.get("/portfolio/look", async (req, res) => {
  try {
    const { data, error } = await supabase.from("portfolio_items").select("*");

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload image to Supabase Storage and add a new portfolio item
app.post(
  "/portfolio/add",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    const { coisas_adicionadas } = req.body;
    const file = req.file;

    try {
      if (!file) throw new Error("No image file provided");

      const uniqueFileName = `${uuidv4()}-${file.originalname}`;
      const { error: uploadError } = await supabase.storage
        .from("portfolio-images")
        .upload(uniqueFileName, file.buffer);

      if (uploadError) throw uploadError;

      const { publicURL } = supabase.storage
        .from("portfolio-images")
        .getPublicUrl(uniqueFileName);

      const { data, error } = await supabase
        .from("portfolio_items")
        .insert([{ coisas_adicionadas, image_url: publicURL }]);

      if (error) throw error;

      res.status(201).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete a portfolio item
app.delete("/portfolio/del/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from("portfolio_items")
      .delete()
      .match({ id });

    if (error) throw error;

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
