const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { isEmail } = require('validator'); // Utilisation du validateur pour l'email

// Définir le schéma utilisateur
const userSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true, // Supprimer les espaces en début/fin de chaîne
  },
  email: {
    type: String,
    required: true,
    unique: true, 
    validate: [isEmail, 'Email invalide'], // Vérification que l'email est valide
  },
  mot_de_passe: {
    type: String,
    required: true,
    minlength: 6, // Longueur minimale du mot de passe
    validate: {
      validator: function (value) {
        // Validation personnalisée pour la force du mot de passe (doit contenir au moins un chiffre)
        return /[A-Z]/.test(value) && /[0-9]/.test(value);
      },
      message: 'Le mot de passe doit contenir au moins une majuscule et un chiffre.',
    },
  },
  role: {
    type: String,
    enum: ['Magasinier', 'Comptable', 'Administrateur', 'Direction'], // Limitation des rôles
    default: 'Magasinier', // Rôle par défaut
  },
  date_creation: {
    type: Date,
    default: Date.now, // Date de création automatique
  },
});

// Middleware pour hacher le mot de passe avant la sauvegarde
userSchema.pre('save', async function (next) {
  const user = this;
  if (!user.isModified('mot_de_passe')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    user.mot_de_passe = await bcrypt.hash(user.mot_de_passe, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Comparer le mot de passe lors de la connexion
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.mot_de_passe);
};

// Créer et exporter le modèle utilisateur
const User = mongoose.model('User', userSchema);
module.exports = User;


/*Explication du modèle 'Utilisateur'
username : Unique et requis. Utilisé pour identifier chaque utilisateur.
email : Unique et requis. Valide par une regex pour s'assurer que le format est correct.
password : Requis avec une longueur minimale de 6 caractères. Avant d'être sauvegardé, le mot de passe sera haché à l'aide de bcrypt.
role : Définit le rôle de l'utilisateur (par défaut, 'user', mais pourrait être 'admin').
isActive : Statut pour savoir si l'utilisateur est actif ou non.
createdAt : Enregistre automatiquement la date de création de l'utilisateur.
Méthodes du modèle :
userSchema.pre('save') : Cette méthode middleware est utilisée pour hacher le mot de passe avant de l'enregistrer dans la base de données.
comparePassword() : Méthode pour comparer le mot de passe haché lors de la connexion.*/