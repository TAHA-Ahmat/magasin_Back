import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Accès refusé, aucun token fourni' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attacher l'utilisateur décodé à la requête
    next();
  } catch (err) {
    res.status(400).json({ message: 'Token invalide' });
  }
};

export default authMiddleware;
