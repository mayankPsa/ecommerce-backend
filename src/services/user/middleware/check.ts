import { Request, Response, NextFunction } from "express";
import { HTTP400Error, HTTP403Error } from "../../../utils/httpErrors";
import Joi, { any } from "joi";
import { Utilities } from "../../../utils/utilities";
import { errorMessageHander } from "../../../utils/ErrorHandler";

export const validate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const schema = Joi.object({
    name: Joi.string().trim(true).required().messages({
      "string.empty": "Name cannot be empty",
    }),
    profilePicture: Joi.string().trim(true).required().messages({
      "string.empty": "Profile Picture cannot be empty",
    }),
    email: Joi.string().email().trim(true).required().messages({
      "string.empty": "Email cannot be empty",
      "string.email": "Email should be a valid email"
    }),
    password: Joi.string()
      .trim(true)
      .min(8)
      .pattern(new RegExp('^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$'))
      .messages({
        "string.empty": "Password cannot be empty",
        "string.min": "Password must include at least 8 characters",
        "string.pattern.base": "Password must include at least 1 number, 1 uppercase letter, and 1 special character"
      })
  });

  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
  });

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

export const validateProfile = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const schema = Joi.object({
    name: Joi.string()
      .pattern(/^[A-Za-z\s]+$/)
      .trim(true)
      .required()
      .messages({
        "string.empty": "Name cannot be empty",
        "string.pattern.base": "Name can only contain letters and spaces",
      }),

    email: Joi.string()
      .email()
      .trim(true)
      .required()
      .messages({
        "string.empty": "Email cannot be empty",
        "string.email": "Email should be a valid email",
      }),

    dob: Joi.date()
      .required()
      .less(new Date(new Date().setFullYear(new Date().getFullYear() - 18)))
      .messages({
        "date.base": "Date of birth must be a valid date",
        "any.required": "Date of birth is required",
        "date.less": "You must be at least 18 years old",
      }),

    phone: Joi.string()
      .pattern(/^\d{10}$/)
      .required()
      .messages({
        "string.empty": "Phone number is required",
        "string.pattern.base": "Phone number must be exactly 10 digits",
      }),

    gender: Joi.string().optional().messages({
      "string.base": "Gender must be a string",
    }),
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const messageArr = errorMessageHander(error.details);
    res.status(400).json(
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
export const validateCategory = (req: Request, res: Response, next: NextFunction) => {
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