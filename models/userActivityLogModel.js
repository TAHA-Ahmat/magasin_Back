import mongoose from 'mongoose';

const userActivityLogSchema = new mongoose.Schema({
  utilisateurId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  details: {
    type: String, // Détails supplémentaires sur l'action (ex : ID commande)
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const UserActivityLog = mongoose.model('UserActivityLog', userActivityLogSchema);
export default UserActivityLog;
