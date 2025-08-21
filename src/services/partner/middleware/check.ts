import { Request, Response, NextFunction } from "express";
import { HTTP400Error, HTTP403Error } from "../../../utils/httpErrors";
import Joi, { any } from "joi";
import { Utilities } from "../../../utils/utilities";
import { errorMessageHander } from "../../../utils/ErrorHandler";

export const validateCategory = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const schema = Joi.object({
    name: Joi.string().trim(true).required().messages({
      "string.empty": "Name can not be empty",
    }),
    photo: Joi.string().trim(true).messages({
      "string.empty": "Name can not be empty",
    }),
  });
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    let messageArr = errorMessageHander(error.details);
    throw new HTTP400Error(
      Utilities.sendResponsData({
        code: 400,
        message: messageArr[0],
      })
    );
  } else {
    req.body = value;
    next();
  }
};

export const validatePartnerProfile = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // Matches HH:mm format

  console.log("validation partner wokring >>>")

  const schema = Joi.object({
    name: Joi.string()
      .pattern(/^[A-Za-z\s]+$/)
      .trim()
      .required()
      .messages({
        "string.empty": "Name cannot be empty",
        "string.pattern.base": "Name can only contain letters and spaces",
      }),

    email: Joi.string().email().trim().required().messages({
      "string.empty": "Email cannot be empty",
      "string.email": "Email should be a valid email",
    }),

    phoneNumber: Joi.string()
      .pattern(/^\d{10}$/)
      .required()
      .messages({
        "string.empty": "Phone number is required",
        "string.pattern.base": "Phone number must be exactly 10 digits",
      }),

    openingTime: Joi.string().required().messages({
      "string.empty": "Opening time is required",
    }),

    closingTime: Joi.string().required().messages({
      "string.empty": "Closing time is required",
    }),

    city: Joi.string().trim().required().messages({
      "string.empty": "City is required",
    }),

    street: Joi.string().trim().required().messages({
      "string.empty": "City is required",
    }),
    address: Joi.string().trim().required().messages({
      "string.empty": "Address is required",
    }),

    laundryName: Joi.any().optional(),

    postalCode: Joi.string().trim().required().messages({
      "string.empty": "Postal code is required",
    }),
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    let messageArr = errorMessageHander(error.details);
    console.log("messageArr", messageArr);
    throw new HTTP400Error(
      Utilities.sendResponsData({
        code: 400,
        message: messageArr[0],
      })
    );
  } else {
    req.body = value;
    next();
  }
};
