import config from "config";
import * as nodemailer from "nodemailer";
var sgTransport = require('nodemailer-sendgrid-transport');
import dotenv from "dotenv";
dotenv.config(); 

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!;
const SENDGRID_SENDER_EMAIL = process.env.SENDGRID_SENDER_EMAIL!;
const SENDGRID_NO_REPLY_EMAIL = process.env.SENDGRID_NO_REPLY_EMAIL!;

export class MailerUtilities {

  public static sendSendgridMail = async (data: any) => {
    var options = {
      auth: {
        api_key: SENDGRID_API_KEY
      }
    }

    var mailer = nodemailer.createTransport(sgTransport(options));

    var message: any = {
      to: [...data.recipient_email],
      from: 'peakup2025@gmail.com',
      subject: data.subject,
      text: data.text,
      html: data.html
    };

    if (data.cc) {
      message.cc = [...data.cc]
    }

    if (data.attachments) {
      message.attachments = [
        {
          filename: 'test.txt',
          path: __dirname + '/test.txt'
        }
      ]
    }
    
    await mailer.sendMail(message).then((res) => {
      console.log(res,">>>sendGrid res >>>>")
      return res;
    }).catch((error: any) => {
      console.log(error,">>>> sendgrid eror")
      console.error("Error sending mail:", error);
    })
  }


}