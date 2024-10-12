import User from '../models/userModel.js';  // Ajoutez .js pour les imports locaux
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';  // Utilisez jsonwebtoken pour l'import
import { logUserActivity } from './activityLogController.js';  // Importer la fonction de journalisation


// Fonction pour obtenir la liste des utilisateurs (réservé à l'administrateur)
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({}, 'nom email role');  // Obtenir tous les utilisateurs avec les champs nom, email, et rôle
    res.status(200).json({ success: true, users });
  } catch (err) {
    handleError(res, err, 'Erreur lors de la récupération des utilisateurs');
  }
};

// Fonction pour inscrire l'administrateur
export const registerAdmin = async (req, res) => {
  try {
    const adminExists = await User.findOne({ role: 'Administrateur' });
    if (adminExists) {
      return res.status(403).json({ message: 'Un administrateur existe déjà. Inscription désactivée.' });
    }

    const { nom, email, mot_de_passe } = req.body;
    const newAdmin = new User({
      nom,
      email,
      mot_de_passe,
      role: 'Administrateur'
    });

    await newAdmin.save();
    res.status(201).json({ message: 'Administrateur créé avec succès', user: newAdmin });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la création de l\'administrateur', error: err.message });
  }
};

// Fonction pour permettre à l'administrateur de créer d'autres utilisateurs
export const createUser = async (req, res) => {
  try {
    const { nom, email, mot_de_passe, role } = req.body;

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

export const registerUser = async (req, res) => {
  const { nom, email, mot_de_passe, role } = req.body;

  // Seul un administrateur peut s'inscrire lui-même ou inscrire d'autres utilisateurs
  if (role !== 'Administrateur' && req.user.role !== 'Administrateur') {
    return res.status(403).json({ message: 'Seul un administrateur peut créer des comptes.' });
  }

  try {
    const user = new User({ nom, email, mot_de_passe, role });
    await user.save();
    res.status(201).json({ message: 'Utilisateur créé avec succès.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création de l’utilisateur.' });
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
      expiresIn: '1d',
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

export const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['Magasinier', 'Comptable', 'Direction', 'Administrateur'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Rôle invalide' });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    user.role = role;
    await user.save();

    // Journaliser l'action de changement de rôle
    await logUserActivity(req.user.id, 'Modification du rôle utilisateur', `Rôle changé pour ${user.nom} en ${role}`);


    res.status(200).json({ success: true, message: 'Rôle mis à jour avec succès', user });
  } catch (err) {
    handleError(res, err, 'Erreur lors de la mise à jour du rôle');
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