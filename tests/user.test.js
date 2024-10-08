import { createRequire } from 'module'; // Importer createRequire pour les modules non-ESM
const require = createRequire(import.meta.url); // Créer la fonction require
import request from 'supertest'; // Ajoutez cette ligne

import server from '../server.js'; // Importer le serveur principal


describe('Tests utilisateur', () => {
  let token;

  before((done) => {
    // Connecter l'utilisateur et récupérer son token JWT
    request(server)
      .post('/api/auth/login')
      .send({
        email: 'johndoe@example.com',
        mot_de_passe: 'Password123'
      })
      .end((err, res) => {
        token = res.body.token; // Stocker le token JWT
        done();
      });
  });

  // Récupération des informations utilisateur
  describe('GET /user', () => {
    it('Devrait renvoyer les informations de l\'utilisateur authentifié', (done) => {
      request(server)
        .get('/api/user') // Exemple de route
        .set('Authorization', `Bearer ${token}`) // Utiliser le token JWT
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('email', 'johndoe@example.com');
          done();
        });
    });
  });
});
