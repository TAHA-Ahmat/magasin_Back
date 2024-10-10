import Commande from '../models/commandeModel.js';
import Produit from '../models/produitModel.js';
import JournalCommande from '../models/journalCommandeModel.js';

// Middleware pour gérer les erreurs
const handleError = (res, err, message = 'Erreur inconnue') => {
  console.error(err); // Affiche l'erreur dans la console pour le débogage
  return res.status(500).json({ success: false, message, error: err.message });
};

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
      await Promise.all(
        commande.produits.map(async (produit) => {
          if (!produit.prix) {
            const foundProduit = await Produit.findById(produit.produit_id);
            produit.prix = foundProduit.prix || 0;
          }
        })
      );
      await commande.calculerMontantTotal();
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
        commande.commentaire = commentaire;
      }

// Envoyer une notification au magasinier (cette fonction devra être implémentée)
// notifyMagasinier(commande.id_utilisateur, 'Commande en révision', commentaire);

    } else {
      return res.status(400).json({ success: false, message: 'Action non valide' });
    }

    await commande.save();

    // Enregistrer le changement de statut dans le journal (voir section 2 pour le modèle JournalCommande)
    const journalEntry = new JournalCommande({
      commandeId: commande._id,
      utilisateurId: req.user.id,  // Utilisateur effectuant le changement
      ancienStatut,
      nouveauStatut: commande.statut,
      commentaire: commentaire || '',
    });

    await journalEntry.save();

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
