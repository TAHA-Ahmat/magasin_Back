const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server'); // Le serveur Express
const User = require('../models/userModel');
const expect = chai.expect;

chai.use(chaiHttp);

describe('Tests des routes d\'authentification', () => {

  // Avant chaque test, on vide la collection d'utilisateurs
  beforeEach(async () => {
    await User.deleteMany({});
  });

  // Test pour la route d'enregistrement
  describe('POST /register', () => {
    it('Devrait enregistrer un utilisateur avec succès', (done) => {
      chai.request(server)
        .post('/register')
        .send({
          nom: 'UtilisateurTest',
          email: 'test@test.com',
          mot_de_passe: 'Test1234',
          role: 'Magasinier'
        })
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('message', 'Utilisateur créé avec succès');
          expect(res.body.user).to.have.property('email', 'test@test.com');
          done();
        });
    });

    it('Devrait renvoyer une erreur si l\'email est déjà utilisé', (done) => {
      // Créer un utilisateur pour le test
      const utilisateur = new User({
        nom: 'UtilisateurTest',
        email: 'test@test.com',
        mot_de_passe: 'Test1234',
        role: 'Magasinier'
      });
      utilisateur.save().then(() => {
        chai.request(server)
          .post('/register')
          .send({
            nom: 'UtilisateurTest',
            email: 'test@test.com',
            mot_de_passe: 'Test1234',
            role: 'Magasinier'
          })
          .end((err, res) => {
            expect(res).to.have.status(400);
            expect(res.body).to.have.property('message', 'Utilisateur déjà enregistré');
            done();
          });
      });
    });
  });

  // Test des routes de connexion
  describe('POST /login', () => {
    it('Devrait connecter un utilisateur avec succès et renvoyer un JWT', (done) => {
      // Créer un utilisateur avant de tester la connexion
      const utilisateur = new User({
        nom: 'UtilisateurTest',
        email: 'test@test.com',
        mot_de_passe: 'Test1234',
        role: 'Magasinier'
      });

      utilisateur.save().then(() => {
        chai.request(server)
          .post('/login')
          .send({
            email: 'test@test.com',
            mot_de_passe: 'Test1234'
          })
          .end((err, res) => {
            expect(res).to.have.status(200);
            expect(res.body).to.have.property('message', 'Connexion réussie');
            expect(res.body).to.have.property('token');
            done();
          });
      });
    });

    it('Devrait renvoyer une erreur si les informations de connexion sont incorrectes', (done) => {
      chai.request(server)
        .post('/login')
        .send({
          email: 'wrong@test.com',
          mot_de_passe: 'MauvaisMotDePasse'
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('message', 'Email ou mot de passe incorrect');
          done();
        });
    });
  });

  // Tests pour les rôles et permissions
  describe('Test des rôles et permissions', () => {
    let token;

    // Avant de tester les permissions, nous devons connecter un utilisateur
    beforeEach((done) => {
      const utilisateur = new User({
        nom: 'AdminTest',
        email: 'admin@test.com',
        mot_de_passe: 'Admin1234',
        role: 'Administrateur'
      });

      utilisateur.save().then(() => {
        chai.request(server)
          .post('/login')
          .send({
            email: 'admin@test.com',
            mot_de_passe: 'Admin1234'
          })
          .end((err, res) => {
            token = res.body.token; // Stocker le token JWT pour les tests
            done();
          });
      });
    });

    it('Devrait permettre à un administrateur d\'accéder à une route protégée', (done) => {
      chai.request(server)
        .post('/register')
        .set('Authorization', `Bearer ${token}`) // Envoyer le token dans l'en-tête
        .send({
          nom: 'NouvelUtilisateur',
          email: 'new@test.com',
          mot_de_passe: 'Test1234',
          role: 'Magasinier'
        })
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('message', 'Utilisateur créé avec succès');
          done();
        });
    });

    it('Devrait interdire l\'accès à une route protégée pour un utilisateur sans le bon rôle', (done) => {
      const magasinier = new User({
        nom: 'MagasinierTest',
        email: 'magasinier@test.com',
        mot_de_passe: 'Magasin1234',
        role: 'Magasinier'
      });

      magasinier.save().then(() => {
        chai.request(server)
          .post('/login')
          .send({
            email: 'magasinier@test.com',
            mot_de_passe: 'Magasin1234'
          })
          .end((err, res) => {
            const magasinierToken = res.body.token;

            chai.request(server)
              .post('/register')
              .set('Authorization', `Bearer ${magasinierToken}`)
              .send({
                nom: 'NouvelUtilisateur',
                email: 'new@test.com',
                mot_de_passe: 'Test1234',
                role: 'Magasinier'
              })
              .end((err, res) => {
                expect(res).to.have.status(403);
                expect(res.body).to.have.property('message', 'Accès refusé');
                done();
              });
          });
      });
    });
  });
});
