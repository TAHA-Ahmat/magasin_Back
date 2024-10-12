const roleMiddleware = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Accès refusé, ROLE INADEQUAT" });
    }
    next(); // Si l'utilisateur a le bon rôle, passe à la suite
  };
};

export default roleMiddleware;
