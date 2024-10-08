import Commande from '../models/commandeModel.js';
import Produit from '../models/produitModel.js'; // Assurez-vous d'importer le modèle Produit

export const createCommande = async (req, res) => {
  const { produits } = req.body; // Obtenir les produits de la requête

  try {
    // Vérifiez que tous les produits existent dans la base de données
    const produitsExistants = await Produit.find({ _id: { $in: produits.map(p => p.produit_id) } });

    if (produitsExistants.length !== produits.length) {
      return res.status(400).json({ message: 'Un ou plusieurs produits n\'existent pas.' });
    }

    // Créez une nouvelle commande
    const commande = new Commande({
      id_utilisateur: req.user.id, // ID de l'utilisateur connecté
      produits
    });

    await commande.calculerMontantTotal(); // Calculez le montant total
    await commande.save(); // Enregistrez la commande dans la base de données

    res.status(201).json({ message: 'Commande créée avec succès', commande });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la création de la commande', error: err.message });
  }
};
