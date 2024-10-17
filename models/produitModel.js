import mongoose from 'mongoose';

const produitSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom du produit est requis.'],
    unique: true, // Assurer que le nom du produit est unique pour éviter les doublons
    trim: true,   // Supprimer les espaces en début et fin de chaîne
  },
  prix: {
    type: Number,
    required: [true, 'Le prix du produit est requis.'],
    min: [0, 'Le prix du produit ne peut pas être négatif.'],
  },
  seuil_critique: {
    type: Number,
    required: [true, 'Le seuil critique du produit est requis.'],
    min: [0, 'Le seuil critique doit être supérieur ou égal à zéro.'],
    default: 10, // Un seuil critique par défaut si l'utilisateur n'en fournit pas
  },
});

const Produit = mongoose.model('Produit', produitSchema);
export default Produit;
