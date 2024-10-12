import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configurer le service d'envoi d'emails avec nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail', // Ou tout autre service que vous utilisez
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Fonction d'envoi de notification par email
export const sendNotification = async (to, subject, text) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Notification envoyée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification', error);
  }
};
