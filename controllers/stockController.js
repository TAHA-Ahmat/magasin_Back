import Stock from '../models/stockModel.js';
import Produit from '../models/produitModel.js'; // Importer le modèle Produit

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
        date_mise_a_jour: Date.now()
      });
    }

    await stock.save(); // Enregistrer les modifications
    res.status(200).json({ message: 'Stock mis à jour avec succès', stock });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du stock', error: err.message });
  }
};

// Retirer des produits du stock (sortie de stock)
export const removeStock = async (req, res) => {
  const { id_produit, quantite } = req.body; // Obtenir les données de la requête

  try {
    // Vérifier si le produit existe
    const stock = await Stock.findOne({ id_produit });
    if (!stock) {
      return res.status(404).json({ message: 'Produit non trouvé dans le stock.' });
    }

    // Vérifier si la quantité demandée est disponible
    if (stock.quantite_disponible < quantite) {
      return res.status(400).json({ message: 'Quantité demandée supérieure à la quantité disponible.' });
    }

    // Mettre à jour la quantité
    stock.quantite_disponible -= quantite;
    stock.date_mise_a_jour = Date.now(); // Mettre à jour la date

    await stock.save(); // Enregistrer les modifications
    res.status(200).json({ message: 'Stock mis à jour avec succès', stock });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du stock', error: err.message });
  }
};
