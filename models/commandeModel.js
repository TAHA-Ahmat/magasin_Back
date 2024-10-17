import mongoose from 'mongoose';
import Produit from './produitModel.js'; // Importer le modèle Produit pour calculer le montant total

const commandeSchema = new mongoose.Schema({
  id_utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Référence au modèle Utilisateur
    required: true
  },
  produits: [
    {
      produit_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Produit', // Référence au modèle Produit
        required: true
      },
      quantite: {
        type: Number,
        required: [true, 'La quantité est requise.'],
        min: [1, 'La quantité doit être d\'au moins 1.'], // Validation de la quantité minimale
      }
    }
  ],
  statut: {
    type: String,
    enum: ['Non Soumise', 'Soumise', 'Validée', 'Rejetée', 'En révision','Annulée'], // Statuts possibles
    default: 'Non Soumise' // Statut par défaut
  },
  date_creation: {
    type: Date,
    default: Date.now // Date actuelle par défaut
  },
  montant_total: {
    type: Number,
    default: 0 // Le montant total sera calculé automatiquement
  },
  date_archivage: {
    type: Date,
    default: null,  // Ce champ sera rempli lors de l'archivage ou lors de l'import d'un ancien bon.
  }

});

// Méthode pour calculer le montant total (à appeler lors de la création ou mise à jour de la commande)
commandeSchema.methods.calculerMontantTotal = async function() {
  const produits = await Promise.all(
    this.produits.map(async (produit) => {
      const foundProduit = await Produit.findById(produit.produit_id);
      if (!foundProduit) {
        throw new Error(`Produit introuvable avec l'ID ${produit.produit_id}`);
      }
      return foundProduit.prix * produit.quantite; // Calcul du coût total pour chaque produit
    })
  );
  this.montant_total = produits.reduce((acc, curr) => acc + curr, 0); // Somme totale de tous les produits
};

// Exporter le modèle
const Commande = mongoose.model('Commande', commandeSchema);
export default Commande;
