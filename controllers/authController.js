import User from '../models/userModel.js';  // Ajoutez .js pour les imports locaux
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';  // Utilisez jsonwebtoken pour l'import



// Enregistrer un nouvel utilisateur
export const registerUser = async (req, res) => {
  const { nom, email, mot_de_passe, role } = req.body;

  try {
    // Vérifier si l'utilisateur existe déjà
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Utilisateur déjà enregistré' });
    }

    // Créer un nouvel utilisateur
    const newUser = new User({
      nom,
      email,
      mot_de_passe,
      role,
    });

    // Sauvegarder l'utilisateur dans la base de données
    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      user: {
        id: newUser._id,
        nom: newUser.nom,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur du serveur', error: err.message });
  }
};

// Connexion utilisateur
export const loginUser = async (req, res) => {
  const { email, mot_de_passe } = req.body;

  try {
    // Trouver l'utilisateur par son email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Email ou mot de passe incorrect' });
    }

    // Comparer les mots de passe
    const isMatch = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Email ou mot de passe incorrect' });
    }

    // Générer un token JWT
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      token,
      user: {
        id: user._id,
        nom: user.nom,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur du serveur', error: err.message });
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