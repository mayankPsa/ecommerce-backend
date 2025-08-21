import { Request, Response, NextFunction } from "express";
import { HTTP400Error, HTTP403Error } from "../../../utils/httpErrors";
import Joi, { any } from "joi";
import { Utilities } from "../../../utils/utilities";
import { errorMessageHander } from "../../../utils/ErrorHandler";

export const validateDeliveryOption = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const schema = Joi.object({
    serviceFee: Joi.number().optional().messages({
      "number.base": "Service fee must be a number",
    }),
    deliveryType: Joi.string().optional().messages({
      "string.base": "Delivery type must be a string",
    }),
    duration: Joi.number().optional().messages({
      "number.base": "Duration must be a number",
    }),
    additionalTime: Joi.number().optional().messages({
      "number.base": "Duration must be a number",
    }),
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const messageArr = errorMessageHander(error.details);
    res.status(400).json(
      Utilities.sendResponsData({
      code:400,
      message: messageArr[0],
    }));
  } else {
    req.body = value;
    next();
  }
};