import { Request, Response, NextFunction } from "express";
import { HTTP400Error, HTTP403Error } from "../../../utils/httpErrors";
import Joi, { any } from "joi";
import { Utilities } from "../../../utils/utilities";
import { errorMessageHander } from "../../../utils/ErrorHandler";
const addressTypes = ['home', 'office', 'other'];
export const validateAddress = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const schema = Joi.object({
    location: Joi.object({
      coordinates: Joi.array()
        .items(Joi.number())
        .length(2)
        .required()
        .messages({
          "array.base": "Coordinates must be an array of numbers",
          "array.length": "Coordinates must include [longitude, latitude]",
        }),
        type: Joi.string().trim().optional(),
        point: Joi.string().trim().optional()
    }).required(),
    street: Joi.string().trim().optional(),
    name: Joi.string().trim().optional(),
    city: Joi.string().trim().optional(),
    state: Joi.string().trim().required().messages({
      "string.empty": "State cannot be empty",
    }),
    country: Joi.string().trim().required().messages({
      "string.empty": "Country cannot be empty",
    }),
    zipCode: Joi.any().optional(),
    addressType: Joi.string()
    .valid(...addressTypes)
    .required()
    .messages({
      "any.only": `Address type must be one of: ${addressTypes.join(', ')}`,
      "string.empty": "Address type cannot be empty",
    })
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      let messageArr = errorMessageHander(error.details);
      res.status(400).json(
        Utilities.sendResponsData({
        code:400,
        message: messageArr[0],
      }));
    }
    req.body = value;
    next();
};
