const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Contrôleur pour l'inscription
exports.registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Vérifier si l'utilisateur existe déjà
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Utilisateur déjà enregistré' });
    }

    // Créer un nouvel utilisateur
    const user = new User({
      username,
      email,
      password,
    });

    // Sauvegarder l'utilisateur dans la base de données
    await user.save();

    // Générer un token JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    // Réponse au client avec le token
    res.status(201).json({
      message: 'Utilisateur inscrit avec succès',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur du serveur' });
  }
};

// Contrôleur pour la connexion
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Trouver l'utilisateur dans la base de données
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Comparer les mots de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Générer un token JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    // Réponse au client avec le token
    res.status(200).json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur du serveur' });
  }
};


/* 
registerUser :
Ce contrôleur gère l'inscription d'un nouvel utilisateur.
Il vérifie d'abord si l'utilisateur existe déjà avec l'email fourni.
Si non, il crée un nouvel utilisateur, hache le mot de passe avec le pré-enregistrement de Mongoose (voir étape précédente), et génère un token JWT.
La réponse inclut le token et les détails de l'utilisateur.
loginUser :
Ce contrôleur gère la connexion d'un utilisateur existant.
Il vérifie si l'email est associé à un utilisateur dans la base de données.
Ensuite, il compare le mot de passe fourni avec celui haché dans la base de données à l'aide de bcrypt.
Si les informations d'identification sont correctes, il génère un token JWT et le renvoie avec les informations de l'utilisateur.
*/