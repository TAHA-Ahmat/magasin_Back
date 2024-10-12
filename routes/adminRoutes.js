import express from 'express';
import { updateUserRole, getUsers } from '../controllers/authController.js'; // Importer les contrôleurs pour la gestion des utilisateurs et des rôles
import { getActivityLog } from '../controllers/activityLogController.js';  // Importer le contrôleur pour la gestion des logs d'activité
import authMiddleware from '../middlewares/authMiddleware.js';  // Middleware pour l'authentification
import roleMiddleware from '../middlewares/roleMiddleware.js';  // Middleware pour la gestion des rôles

const router = express.Router();

// Route pour obtenir la liste des utilisateurs (visible uniquement par l'administrateur)
router.get('/users', authMiddleware, roleMiddleware(['Administrateur']), getUsers);

// Route pour modifier le rôle d'un utilisateur (réservé à l'administrateur)
router.put('/user/:id/role', authMiddleware, roleMiddleware(['Administrateur']), updateUserRole);

// Route pour consulter le journal des actions des utilisateurs (visible uniquement par l'administrateur)
router.get('/logs', authMiddleware, roleMiddleware(['Administrateur']), getActivityLog);



export default router;
