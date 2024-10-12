import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log('MongoDB connecté avec succès');
  } catch (err) {
    console.error(`Erreur lors de la connexion à MongoDB : ${err.message}`);
    console.error(err.stack);  // Pour plus de détails sur l'erreur
    process.exit(1); // Arrêter l'application en cas d'échec de la connexion
  }
};

export default connectDB;
