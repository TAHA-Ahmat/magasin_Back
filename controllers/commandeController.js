import Commande from '../models/commandeModel.js';
import Produit from '../models/produitModel.js';
import JournalCommande from '../models/journalCommandeModel.js';
import { sendNotification } from '../services/notificationService.js';  // Importer le service de notification
import PDFDocument from 'pdfkit';  // Importer pdfkit pour générer des PDF
import ExcelJS from 'exceljs';     // Importer exceljs pour générer des fichiers Excel
import { logUserActivity } from './activityLogController.js';  // Importer la fonction de journalisation


// Middleware pour gérer les erreurs
const handleError = (res, err, message = 'Erreur inconnue') => {
  console.error(err); // Affiche l'erreur dans la console pour le débogage
  return res.status(500).json({ success: false, message, error: err.message });
};

// Créer une commande
export const createCommande = async (req, res) => {
  const { produits } = req.body; // Obtenir les produits de la requête

  try {
    // Parcours des produits pour générer des identifiants si nécessaire
    const produitsAvecId = await Promise.all(
      produits.map(async (produit) => {
        if (!produit.produit_id) {
          // Si aucun identifiant de produit n'est fourni, créer un nouveau produit avec un identifiant généré automatiquement
          const nouveauProduit = new Produit({
            nom: produit.nom,
            prix: produit.prix || null, // Le prix est facultatif
            seuil_critique: produit.seuil_critique || 0, // Défaut pour seuil critique
          });
          await nouveauProduit.save();
          produit.produit_id = nouveauProduit._id; // Utiliser l'ID généré
        }
        return produit;
      })
    );

    // Créer une nouvelle commande
    const commande = new Commande({
      id_utilisateur: req.user.id, // ID de l'utilisateur connecté
      produits: produitsAvecId,
      statut: 'Soumise', // Définir le statut à 'Soumise' lors de la création
    });

    await commande.calculerMontantTotal(); // Calculer le montant total avec les prix renseignés (ou 0 si non renseigné)
    await commande.save(); // Enregistrer la commande dans la base de données

    // Journaliser la création de la commande
    await logUserActivity(req.user.id, 'Création de commande', `Commande ID: ${commande._id}`);


    res.status(201).json({ success: true, message: 'Commande créée avec succès', commande });
  } catch (err) {
    handleError(res, err, 'Erreur lors de la création de la commande');
  }
};


