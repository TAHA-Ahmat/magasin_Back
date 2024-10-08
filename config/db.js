import mongoose from 'mongoose';


const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connecté');
  } catch (err) {
    console.error(err.message);
    process.exit(1); // Arrêter l'application en cas d'échec de la connexion
  }
};

export default connectDB;
