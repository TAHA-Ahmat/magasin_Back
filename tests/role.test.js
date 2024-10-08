import { createRequire } from 'module'; // Importer createRequire pour les modules non-ESM
const require = createRequire(import.meta.url); // Créer la fonction require
import request from 'supertest'; // Utiliser Supertest pour faire des requêtes HTTP
import server from '../server.js'; // Importer le serveur principal

describe('Tests de rôles et permissions', () => {
  let adminToken;
  let userToken;

  before(async () => {
    // Connexion d'un administrateur pour obtenir un token valide
    const adminLoginRes = await request(server)
      .post('/api/auth/login') // Remplacez par votre route de connexion
      .send({
        email: 'admin@example.com',
        mot_de_passe: 'AdminPassword123'
      });
    adminToken = adminLoginRes.body.token; // Stocker le token de l'administrateur

    // Connexion d'un utilisateur normal pour obtenir un token
    const userLoginRes = await request(server)
      .post('/api/auth/login') // Remplacez par votre route de connexion
      .send({
        email: 'user@example.com',
        mot_de_passe: 'UserPassword123'
      });
    userToken = userLoginRes.body.token; // Stocker le token de l'utilisateur
  });

  // Test d'accès à une route nécessitant un rôle d'administrateur
  describe('Accès à une route nécessitant un rôle administrateur', () => {
    it('Devrait permettre à un administrateur d\'accéder à une route protégée', async () => {
      const res = await request(server)
        .get('/api/admin/protected') // Remplacez par votre route protégée pour les administrateurs
        .set('Authorization', `Bearer ${adminToken}`);

      // Assertions simples sans expect
      if (res.status !== 200) throw new Error(`Statut attendu 200, mais reçu ${res.status}`);
      if (res.body.message !== 'Accès autorisé') throw new Error(`Message attendu 'Accès autorisé', mais reçu ${res.body.message}`);
    });

    it('Devrait refuser l\'accès à une route nécessitant un rôle d\'administrateur pour un utilisateur normal', async () => {
      const res = await request(server)
        .get('/api/admin/protected') // Remplacez par votre route protégée pour les administrateurs
        .set('Authorization', `Bearer ${userToken}`);

      // Assertions simples sans expect
      if (res.status !== 403) throw new Error(`Statut attendu 403, mais reçu ${res.status}`);
      if (res.body.message !== 'Accès refusé') throw new Error(`Message attendu 'Accès refusé', mais reçu ${res.body.message}`);
    });
  });
});