// Récupérer les commandes
export const getCommandes = async (req, res) => {
  const userId = req.user.id; // ID de l'utilisateur connecté
  try {
    const role = req.user.role;
    let commandes;

    if (role === 'Magasinier') {
      commandes = await Commande.find({ id_utilisateur: userId });
    } else if (role === 'Comptable') {
      commandes = await Commande.find({ statut: 'Soumise' });
    } else {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    res.status(200).json({ success: true, commandes });
  } catch (err) {
    handleError(res, err, 'Erreur lors de la récupération des commandes');
  }
};


// US 10 : Consultation de l'historique des commandes pour le magasinier
export const getCommandesHistorique = async (req, res) => {
  const { statut, produit, dateDebut, dateFin } = req.query; // Filtrage par statut, produit ou période

  try {
    const filters = { id_utilisateur: req.user.id }; // Filtrer uniquement par les commandes du magasinier connecté

    // Ajouter des filtres dynamiques en fonction des paramètres fournis
    if (statut) filters.statut = statut;
    if (produit) filters['produits.produit_id'] = produit; // Filtrer par produit
    if (dateDebut && dateFin) {
      filters.date_creation = { $gte: new Date(dateDebut), $lte: new Date(dateFin) };
    }

    const commandes = await Commande.find(filters);

    res.status(200).json({ success: true, commandes });
  } catch (err) {
    handleError(res, err, 'Erreur lors de la récupération de l\'historique des commandes');
  }
};

// US 11 : Consultation des bons de commande archivés pour le comptable
export const getCommandesArchivees = async (req, res) => {
  const { statut, produit, dateDebut, dateFin } = req.query; // Filtrage par statut, produit ou période

  try {
    const filters = { statut: 'Validée' }; // Seules les commandes validées sont considérées comme archivées

    // Ajouter des filtres dynamiques en fonction des paramètres fournis
    if (statut) filters.statut = statut;
    if (produit) filters['produits.produit_id'] = produit; // Filtrer par produit
    if (dateDebut && dateFin) {
      filters.date_creation = { $gte: new Date(dateDebut), $lte: new Date(dateFin) };
    }

    const commandes = await Commande.find(filters);

    res.status(200).json({ success: true, commandes });
  } catch (err) {
    handleError(res, err, 'Erreur lors de la récupération des bons archivés');
  }
};


// Mettre à jour une commande
export const updateCommande = async (req, res) => {
  const { id } = req.params; // Récupérer l'ID de la commande depuis les paramètres
  const { produits } = req.body; // Obtenir les nouveaux produits de la requête

  try {
    const commande = await Commande.findById(id);
    if (!commande) {
      return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    }

    if (commande.statut !== 'Soumise' && commande.statut !== 'Rejetée') {
      return res.status(400).json({ success: false, message: 'La commande ne peut pas être modifiée' });
    }

    commande.produits = produits; // Mettre à jour les produits de la commande
    await commande.calculerMontantTotal(); // Recalculer le montant total
    await commande.save(); // Enregistrer les modifications

    res.status(200).json({ success: true, message: 'Commande mise à jour avec succès', commande });
  } catch (err) {
    handleError(res, err, 'Erreur lors de la mise à jour de la commande');
  }
};



// Méthode pour générer un PDF du bon de commande validé (US 5)
export const generateCommandePDF = async (req, res) => {
  const { id } = req.params;

  try {
    // Récupérer la commande par son ID
    const commande = await Commande.findById(id).populate('produits.produit_id');

    if (!commande) {
      return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    }

    if (commande.statut !== 'Validée') {
      return res.status(400).json({ success: false, message: 'Seules les commandes validées peuvent être imprimées.' });
    }

    // Créer un document PDF
    const doc = new PDFDocument();
    const fileName = `commande_${commande._id}.pdf`;

    // Configurer la réponse HTTP pour télécharger le fichier PDF
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.setHeader('Content-Type', 'application/pdf');

    // Pipe du document PDF vers la réponse HTTP
    doc.pipe(res);

    // Ajouter le contenu au PDF
    doc.fontSize(20).text('Bon de commande validé', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Numéro de commande : ${commande._id}`);
    doc.text(`Date de création : ${commande.date_creation.toLocaleDateString()}`);
    doc.text(`Date de validation : ${commande.date_validation ? commande.date_validation.toLocaleDateString() : 'Non validée'}`);
    doc.moveDown();
    doc.fontSize(16).text('Produits commandés :');
    
    // Lister les produits dans la commande
    commande.produits.forEach((produit, index) => {
      doc.fontSize(12).text(`${index + 1}. ${produit.produit_id.nom} - Quantité : ${produit.quantite} - Prix : ${produit.produit_id.prix || 'N/A'} FCFA`);
    });

    doc.moveDown();
    doc.fontSize(14).text(`Montant total : ${commande.montant_total} FCFA`);
    
    // Ajouter les informations sur le magasinier et le comptable
    doc.moveDown();
    doc.text(`Magasinier : ${req.user.nom}`);
    doc.text(`Comptable : ${commande.comptable_nom || 'Non renseigné'}`);

    // Terminer la création du PDF
    doc.end();
  } catch (err) {
    handleError(res, err, 'Erreur lors de la génération du PDF');
  }
};



// Méthode pour générer un fichier Excel du bon de commande validé (US 5)
export const generateCommandeExcel = async (req, res) => {
  const { id } = req.params;

  try {
    // Récupérer la commande par son ID
    const commande = await Commande.findById(id).populate('produits.produit_id');

    if (!commande) {
      return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    }

    if (commande.statut !== 'Validée') {
      return res.status(400).json({ success: false, message: 'Seules les commandes validées peuvent être exportées en Excel.' });
    }

    // Créer un nouveau classeur Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Commande ${commande._id}`);

    // Ajouter des colonnes
    sheet.columns = [
      { header: 'Numéro de commande', key: 'commandeId', width: 30 },
      { header: 'Nom du produit', key: 'produitNom', width: 30 },
      { header: 'Quantité', key: 'quantite', width: 10 },
      { header: 'Prix unitaire (FCFA)', key: 'prix', width: 15 },
      { header: 'Montant total (FCFA)', key: 'total', width: 15 },
    ];

    // Remplir la première ligne (numéro de commande et date)
    sheet.addRow({
      commandeId: commande._id,
      produitNom: 'Numéro de commande',
      quantite: '',
      prix: '',
      total: '',
    });

    sheet.addRow({
      commandeId: commande._id,
      produitNom: `Date de création : ${commande.date_creation.toLocaleDateString()}`,
      quantite: '',
      prix: '',
      total: '',
    });

    sheet.addRow({
      commandeId: commande._id,
      produitNom: `Date de validation : ${commande.date_validation ? commande.date_validation.toLocaleDateString() : 'Non validée'}`,
      quantite: '',
      prix: '',
      total: '',
    });

    sheet.addRow({});  // Ajouter une ligne vide

    // Ajouter les informations sur les produits commandés
    commande.produits.forEach((produit) => {
      sheet.addRow({
        commandeId: '',
        produitNom: produit.produit_id.nom,
        quantite: produit.quantite,
        prix: produit.produit_id.prix || 'N/A',
        total: (produit.quantite * produit.produit_id.prix) || 0,
      });
    });

    sheet.addRow({});  // Ajouter une ligne vide

    // Ajouter le montant total
    sheet.addRow({
      commandeId: '',
      produitNom: 'Montant total',
      quantite: '',
      prix: '',
      total: commande.montant_total,
    });

    // Ajouter les informations du magasinier et du comptable
    sheet.addRow({
      commandeId: '',
      produitNom: `Magasinier : ${req.user.nom}`,
      quantite: '',
      prix: '',
      total: '',
    });

    sheet.addRow({
      commandeId: '',
      produitNom: `Comptable : ${commande.comptable_nom || 'Non renseigné'}`,
      quantite: '',
      prix: '',
      total: '',
    });

    // Configurer la réponse pour un téléchargement de fichier Excel
    res.setHeader('Content-Disposition', `attachment; filename=commande_${commande._id}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Envoyer le fichier Excel au client
    await workbook.xlsx.write(res);

    res.status(200).end(); // Terminer la réponse
  } catch (err) {
    handleError(res, err, 'Erreur lors de la génération du fichier Excel');
  }
};


// Valider une commande
export const validateCommande = async (req, res) => {
  const { id } = req.params;
  const { commentaire, action } = req.body;

  try {
    if (req.user.role !== 'Comptable') {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    const commande = await Commande.findById(id);
    if (!commande) {
      return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    }

    const ancienStatut = commande.statut;

    // Logique stricte pour les transitions de statuts
    if (commande.statut === 'En révision' && action === 'valider') {
      return res.status(400).json({ success: false, message: 'La commande doit être resoumise avant validation.' });
    }

    if (action === 'valider') {
      if (commande.statut !== 'Soumise') {
        return res.status(400).json({ success: false, message: 'Seules les commandes soumises peuvent être validées.' });
      }
      commande.statut = 'Validée';
    } else if (action === 'rejeter') {
      if (commande.statut !== 'Soumise') {
        return res.status(400).json({ success: false, message: 'Seules les commandes soumises peuvent être rejetées.' });
      }
      commande.statut = 'Rejetée';
    } else if (action === 'reviser') {
      if (commande.statut !== 'Soumise') {
        return res.status(400).json({ success: false, message: 'Seules les commandes soumises peuvent être envoyées en révision.' });
      }
      commande.statut = 'En révision';
      if (commentaire) {
        commande.commentaire = commentaire; // Ajouter le commentaire pour la révision
      }

      // Envoyer une notification au magasinier
      const magasinier = await User.findById(commande.id_utilisateur);  // Récupérer le magasinier
      await sendNotification(
        magasinier.email,  // Email du magasinier
        'Commande en révision',
        `Votre commande avec l'ID ${commande._id} a été renvoyée pour révision. Commentaire: ${commentaire}`
      );
    } else {
      return res.status(400).json({ success: false, message: 'Action non valide' });
    }

    await commande.save();

    // Journalisation du changement de statut
    const journalEntry = new JournalCommande({
      commandeId: commande._id,
      utilisateurId: req.user.id, // Utilisateur ayant effectué l'action
      ancienStatut: ancienStatut,
      nouveauStatut: commande.statut,
      commentaire: commentaire || '',
      dateChangement: new Date()
    });

    await journalEntry.save(); // Sauvegarder l'entrée du journal

    res.status(200).json({ success: true, message: 'Commande mise à jour avec succès', commande });
  } catch (err) {
    handleError(res, err, 'Erreur lors de la validation de la commande');
  }
};


