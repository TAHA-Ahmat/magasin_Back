import Commande from '../models/commandeModel.js';
import Produit from '../models/produitModel.js';

// Middleware pour gérer les erreurs
const handleError = (res, err, message = 'Erreur inconnue') => {
  console.error(err); // Affiche l'erreur dans la console pour le débogage
  return res.status(500).json({ success: false, message, error: err.message });
};

export const createCommande = async (req, res) => {
  const { produits } = req.body; // Obtenir les produits de la requête

  try {
    // Vérifiez que tous les produits existent dans la base de données
    const produitsExistants = await Produit.find({ _id: { $in: produits.map(p => p.produit_id) } });

    if (produitsExistants.length !== produits.length) {
      return res.status(400).json({ success: false, message: 'Un ou plusieurs produits n\'existent pas.' });
    }

    // Créez une nouvelle commande
    const commande = new Commande({
      id_utilisateur: req.user.id, // ID de l'utilisateur connecté
      produits,
      statut: 'Soumise' // Définir le statut à 'Soumise' lors de la création
    });

    await commande.calculerMontantTotal(); // Calculez le montant total
    await commande.save(); // Enregistrez la commande dans la base de données

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

// Valider une commande
export const validateCommande = async (req, res) => {
  const { id } = req.params; // Récupérer l'ID de la commande depuis les paramètres
  const { commentaire, action } = req.body; // Obtenir le commentaire et l'action de la requête

  try {
    if (req.user.role !== 'Comptable') {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    const commande = await Commande.findById(id);
    if (!commande) {
      return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    }

    if (action === 'valider') {
      commande.statut = 'Validée';
    } else if (action === 'rejeter') {
      commande.statut = 'Rejetée';
    } else {
      return res.status(400).json({ success: false, message: 'Action non valide' });
    }

    if (commentaire) {
      commande.commentaire = commentaire; // Optionnel : Ajouter un commentaire
    }

    await commande.save(); // Enregistrer les modifications
    res.status(200).json({ success: true, message: 'Commande mise à jour avec succès', commande });
  } catch (err) {
    handleError(res, err, 'Erreur lors de la validation de la commande');
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
