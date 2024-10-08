import mongoose from 'mongoose';

const produitSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
  },
  prix: {
    type: Number,
    required: true,
  },
  // Ajoutez d'autres champs si nécessaire
});

const Produit = mongoose.model('Produit', produitSchema);
export default Produit;
