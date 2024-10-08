import express from 'express'; // Importer Express
const router = express.Router(); // Utilisation de express.Router()
import authMiddleware from '../middlewares/authMiddleware.js'; // Importer le middleware d'authentification
import roleMiddleware from '../middlewares/roleMiddleware.js'; // Importer le middleware de gestion des rôles
import { registerUser, loginUser } from '../controllers/authController.js'; // Importer les contrôleurs


// Route pour enregistrer un nouvel utilisateur
router.post('/register', registerUser);

// Route de connexion utilisateur
router.post('/login', loginUser);


export default router;
