import UserActivityLog from '../models/userActivityLogModel.js';

// Fonction pour journaliser l'activité utilisateur
export const logUserActivity = async (utilisateurId, action, details = '') => {
  try {
    const logEntry = new UserActivityLog({
      utilisateurId,
      action,
      details,
    });
    await logEntry.save();
  } catch (err) {
    console.error('Erreur lors de la journalisation de l\'activité utilisateur', err.message);
  }
};

// Fonction pour consulter le journal des activités (administrateur uniquement)
export const getActivityLog = async (req, res) => {
  const { utilisateurId, action, dateDebut, dateFin } = req.query; // Possibilité de filtrer par utilisateur, action ou période
  const filters = {};

  if (utilisateurId) filters.utilisateurId = utilisateurId;
  if (action) filters.action = action;
  if (dateDebut && dateFin) {
    filters.date = { $gte: new Date(dateDebut), $lte: new Date(dateFin) };
  }

  try {
    const logs = await UserActivityLog.find(filters).populate('utilisateurId', 'nom email');
    res.status(200).json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération du journal des activités', error: err.message });
  }
};
