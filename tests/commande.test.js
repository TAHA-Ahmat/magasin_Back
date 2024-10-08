import request from 'supertest';
import app from '../server.js'; // Importer le serveur
import mongoose from 'mongoose'; // Importer mongoose pour les tests

describe('Tests de la fonctionnalité Commande', () => {
  let token;

  // Avant chaque test, connectez-vous pour obtenir un token
  beforeAll(async () => {
    // Simulez la connexion d'un utilisateur avec le rôle de magasinier
    // Créez un utilisateur et obtenez un token ici
  });

  describe('POST /api/commandes', () => {
    it('Devrait créer un nouvel utilisateur avec succès', async () => {
      const res = await request(app)
        .post('/api/commandes')
        .set('Authorization', `Bearer ${token}`) // Authentification
        .send({
          produits: [
            { produit_id: 'votre_produit_id', quantite: 2 }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Commande créée avec succès');
    });

    it('Devrait renvoyer une erreur si le produit n\'existe pas', async () => {
      const res = await request(app)
        .post('/api/commandes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          produits: [
            { produit_id: 'id_inexistant', quantite: 1 }
          ]
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Un ou plusieurs produits n\'existent pas.');
    });
  });
});
