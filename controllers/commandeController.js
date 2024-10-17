import Commande from '../models/commandeModel.js';
import Produit from '../models/produitModel.js';
import JournalCommande from '../models/journalCommandeModel.js';
import { sendNotification } from '../services/notificationService.js';  // Importer le service de notification

// Middleware pour gérer les erreurs
const handleError = (res, err, message = 'Erreur inconnue') => {
  console.error(err); // Affiche l'erreur dans la console pour le débogage
  return res.status(500).json({ success: false, message, error: err.message });
};

// Fonction pour récupérer les commandes spécifiques au MAGASIN
export const getMagasinierOrders = async (req, res) => {
  const userId = req.user.id; // ID de l'utilisateur connecté
  try {
    // Vérifier le rôle de l'utilisateur
    if (req.user.role !== 'Magasinier') {
      return res.status(403).json({ success: false, message: 'Accès refusé : vous devez être un magasinier pour voir les commandes.' });
    }

    // Récupérer les commandes pour le magasinier
    const commandes = await Commande.find({ id_utilisateur: userId }).populate('produits.produit_id'); // Peupler les produits

    res.status(200).json({ success: true, commandes });
  } catch (err) {
    handleError(res, err, 'Erreur lors de la récupération des commandes du magasinier');
  }
};

// Créer une commande
export const createCommande = async (req, res) => {
  const { produits } = req.body; // Obtenir les produits de la requête

  try {
    // Log des produits reçus
    console.log('Produits reçus:', produits);

    // Parcours des produits pour générer des identifiants si nécessaire
    const produitsAvecId = await Promise.all(
      produits.map(async (produit) => {
        // Vérifier que le nom, la quantité et le prix sont fournis
        if (!produit.nom || !produit.quantite || produit.quantite < 1) {
          throw new Error('Nom, quantité (minimum 1) et prix du produit sont requis.');
        }

        // Vérifier que le produit ID est valide ou créer un nouveau produit si nécessaire
        if (produit.produit_id) {
          // Vérification que l'ID du produit est valide
          if (!mongoose.Types.ObjectId.isValid(produit.produit_id)) {
            throw new Error(`ID de produit invalide : ${produit.produit_id}`);
          }
        } else {
          // Créer un nouveau produit si pas d'ID
          const produitExistant = await Produit.findOne({ nom: produit.nom });
          if (produitExistant) {
            throw new Error(`Un produit avec ce nom existe déjà : ${produit.nom}`);
          }

          const nouveauProduit = new Produit({
            nom: produit.nom,
            prix: produit.prix,
            seuil_critique: produit.seuil_critique || 10, // Utiliser un seuil critique par défaut si non fourni
          });
          await nouveauProduit.save();
          produit.produit_id = nouveauProduit._id; // Utiliser l'ID généré
        }

        return produit;
      })
    );

    // Créer une nouvelle commande
    const commande = new Commande({
      id_utilisateur: req.user.id,
      produits: produitsAvecId,
      statut: 'Soumise',
    });

    // Calcul du montant total
    await commande.calculerMontantTotal();

    // Enregistrer la commande
    await commande.save();

    res.status(201).json({ success: true, message: 'Commande créée avec succès', commande });
  } catch (err) {
    // Log de l'erreur
    console.error('Erreur complète:', err);
    return res.status(400).json({ success: false, message: err.message });
  }
};

