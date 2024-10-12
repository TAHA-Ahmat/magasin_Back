import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';  // Middleware pour vérifier l'authentification
import roleMiddleware from '../middlewares/roleMiddleware.js';  // Middleware pour vérifier les rôles des utilisateurs
import { 
  createCommande, 
  getCommandes, 
  validateCommande, 
  updateCommande, 
  getCommandesHistorique, 
  getCommandesArchivees,
  generateCommandePDF,      // Route pour générer un PDF du bon validé (US 5)
  generateCommandeExcel,     // Route pour générer un fichier Excel du bon validé (nouveau)
  generateRapportParPeriode, // Génération de rapports par période
  getStatistiquesBons,       // Générer des statistiques pour les bons
  getStatistiquesCommandes   // Générer des statistiques pour les commandes
} from '../controllers/commandeController.js';

import multer from 'multer';  // Importer multer
import ExcelJS from 'exceljs'; // Importer ExcelJS pour la gestion des fichiers Excel

const router = express.Router();

// Configuration de multer pour stocker les fichiers dans un dossier local
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');  // Le dossier où les fichiers seront stockés
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Routes principales
router.post('/commandes', authMiddleware, roleMiddleware(['Magasinier']), createCommande);
router.get('/commandes', authMiddleware, getCommandes);
router.post('/commandes/:id/validate', authMiddleware, roleMiddleware(['Comptable']), validateCommande);
router.put('/commandes/:id/update', authMiddleware, roleMiddleware(['Magasinier']), updateCommande);
router.get('/historique', authMiddleware, roleMiddleware(['Magasinier']), getCommandesHistorique);
router.get('/archives', authMiddleware, roleMiddleware(['Comptable']), getCommandesArchivees);

// Routes pour la génération des rapports et des fichiers
router.get('/commandes/:id/pdf', authMiddleware, roleMiddleware(['Magasinier', 'Comptable']), generateCommandePDF);
router.get('/commandes/:id/excel', authMiddleware, roleMiddleware(['Magasinier', 'Comptable']), generateCommandeExcel);
router.get('/rapports', authMiddleware, roleMiddleware(['Direction']), generateRapportParPeriode);
router.get('/statistiques-bons', authMiddleware, roleMiddleware(['Comptable']), getStatistiquesBons);
router.get('/statistiques-commandes', authMiddleware, roleMiddleware(['Magasinier']), getStatistiquesCommandes);

// Route pour uploader un bon de commande (exemple d'upload de fichier)
router.post('/upload-bon-commande', authMiddleware, roleMiddleware(['Comptable']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier n\'a été téléchargé.' });
    }

    // Logique après téléchargement du fichier (par exemple, traitement du fichier)
    res.status(200).json({ success: true, message: 'Fichier téléchargé avec succès', file: req.file });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur lors du téléchargement du fichier', error: err.message });
  }
});

// Route pour récupérer les commandes archivées
router.get('/archivees', authMiddleware, roleMiddleware(['Comptable']), async (req, res) => {
  const { dateDebut, dateFin } = req.query;

  try {
    const filters = { statut: 'Validée' };

    if (dateDebut && dateFin) {
      filters.date_archivage = { $gte: new Date(dateDebut), $lte: new Date(dateFin) };
    }

    const commandesArchivees = await Commande.find(filters);
    res.status(200).json({ success: true, commandesArchivees });
  } catch (err) {
    handleError(res, err, 'Erreur lors de la récupération des commandes archivées.');
  }
});

export default router;
