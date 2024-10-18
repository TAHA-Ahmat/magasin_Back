const roleMiddleware = (roles) => {
  return (req, res, next) => {
    // Vérifier si le rôle de l'utilisateur fait partie des rôles autorisés
    if (!roles.includes(req.user.role)) {
      console.log('Vérification de l\'authentification réussie', req.user);
      return res.status(403).json({ message: "Accès refusé, rôle inadéquat" });
    }
    next(); // Si l'utilisateur a le bon rôle, passer à l'étape suivante
  };
};

export default roleMiddleware;
