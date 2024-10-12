import express from 'express'; // Importer Express
const router = express.Router(); // Utilisation de express.Router()
import authMiddleware from '../middlewares/authMiddleware.js'; // Importer le middleware d'authentification
import roleMiddleware from '../middlewares/roleMiddleware.js'; // Importer le middleware de gestion des rôles
import { registerAdmin, createUser } from '../controllers/authController.js'; // Importer les contrôleurs
import { loginUser } from '../controllers/authController.js'; // Importer les contrôleurs

import { updateUserRole } from '../controllers/authController.js';




// Route de connexion utilisateur
router.post('/login', loginUser);

//Route pour attribuer/modifier un rôle 
router.put('/user/:id/role', authMiddleware, roleMiddleware(['Administrateur']), updateUserRole);

// Route d'inscription pour un administrateur (première fois seulement)
router.post('/register-admin', registerAdmin);

// Route pour permettre à l'administrateur de créer des utilisateurs
router.post('/create-user', authMiddleware, roleMiddleware(['Administrateur']), createUser); 


export default router;
