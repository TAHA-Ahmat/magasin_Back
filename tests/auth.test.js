import { createRequire } from 'module'; // Importer createRequire pour les modules non-ESM
const require = createRequire(import.meta.url); // Créer la fonction require
import request from 'supertest'; // Utiliser Supertest pour faire des requêtes HTTP
import server from '../server.js'; // Importer le serveur principal

describe('Tests utilisateur', () => {

  // Test de la création d'un nouvel utilisateur
  describe('POST /api/users', () => {
    it('Devrait créer un nouvel utilisateur avec succès', async () => {
      const res = await request(server)
        .post('/api/users') // Remplacez par votre route de création d'utilisateur
        .send({
          nom: 'Jane Doe',
          email: 'janedoe@example.com',
          mot_de_passe: 'Password123',
          role: 'Magasinier'
        });

      // Assertions simples sans expect
      if (res.status !== 201) throw new Error(`Statut attendu 201, mais reçu ${res.status}`);
      if (res.body.message !== 'Utilisateur créé avec succès') throw new Error(`Message attendu 'Utilisateur créé avec succès', mais reçu ${res.body.message}`);
    });

    it('Devrait renvoyer une erreur si l\'email est déjà utilisé', async () => {
      const res = await request(server)
        .post('/api/users') // Remplacez par votre route de création d'utilisateur
        .send({
          nom: 'Jane Doe',
          email: 'janedoe@example.com', // Utiliser le même email pour provoquer une erreur
          mot_de_passe: 'Password123',
          role: 'Magasinier'
        });

      // Assertions simples sans expect
      if (res.status !== 400) throw new Error(`Statut attendu 400, mais reçu ${res.status}`);
      if (res.body.message !== 'Utilisateur déjà enregistré') throw new Error(`Message attendu 'Utilisateur déjà enregistré', mais reçu ${res.body.message}`);
    });
  });

  // Test de récupération des utilisateurs
  describe('GET /api/users', () => {
    it('Devrait récupérer tous les utilisateurs', async () => {
      const res = await request(server)
        .get('/api/users'); // Remplacez par votre route pour récupérer les utilisateurs

      // Assertions simples sans expect
      if (res.status !== 200) throw new Error(`Statut attendu 200, mais reçu ${res.status}`);
      if (!Array.isArray(res.body)) throw new Error(`Attendu un tableau, mais reçu ${typeof res.body}`);
    });
  });
});

