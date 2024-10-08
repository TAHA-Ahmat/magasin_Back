import mongoose from 'mongoose';

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
        required: true,
        min: 1 // Au moins 1 produit doit être commandé
      }
    }
  ],
  statut: {
    type: String,
    enum: ['Soumise', 'Validée', 'Rejetée', 'En révision'],
    default: 'Soumise' // Statut par défaut
  },
  date_creation: {
    type: Date,
    default: Date.now // Date actuelle par défaut
  },
  montant_total: {
    type: Number,
    default: 0 // Le montant total sera calculé automatiquement
  }
});

// Méthode pour calculer le montant total (à appeler lors de la création ou mise à jour de la commande)
commandeSchema.methods.calculerMontantTotal = async function() {
  const produits = await Promise.all(
    this.produits.map(async (produit) => {
      const foundProduit = await Produit.findById(produit.produit_id);
      return foundProduit ? foundProduit.prix * produit.quantite : 0; // Remplacer `prix` par votre champ de prix
    })
  );
  this.montant_total = produits.reduce((acc, curr) => acc + curr, 0);
};

// Exporter le modèle
const Commande = mongoose.model('Commande', commandeSchema);
export default Commande;
