import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import commandeRoutes from './routes/commandeRoutes.js'; // Importer les routes de commande

dotenv.config();
connectDB();

const app = express();
app.use(express.json());

// Utilisation des routes
app.use('/api/auth', authRoutes);
app.use('/api/commandes', commandeRoutes); // Ajouter les routes de commande

const PORT = process.env.PORT || 5000;
const TEST_PORT = process.env.TEST_PORT || 5001;

const portToUse = process.env.NODE_ENV === 'test' ? TEST_PORT : PORT;

app.listen(portToUse, () => {
  console.log(`Server running on port ${portToUse}`);
});

export default app;
