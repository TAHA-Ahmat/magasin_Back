import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js'; // Importer le middleware d'authentification
import roleMiddleware from '../middlewares/roleMiddleware.js'; // Importer le middleware de gestion des rôles
import { createCommande } from '../controllers/commandeController.js'; // Importer le contrôleur de commandes

const router = express.Router();

// Route pour créer une commande, nécessitant d'être authentifié et d'avoir le rôle de magasinier
router.post('/commandes', authMiddleware, roleMiddleware(['Magasinier']), createCommande);

export default router;
