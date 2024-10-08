import { createRequire } from 'module'; // Importer createRequire pour les modules non-ESM
const require = createRequire(import.meta.url); // Créer la fonction require
import request from 'supertest'; // Ajoutez cette ligne

import server from '../server.js'; // Importer le serveur principal



describe('Tests d\'authentification', () => {

  // Test d'enregistrement d'un nouvel utilisateur
  describe('POST /register', () => {
    it('Devrait enregistrer un utilisateur avec succès', (done) => {
      request(server)
        .post('/api/auth/register')
        .send({
          nom: 'John Doe',
          email: 'johndoe@example.com',
          mot_de_passe: 'Password123',
          role: 'Administrateur'
        })
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('message', 'Utilisateur créé avec succès');
          done();
        });
    });

    it('Devrait renvoyer une erreur si l\'email est déjà utilisé', (done) => {
      request(server)
        .post('/api/auth/register')
        .send({
          nom: 'John Doe',
          email: 'johndoe@example.com',  // Utiliser le même email pour provoquer une erreur
          mot_de_passe: 'Password123',
          role: 'Administrateur'
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('message', 'Utilisateur déjà enregistré');
          done();
        });
    });
  });

  // Test de connexion utilisateur
  describe('POST /login', () => {
    it('Devrait connecter un utilisateur avec succès et renvoyer un JWT', (done) => {
      request(server)
        .post('/api/auth/login')
        .send({
          email: 'johndoe@example.com',
          mot_de_passe: 'Password123'
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('token');
          done();
        });
    });

    it('Devrait renvoyer une erreur si le mot de passe est incorrect', (done) => {
      request(server)
        .post('/api/auth/login')
        .send({
          email: 'johndoe@example.com',
          mot_de_passe: 'WrongPassword'
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('message', 'Email ou mot de passe incorrect');
          done();
        });
    });
  });

  // Test d'accès à une route protégée
  describe('Accès à une route protégée', () => {
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

    it('Devrait permettre l\'accès à une route protégée avec un token valide', (done) => {
      request(server)
        .get('/api/auth/protected')
        .set('Authorization', `Bearer ${token}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('message', 'Accès autorisé');
          done();
        });
    });

    it('Devrait renvoyer une erreur si le token est invalide ou non fourni', (done) => {
      request(server)
        .get('/api/auth/protected')
        .end((err, res) => {
          expect(res).to.have.status(401);
          expect(res.body).to.have.property('message', 'Accès refusé, aucun token fourni');
          done();
        });
    });
  });
});
