import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  // Extraire le token de l'en-tête Authorization
  const token = req.header('Authorization')?.split(' ')[1];

  // Vérifier si un token est fourni
  if (!token) {
    return res.status(401).json({ message: 'Accès refusé, aucun token fourni' });
  }

  try {
    // Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attacher les informations décodées de l'utilisateur à la requête
    console.log('Vérification de l\'authentification réussie', req.user.role);
    next(); // Continuer vers la route suivante
  } catch (err) {
    res.status(400).json({ message: 'Token invalide' });
  }
};

export default authMiddleware;
