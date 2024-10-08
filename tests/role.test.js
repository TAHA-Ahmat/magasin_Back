import { createRequire } from 'module'; // Importer createRequire pour les modules non-ESM
const require = createRequire(import.meta.url); // Créer la fonction require
import request from 'supertest'; // Ajoutez cette ligne

import server from '../server.js'; // Importer le serveur principal


describe('Tests de rôles et permissions', () => {
  let token;

  before((done) => {
    // Connecter un utilisateur non administrateur et récupérer son token JWT
    request(server)
      .post('/api/auth/login')
      .send({
        email: 'magasinier@example.com',
        mot_de_passe: 'Password123'
      })
      .end((err, res) => {
        token = res.body.token; // Stocker le token JWT
        done();
      });
  });

  it('Devrait refuser l\'accès à une route nécessitant un rôle administrateur', (done) => {
    request(server)
      .post('/api/auth/register') // Route qui nécessite un rôle administrateur
      .set('Authorization', `Bearer ${token}`) // Utiliser le token JWT d'un utilisateur non autorisé
      .send({
        nom: 'Unauthorized User',
        email: 'unauthorized@example.com',
        mot_de_passe: 'Password123',
        role: 'Magasinier'
      })
      .end((err, res) => {
        expect(res).to.have.status(403); // Accès refusé
        expect(res.body).to.have.property('message', 'Accès refusé');
        done();
      });
  });
});
