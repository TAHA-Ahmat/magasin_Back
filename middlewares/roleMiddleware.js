const roleMiddleware = (roles) => { // roles est un tableau contenant les rôles autorisés
    return (req, res, next) => {
      if (!roles.includes(req.user.role)) { // Vérifie si le rôle de l'utilisateur est dans la liste des rôles autorisés
        return res.status(403).json({ message: "Accès refusé" }); // Si non autorisé, renvoie une réponse avec le statut 403 (interdit)
      }
      next(); // Si le rôle est autorisé, passe à la prochaine fonction middleware ou au contrôleur
    };
  };
    

  export default roleMiddleware;