// Récupérer les commandes
export const getCommandes = async (req, res) => {
  try {
    const role = req.user.role;

    if (role === 'Magasinier') {
      return getMagasinierOrders(req, res); // Rediriger vers la fonction spécifique
    } else if (role === 'Comptable') {
      return getComptableOrders(req, res); // Rediriger vers la fonction spécifique
    } else {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
  } catch (err) {
    handleError(res, err, 'Erreur lors de la récupération des commandes');
  }
};

// Valider une commande 
export const validateCommande = async (req, res) => {
  const { id } = req.params; // ID de la commande
  const { commentaire, action } = req.body; // Commentaire et action (valider/rejeter)

  try {
    // Vérification du rôle de l'utilisateur
    if (req.user.role !== 'Comptable') {
      return res.status(403).json({ success: false, message: 'Accès refusé : vous devez être un comptable pour valider les commandes.' });
    }

    // Récupérer la commande par ID
    const commande = await Commande.findById(id);
    if (!commande) {
      return res.status(404).json({ success: false, message: 'Erreur : commande non trouvée avec cet ID.' });
    }

    const ancienStatut = commande.statut;

    // Logique stricte pour les transitions de statuts
    if (commande.statut === 'En révision' && action === 'valider') {
      return res.status(400).json({ success: false, message: 'Erreur : la commande doit être resoumise avant validation.' });
    }

    if (action === 'valider') {
      if (commande.statut !== 'Soumise') {
        return res.status(400).json({ success: false, message: 'Erreur : seules les commandes soumises peuvent être validées.' });
      }
      commande.statut = 'Validée';
      commande.commentaire = commentaire || ''; // Optionnel, en cas de commentaire

    } else if (action === 'rejeter') {
      if (commande.statut !== 'Soumise') {
        return res.status(400).json({ success: false, message: 'Erreur : seules les commandes soumises peuvent être rejetées.' });
      }
      commande.statut = 'Rejetée';
      commande.commentaire = commentaire || ''; // Ajouter un commentaire si fourni
    } else if (action === 'reviser') {
      if (commande.statut !== 'Rejetée') {
        return res.status(400).json({ success: false, message: 'Erreur : seules les commandes rejetées peuvent être renvoyées pour révision.' });
      }      
      commande.statut = 'En révision'; // Changement de statut
      if (commentaire) {
        commande.commentaire = commentaire; // Ajouter le commentaire pour la révision
      }
    } else {
      return res.status(400).json({ success: false, message: 'Erreur : action non valide.' });
    }

    // Enregistrer les changements
    await commande.save();

    // Journaliser l'action
    const journalEntry = new JournalCommande({
      commandeId: commande._id,
      utilisateurId: req.user.id,
      ancienStatut: ancienStatut,
      nouveauStatut: commande.statut,
      commentaire: commentaire || '',
      dateChangement: new Date()
    });
    await journalEntry.save(); // Sauvegarder l'entrée du journal

    return res.status(200).json({ success: true, message: 'Commande mise à jour avec succès.', commande });
  } catch (err) {
    handleError(res, err, 'Erreur lors de la validation de la commande');
  }
};

// Fonction pour récupérer les commandes spécifiques au COMPTABLE
export const getComptableOrders = async (req, res) => {
  try {
    // Vérifier le rôle de l'utilisateur
    if (req.user.role !== 'Comptable') {
      return res.status(403).json({ success: false, message: 'Accès refusé : vous devez être un comptable pour voir les commandes.' });
    }

    // Récupérer les commandes avec statut "Rejetée et Validée"
    const commandes = await Commande.find({ statut: { $in: ['Rejetée', 'Validée'] } }).populate('produits.produit_id'); // Peupler les produits

    res.status(200).json({ success: true, commandes });
  } catch (err) {
    handleError(res, err, 'Erreur lors de la récupération des commandes du comptable');
  }
};


// Fonction pour annuler une commande
export const cancelOrderMagasin = async (req, res) => {
  const { id } = req.params; // Récupérer l'ID de la commande
  const { commentaire } = req.body; // Récupérer le commentaire de l'annulation

  try {
    const commande = await Commande.findById(id);
    if (!commande) {
      return res.status(404).json({ success: false, message: 'Commande non trouvée.' });
    }

    if (commande.statut !== 'Soumise' && commande.statut !== 'Rejetée') {
      return res.status(400).json({ success: false, message: 'La commande ne peut être annulée que si elle est soumise ou rejetée.' });
    }

    commande.statut = 'Annulée';
    commande.commentaireAnnulation = commentaire; // Ajouter le commentaire
    await commande.save();

    res.status(200).json({ success: true, message: 'Commande annulée avec succès.', commande });
  } catch (err) {
    handleError(res, err, 'Erreur lors de l\'annulation de la commande');
  }
};


// Fonction pour modifier une commande
export const modifyOrderMagasin = async (req, res) => {
  const { id } = req.params; // Récupérer l'ID de la commande
  const { produits } = req.body; // Récupérer les nouveaux produits de la requête

  try {
    // Vérifier que la commande existe
    const commande = await Commande.findById(id);
    if (!commande) {
      return res.status(404).json({ success: false, message: 'Commande non trouvée.' });
    }

    // Vérifier le statut de la commande
    if (commande.statut !== 'Soumise' && commande.statut !== 'Rejetée') {
      return res.status(400).json({ success: false, message: 'La commande ne peut être modifiée que si elle est soumise ou rejetée.' });
    }

    // Mettre à jour les produits de la commande
    commande.produits = produits; // Remplacer les produits actuels par les nouveaux
    await commande.save();

    res.status(200).json({ success: true, message: 'Commande mise à jour avec succès.', commande });
  } catch (err) {
    handleError(res, err, 'Erreur lors de la mise à jour de la commande');
  }
};



export default {
  createCommande,
  getCommandes,
  validateCommande,
  getMagasinierOrders, // Ajouter la nouvelle fonction ici
  getComptableOrders,
  cancelOrderMagasin,
  modifyOrderMagasin,
};


/*
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

*/
