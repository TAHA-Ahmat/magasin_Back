const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes'); // Importer les routes d'authentification

// Charger les variables d'environnement
dotenv.config();

// Connexion à MongoDB
connectDB();

const app = express();

// Middleware pour le parsing JSON
app.use(express.json());

// Utiliser les routes d'authentification
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});
