const express = require("express");
const cors = require("cors");
const artsRoutes = require("./routes/arts");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rotas de artes
app.use("/api/arts", artsRoutes);

// Rota para ping
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Iniciando o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
