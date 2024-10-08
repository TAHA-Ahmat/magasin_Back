import express from 'express'; // Utilisez import au lieu de require
import dotenv from 'dotenv';
import connectDB from './config/db.js'; // Notez l'extension .js pour les imports locaux
import authRoutes from './routes/authRoutes.js';
// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware for parsing JSON
app.use(express.json());

// Utilisation des routes d'authentification sous /api/auth
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


export default app;