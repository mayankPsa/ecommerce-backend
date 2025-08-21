import mongoose = require("mongoose");
import { Utilities } from "../../utils/utilities";
import { handleServerError } from "../../utils/ErrorHandler";
import { contactModel } from "../../db/contactModel";
import { MailerUtilities } from "../../utils/MailerUtilities";
import * as path from "path";
import * as fs from "fs";
import * as ejs from "ejs";
export const createContact = async (body: any, res: any) => {
  try {
    const { name, email, phoneNumber, message } = body;

    const result = await contactModel.create({
      name,
      email,
      phoneNumber,
      message
    });

    const templatePath = path.join(__dirname, '../../../src/views/contact-us-email.ejs'); let html;
    try {
      const template = fs.readFileSync(templatePath, "utf-8");
      html = await ejs.render(template, { name, message, email, phoneNumber });
    } catch (fileError) {
      console.error("Error reading EJS template:", fileError);
      throw new Error("Failed to load email template");
    }
    const mailData = {
      recipient_email: ['peakup2025@gmail.com'], // Send to the user's email
      subject: "Contact Form Submission Received",
      text: message,
      html,
    };

    await MailerUtilities.sendSendgridMail(mailData);
    return Utilities.sendResponsData({
      code: 200,
      message: "Your message has been received successfully",
      data: result
    });
  } catch (error: any) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const getContacts = async (query: any, res: any) => {
  try {
    const filter: any = {};
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;

    const contacts = await contactModel
      .find(filter)
      .sort({ createdAt: -1 })

    const total = await contactModel.countDocuments(filter);

    return Utilities.sendResponsData({
      code: 200,
      message: "Contacts fetched successfully",
      data: {
        contacts,
        pagination: {
          total,
          page,
          limit
        }
      }
    });
  } catch (error: any) {
    const err = error as Error;
    handleServerError(err, res);
  }
};
