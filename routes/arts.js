const express = require("express");
const router = express.Router();
const supabase = require("../db/supabaseClient");
const multer = require("multer");
require("dotenv").config();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const authenticate = (req, res, next) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res
      .status(403)
      .json({ error: "Senha incorreta. Ação não autorizada." });
  }
  next();
};

const upload = multer({ storage: multer.memoryStorage() });

router.post("/", authenticate, upload.single("image"), async (req, res) => {
  try {
    const { title, description } = req.body;
    const imageFile = req.file;

    const fileName = `${Date.now()}_${imageFile.originalname}`;
    const { data, error } = await supabase.storage
      .from("art-images")
      .upload(fileName, imageFile.buffer, {
        contentType: imageFile.mimetype,
      });

    if (error) throw error;

    const imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/art-images/${data.path}`;

    const { data: art, error: insertError } = await supabase
      .from("arts")
      .insert([{ title, image_url: imageUrl, description }])
      .single();

    if (insertError) throw insertError;

    res.json(art);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase.from("arts").select("*");

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, image_url, description } = req.body;
    const { data, error } = await supabase
      .from("arts")
      .update({ title, image_url, description })
      .eq("id", id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("arts").delete().eq("id", id);

    if (error) throw error;

    res.json({ message: "Arte deletada com sucesso" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
