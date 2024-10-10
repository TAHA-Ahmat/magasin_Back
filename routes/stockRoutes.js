import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js'; // Importer le middleware d'authentification
import roleMiddleware from '../middlewares/roleMiddleware.js'; // Importer le middleware de gestion des rôles
import { addStock, removeStock } from '../controllers/stockController.js'; // Importer le contrôleur de stock

const router = express.Router();

// Route pour ajouter des produits au stock (entrée de stock)
router.post('/entree', authMiddleware, roleMiddleware(['Magasinier']), addStock);

// Route pour retirer des produits du stock (sortie de stock)
router.post('/sortie', authMiddleware, roleMiddleware(['Magasinier']), removeStock);

export default router;
