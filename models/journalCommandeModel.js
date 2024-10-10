import mongoose from 'mongoose';

const journalCommandeSchema = new mongoose.Schema({
  commandeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Commande',
    required: true,
  },
  utilisateurId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ancienStatut: {
    type: String,
    required: true,
  },
  nouveauStatut: {
    type: String,
    required: true,
  },
  dateChangement: {
    type: Date,
    default: Date.now,
  },
  commentaire: String,
});

const JournalCommande = mongoose.model('JournalCommande', journalCommandeSchema);
export default JournalCommande;
