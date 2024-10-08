import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  // Récupérer le token à partir des headers
  const token = req.header('Authorization')?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Accès refusé, aucun token fourni' });
  }

  try {
    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attacher l'utilisateur décodé à la requête
    req.user = decoded;

    next();
  } catch (err) {
    res.status(400).json({ message: 'Token invalide' });
  }
};

// Exporter authMiddleware par défaut
export default authMiddleware;
