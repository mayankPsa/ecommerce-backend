import { Request, Response, NextFunction } from "express";
import { HTTP400Error } from "../../../utils/httpErrors";
import Joi, { any } from "joi";
import { Utilities } from "../../../utils/utilities";
import { errorMessageHander } from "../../../utils/ErrorHandler";
import { NAME_REQUIRED } from "../../../constants";

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    name: Joi.string().trim(true).required().messages({
      "string.empty": NAME_REQUIRED,
    })
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
