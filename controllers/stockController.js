import Stock from '../models/stockModel.js';
import Produit from '../models/produitModel.js'; 
import User from '../models/userModel.js'; // Importer le modèle User pour vérifier l'utilisateur
import JournalCommande from '../models/journalCommandeModel.js'; // Utiliser le même journal pour enregistrer les entrées et sorties de stock

// Middleware pour gérer les erreurs
const handleError = (res, err, message = 'Erreur inconnue') => {
  console.error(err); // Affiche l'erreur dans la console pour le débogage
  return res.status(500).json({ success: false, message, error: err.message });
};

// Ajouter des produits au stock (entrée de stock)
export const addStock = async (req, res) => {
  const { id_produit, quantite } = req.body; // Obtenir les données de la requête

  try {
    // Vérifier si le produit existe
    const produit = await Produit.findById(id_produit);
    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé.' });
    }

    // Créer ou mettre à jour l'entrée de stock
    let stock = await Stock.findOne({ id_produit });
    if (stock) {
      stock.quantite_disponible += quantite; // Mettre à jour la quantité
      stock.date_mise_a_jour = Date.now(); // Mettre à jour la date
    } else {
      stock = new Stock({
        id_produit,
        quantite_disponible: quantite,
        date_mise_a_jour: Date.now(),
      });
    }

    await stock.save(); // Enregistrer les modifications

    // Journaliser l'entrée en stock
    const journalEntry = new JournalCommande({
      commandeId: null,  // Pas de lien avec une commande dans ce cas
      utilisateurId: req.user.id,  // Magasinier effectuant l'entrée
      ancienStatut: `Stock avant entrée: ${stock.quantite_disponible - quantite}`,
      nouveauStatut: `Stock après entrée: ${stock.quantite_disponible}`,
      commentaire: `Entrée de ${quantite} unités du produit ${produit.nom}.`,
    });

    await journalEntry.save();

    res.status(200).json({ message: 'Stock mis à jour avec succès', stock });
  } catch (err) {
    handleError(res, err, 'Erreur lors de la mise à jour du stock');
  }
};

// Retirer des produits du stock (sortie de stock)
export const removeStock = async (req, res) => {
  const { id_produit, quantite, utilisateurId } = req.body; // Récupérer l'utilisateur recevant les produits

  try {
    // Vérifier si le produit existe dans le stock
    const stock = await Stock.findOne({ id_produit });
    if (!stock) {
      return res.status(404).json({ message: 'Produit non trouvé dans le stock.' });
    }

    // Vérifier si la quantité demandée est disponible
    if (stock.quantite_disponible < quantite) {
      return res.status(400).json({ message: 'Quantité demandée supérieure à la quantité disponible.' });
    }

    // Vérifier si l'utilisateur existe
    const utilisateur = await User.findById(utilisateurId);
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Mettre à jour la quantité de stock
    stock.quantite_disponible -= quantite;
    stock.date_mise_a_jour = Date.now(); 

    await stock.save(); // Enregistrer les modifications dans le stock

    // Journaliser la sortie de stock
    const journalEntry = new JournalCommande({
      commandeId: null,  // Pas de lien avec une commande
      utilisateurId: req.user.id,  // Magasinier effectuant la sortie
      ancienStatut: `Stock avant sortie: ${stock.quantite_disponible + quantite}`,
      nouveauStatut: `Stock après sortie: ${stock.quantite_disponible}`,
      commentaire: `Sortie de ${quantite} unités du produit ${stock.id_produit} affecté à l'utilisateur ${utilisateur.nom}.`,
    });

    await journalEntry.save();

    // Notification à l'utilisateur recevant les produits (rappel pour implémenter cette fonction)
    // notifyUser(utilisateurId, `Vous avez reçu ${quantite} unités du produit ${stock.id_produit}.`);

    res.status(200).json({ message: 'Stock mis à jour avec succès et produit affecté à l\'utilisateur', stock });
  } catch (err) {
    handleError(res, err, 'Erreur lors de la mise à jour du stock');
  }
};
