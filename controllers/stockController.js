import Stock from '../models/stockModel.js';
import Produit from '../models/produitModel.js'; 
import User from '../models/userModel.js'; // Importer le modèle User pour vérifier l'utilisateur
import JournalCommande from '../models/journalCommandeModel.js'; // Utiliser le même journal pour enregistrer les entrées et sorties de stock
import { sendNotification } from '../services/notificationService.js';  // Importer le service de notification

// Middleware pour gérer les erreurs
const handleError = (res, err, message = 'Erreur inconnue') => {
  console.error(err); // Affiche l'erreur dans la console pour le débogage
  return res.status(500).json({ success: false, message, error: err.message });
};

// Ajouter des produits au stock (entrée de stock)
export const addStock = async (req, res) => {
  const { id_produit, quantite } = req.body;

  try {
    const produit = await Produit.findById(id_produit);
    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé.' });
    }

    let stock = await Stock.findOne({ id_produit });
    if (stock) {
      stock.quantite_disponible += quantite;
      stock.date_mise_a_jour = Date.now();
    } else {
      stock = new Stock({
        id_produit,
        quantite_disponible: quantite,
        date_mise_a_jour: Date.now()
      });
    }

    await stock.save();

    // Journalisation de l'entrée de stock
    const journalEntry = new JournalCommande({
      commandeId: null,  // Ce n'est pas lié à une commande spécifique
      utilisateurId: req.user.id,  // ID du magasinier qui ajoute au stock
      ancienStatut: 'Entrée de stock',
      nouveauStatut: 'Stock mis à jour',
      commentaire: `Ajout de ${quantite} unités au stock du produit ${produit.nom}`,
      dateChangement: new Date(),
    });

    await journalEntry.save();  // Sauvegarder l'entrée du journal

    if (stock.quantite_disponible <= produit.seuil_critique) {
      const magasinier = await User.findById(req.user.id);
      await sendNotification(
        magasinier.email,
        'Alerte de stock critique',
        `Le stock du produit ${produit.nom} a atteint son seuil critique (${produit.seuil_critique} unités restantes).`
      );
    }

    res.status(200).json({ message: 'Stock mis à jour avec succès', stock });
  } catch (err) {
    handleError(res, err, 'Erreur lors de l\'ajout au stock');
  }
};

// Retirer des produits du stock (sortie de stock)
export const removeStock = async (req, res) => {
  const { id_produit, quantite, utilisateurId } = req.body;

  try {
    const stock = await Stock.findOne({ id_produit });
    if (!stock) {
      return res.status(404).json({ message: 'Produit non trouvé dans le stock.' });
    }

    if (stock.quantite_disponible < quantite) {
      return res.status(400).json({ message: 'Quantité demandée supérieure à la quantité disponible.' });
    }

    stock.quantite_disponible -= quantite;
    stock.date_mise_a_jour = Date.now();

    await stock.save();

    const utilisateur = await User.findById(utilisateurId);
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Envoyer une notification à l'utilisateur recevant les produits
    await sendNotification(
      utilisateur.email,
      'Produits affectés à votre compte',
      `Vous avez reçu ${quantite} unités du produit ${stock.id_produit}.`
    );

    // Journalisation de la sortie de stock
    const journalEntry = new JournalCommande({
      commandeId: null,  // Ce n'est pas lié à une commande spécifique
      utilisateurId: req.user.id,  // ID du magasinier ou administrateur qui retire du stock
      ancienStatut: 'Sortie de stock',
      nouveauStatut: 'Stock mis à jour',
      commentaire: `Retrait de ${quantite} unités du stock du produit ${stock.id_produit}`,
      dateChangement: new Date(),
    });

    await journalEntry.save();  // Sauvegarder l'entrée du journal

    res.status(200).json({ message: 'Stock mis à jour avec succès et produit affecté à l\'utilisateur', stock });
  } catch (err) {
    handleError(res, err, 'Erreur lors de la sortie du stock');
  }
};

