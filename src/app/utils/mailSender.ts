import nodemailer from 'nodemailer';
import config from '../config';

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com.',
      port: 587,
      secure: config.NODE_ENV === 'production',
      auth: {
        // TODO: replace `user` and `pass` values from <https://forwardemail.net>
        user: config.nodemailer_host_email,
        pass: config.nodemailer_host_pass,
      },
    });
    await transporter.sendMail({
      from: 'nurmdopu428@gmail.com',
      to,
      subject,
      text: '',
      html,
    });
  } catch (error) {
    console.log(error);
  }
};
