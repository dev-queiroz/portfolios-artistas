const express = require("express");
const router = express.Router();
const supabase = require("../db/supabaseClient");
const multer = require("multer");

// Configuração do Multer para tratar o upload do arquivo
const upload = multer({ storage: multer.memoryStorage() });

// 📤 Upload de imagem e criação de nova arte
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { title, description } = req.body;
    const imageFile = req.file;

    // Fazendo o upload para o Supabase Storage
    const fileName = `${Date.now()}_${imageFile.originalname}`;
    const { data, error } = await supabase.storage
      .from("art-images")
      .upload(fileName, imageFile.buffer, {
        contentType: imageFile.mimetype,
      });

    if (error) throw error;

    const imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/art-images/${data.path}`;

    // Inserindo a nova arte no banco de dados através do Supabase
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

// 📝 GET todas as artes
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase.from("arts").select("*");

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📥 GET uma arte por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("arts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✏️ UPDATE arte por ID
router.put("/:id", async (req, res) => {
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

// ❌ DELETE arte por ID
router.delete("/:id", async (req, res) => {
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
