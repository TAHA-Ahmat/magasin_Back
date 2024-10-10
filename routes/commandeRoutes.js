import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js'; // Importer le middleware d'authentification
import roleMiddleware from '../middlewares/roleMiddleware.js'; // Importer le middleware de gestion des rôles
import { createCommande, getCommandes, validateCommande, updateCommande } from '../controllers/commandeController.js'; // Importer le contrôleur de commandes

const router = express.Router();

// Route pour créer une commande, nécessitant d'être authentifié et d'avoir le rôle de magasinier
router.post('/commandes', authMiddleware, roleMiddleware(['Magasinier']), createCommande);
// Route pour récupérer les commandes
router.get('/commandes', authMiddleware, getCommandes);
// Route pour valider une commande
router.post('/commandes/:id/validate', authMiddleware, roleMiddleware(['Comptable']), validateCommande);
// Route pour mettre à jour une commande
router.put('/commandes/:id/update', authMiddleware, roleMiddleware(['Magasinier']), updateCommande);

export default router;
