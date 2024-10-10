import mongoose from 'mongoose';

// Création d'un schéma pour le stock
const stockSchema = new mongoose.Schema({
  id_produit: {
    type: mongoose.Schema.Types.ObjectId, // Utilisation d'un ObjectId pour référencer le produit
    ref: 'Produit', // Référence au modèle Produit, ce qui permet d'associer un stock à un produit spécifique
    required: true, // Rendre ce champ obligatoire
  },
  quantite_disponible: {
    type: Number, // Type de données pour la quantité disponible
    required: true, // Rendre ce champ obligatoire
    min: 0, // La quantité ne peut pas être négative
  },
  date_mise_a_jour: {
    type: Date, // Type de données pour la date de mise à jour
    default: Date.now, // Si aucune date n'est fournie, la date actuelle est utilisée par défaut
  },
});

// Création du modèle Stock à partir du schéma
const Stock = mongoose.model('Stock', stockSchema);
export default Stock; // Exportation du modèle pour l'utiliser dans d'autres parties de l'application