export const generateRapportParPeriode = async (req, res) => {
  const { dateDebut, dateFin } = req.query;

  try {
    const commandes = await Commande.find({
      date_creation: { $gte: new Date(dateDebut), $lte: new Date(dateFin) }
    });

    const rapport = commandes.map(commande => ({
      id: commande._id,
      montant_total: commande.montant_total,
      produits: commande.produits,
      date_creation: commande.date_creation,
    }));

    res.status(200).json({ success: true, rapport });
  } catch (err) {
    handleError(res, err, 'Erreur lors de la génération du rapport');
  }
};


export const getStatistiquesBons = async (req, res) => {
  const { dateDebut, dateFin } = req.query;

  try {
    const bons = await Commande.find({
      date_creation: { $gte: new Date(dateDebut), $lte: new Date(dateFin) },
      statut: 'Validée',
    });

    const totalBons = bons.length;
    const montantTotal = bons.reduce((acc, bon) => acc + bon.montant_total, 0);

    res.status(200).json({
      success: true,
      totalBons,
      montantTotal,
    });
  } catch (err) {
    handleError(res, err, 'Erreur lors de la récupération des statistiques des bons');
  }
};


export const getStatistiquesCommandes = async (req, res) => {
  const { dateDebut, dateFin } = req.query;

  try {
    const commandes = await Commande.find({
      date_creation: { $gte: new Date(dateDebut), $lte: new Date(dateFin) }
    });

    const stats = {
      validees: commandes.filter(commande => commande.statut === 'Validée').length,
      rejetees: commandes.filter(commande => commande.statut === 'Rejetée').length,
      enAttente: commandes.filter(commande => commande.statut === 'Soumise').length,
    };

    res.status(200).json({ success: true, stats });
  } catch (err) {
    handleError(res, err, 'Erreur lors de la récupération des statistiques des commandes');
  }
};
