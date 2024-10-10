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
  seuil_critique: {
    type: Number,
    required: true,
    min: 0, // Assurez-vous que le seuil critique ne soit pas négatif
  },
  // Ajoutez d'autres champs si nécessaire
});

const Produit = mongoose.model('Produit', produitSchema);
export default Produit;
