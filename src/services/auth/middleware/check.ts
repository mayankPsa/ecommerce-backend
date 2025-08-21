import { Request, Response, NextFunction } from "express";
import { HTTP400Error } from "../../../utils/httpErrors";
import Joi from "joi";
import { Utilities } from "../../../utils/utilities";
import { errorMessageHander, handleServerError } from "../../../utils/ErrorHandler";
import { AUTHORIZATION, COUNTRYCODE_EXP, COUNTRYCODE_REQUIRED, DEFAULT_ERROR_LOG, EMAIL_REGEX, EMAIL_REQUIRED, EMAIL_VALIDATION, INVALID_EMAIL_FORMAT, NAME_REQUIRED, OTP_REQUIRED, PASSWORD__REGEX, PASSWPRD_EXP, PASSWPRD_LENGTH_VALIDATION, PASSWORD_REQUIRED, PHONENUMBER_EXP, PHONENUMBER_REQUIRED, VALIDATION_ERROR, MATCH_CONFIRM_PASSWORD_REQUIRED, CONFIRM_PASSWORD_REQUIRED, POINT, LOCATION_TYPE_REQUIRED, INVALID_LOCATION_TYPE, INVALID_COORDINATES, LONGITUDE_MIN_ERROR, LONGITUDE_MAX_ERROR, LATITUDE_MIN_ERROR, LATITUDE_MAX_ERROR, COORDINATES_LENGTH_ERROR, COORDINATES_REQUIRED_ERROR, LOCATION_REQUIRED, ADDRESS_TYPE_ERROR, FCM_TOKEN_REQUIRED } from "../../../constants";
import jwt, { JwtPayload } from "jsonwebtoken";
import { userModel } from "../../../db/User";
import { partnerModel } from "../../../db/Partners";

export const validate = async (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    email: Joi.string().email().trim(true).required().messages({
      "string.empty": "Email can not be empty",
      "string.email": `Email should be a valid email`
    }),
    password: Joi.string()
      .trim(true)
      .min(8)
      .pattern(new RegExp('^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$'))
      .required()
      .messages({
        "string.empty": "Password can not be empty",
        "string.min": "Password must include atleast 8 characters",
        "string.pattern.base": "Password must include at least 1 number, 1 uppercase letter, and 1 special character"
      })
  });
  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    let messageArr = errorMessageHander(error.details);
    res.status(400).json(
      Utilities.sendResponsData({
        code: 400,
        message: messageArr[0],
      }));
  }
  req.body = value;
  next();
};

export const checkAuthenticate = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.get('Authorization');

  if (!token) {
    return res.status(401).json({
      responseCode: 401,
      responseMessage: 'Token is required',
      data: {},
    });
  }

  const jwtSecretKey = process.env.JWT_SECRET_KEY || 'your_default_fallback';

  try {
    const decoded: any = jwt.verify(token, jwtSecretKey); // Verifies expiration

    // Check token against DB
    // const user = await userModel.findById(decoded.id);
    // if (!user || user.accessToken !== token) {
    //   return res.status(401).json({
    //     responseCode: 401,
    //     responseMessage: 'Token is invalid or revoked',
    //     data: {},
    //   });
    // }

    const userId = decoded.id;
    const [user, partner] = await Promise.all([
      userModel.findById(userId),
      partnerModel.findById(userId)
    ]);

    const account = user || partner;
    console.log('account==>',account.accessToken, '===email==',account.email);
    console.log('token==>',token)    

    if (!account || account.accessToken !== token) {
      return res.status(401).json({
        responseCode: 401,
        responseMessage: 'Token is invalid or revoked',
        data: {},
      });
    }

    (req as any).user = decoded;
    next();
  } catch (err: any) {
    console.log('JWT Error:', err);
    return res.status(401).json({
      responseCode: 401,
      responseMessage: err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token',
      data: {},
    });
  }
};

export const checkAuthenticateOld = (req: Request, res: Response, next: NextFunction) => {
  const token: any = req.get(AUTHORIZATION);
  Utilities.verifyToken(token)
    .then((result: any) => {
      next();
    })
    .catch((error: any) => {
      res
        .status(403)
        .send({ responseCode: 403, responseMessage: error.message, data: {} });
    });
};

export const checkPartnerAuthenticate = (req: Request, res: Response, next: NextFunction) => {
  const token: any = req.get(AUTHORIZATION);
  console.log(token, ">>> ")
  Utilities.verifyPartnerToken(token)
    .then((result: any) => {
      next();
    })
    .catch((error: any) => {
      console.log(error, ">> token error ")
      res
        .status(403)
        .send({ responseCode: 403, responseMessage: error.message, data: {} });
    });
};

export const checkForgotPassword = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    email: Joi.string().email().trim(true).required().messages({
      "string.empty": EMAIL_REQUIRED,
      "string.email": EMAIL_VALIDATION
    }),
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    let messageArr = errorMessageHander(error.details);
    res.status(400).json(
      Utilities.sendResponsData({
        code: 400,
        message: messageArr[0],
      }));
  }
  req.body = value;
  next();
};

export const checkSignup = async (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    name: Joi.string()
      .trim()
      .required()
      .pattern(/^[A-Za-z\s]+$/)
      .custom((value, helpers) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(value)) {
          return helpers.error("any.invalid");
        }
        return value;
      })
      .messages({
        "string.empty": NAME_REQUIRED,
        "string.pattern.base": "Name must only contain letters and spaces",
        "any.invalid": "Name cannot be an email address",
      }),
    fcmToken: Joi.string().optional().allow('').messages({
      "string.empty": FCM_TOKEN_REQUIRED,
    }),
    email: Joi.string()
      .email()
      .trim()
      .pattern(new RegExp(EMAIL_REGEX))
      .required()
      .messages({
        "string.empty": EMAIL_REQUIRED,
        "string.email": INVALID_EMAIL_FORMAT,
        "string.pattern.base": INVALID_EMAIL_FORMAT,
      }),
    countryCode: Joi.string()
      .pattern(/^\+\d+$/)
      .required()
      .messages({
        "string.empty": COUNTRYCODE_REQUIRED,
        "string.pattern.base": COUNTRYCODE_EXP,
      }),
    phone: Joi.string()
      .pattern(/^\d{10,15}$/)
      .required()
      .messages({
        "string.empty": PHONENUMBER_REQUIRED,
        "string.pattern.base": PHONENUMBER_EXP,
      }),
    password: Joi.string()
      .trim(true)
      .min(8)
      .pattern(new RegExp(PASSWORD__REGEX))
      .required()
      .messages({
        "string.empty": PASSWORD_REQUIRED,
        "string.min": PASSWPRD_LENGTH_VALIDATION,
        "string.pattern.base": PASSWPRD_EXP,
      }),
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    let messageArr = errorMessageHander(error.details);
    res.status(400).json(
      Utilities.sendResponsData({
        code: 400,
        message: messageArr[0],
      }));
  }
  req.body = value;
  next();
};

export const checkOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const schema = Joi.object({
    email: Joi.string().email().trim(true).required().messages({
      "string.empty": EMAIL_REQUIRED,
      "string.email": EMAIL_VALIDATION
    }),
    otp: Joi.string().trim(true).required().messages({
      "string.empty": OTP_REQUIRED
    })
  });
  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    let messageArr = errorMessageHander(error.details);
    res.status(400).json(
      Utilities.sendResponsData({
        code: 400,
        message: messageArr[0],
      }));
  }
  req.body = value;
  next();
};

export const checkPassword = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const schema = Joi.object({
    email: Joi.string().email().trim(true).required().messages({
      "string.empty": EMAIL_REQUIRED,
      "string.email": EMAIL_VALIDATION
    }),
    password: Joi.string()
      .trim(true)
      .min(8)
      .pattern(new RegExp(PASSWORD__REGEX))
      .required()
      .messages({
        "string.empty": PASSWORD_REQUIRED,
        "string.min": PASSWPRD_LENGTH_VALIDATION,
        "string.pattern.base": PASSWPRD_EXP
      })
  });
  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    let messageArr = errorMessageHander(error.details);
    res.status(400).json(
      Utilities.sendResponsData({
        code: 400,
        message: messageArr[0],
      }));
  }
  req.body = value;
  next();
};

export const checkResendOTP = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const schema = Joi.object({
    email: Joi.string().email().trim(true).required().messages({
      "string.empty": EMAIL_REQUIRED,
      "string.email": EMAIL_VALIDATION
    })
  });
  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    let messageArr = errorMessageHander(error.details);
    res.status(400).json(
      Utilities.sendResponsData({
        code: 400,
        message: messageArr[0],
      }));
  }
  req.body = value;
  next();
};

export const checkCreateNewPassword = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    email: Joi.string().email().trim(true).required().messages({
      "string.empty": EMAIL_REQUIRED,
      "string.email": EMAIL_VALIDATION
    }),
    password: Joi.string()
      .trim(true)
      .min(8)
      .pattern(new RegExp('^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$'))
      .required()
      .messages({
        "string.empty": PASSWORD_REQUIRED,
        "string.min": PASSWPRD_LENGTH_VALIDATION,
        "string.pattern.base": PASSWPRD_EXP
      }),
    confirmPassword: Joi.string()
      .trim(true)
      .valid(Joi.ref('password'))
      .required()
      .messages({
        "any.only": MATCH_CONFIRM_PASSWORD_REQUIRED,
        "string.empty": CONFIRM_PASSWORD_REQUIRED
      })
  });
  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    let messageArr = errorMessageHander(error.details);
    res.status(400).json(
      Utilities.sendResponsData({
        code: 400,
        message: messageArr[0],
      }));
  }
  req.body = value;
  next();
};

export const checkLogin = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    email: Joi.string().email().trim().required().messages({
      "string.empty": EMAIL_REQUIRED,
      "string.email": INVALID_EMAIL_FORMAT,
    }),
    password: Joi.string().trim().required().messages({
      "string.empty": PASSWORD_REQUIRED,
    }),
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    let messageArr = errorMessageHander(error.details);
    res.status(400).json(
      Utilities.sendResponsData({
        code: 400,
        message: messageArr[0],
      }));
  }
  req.body = value;
  next();
};

export const validateOnboardingLocation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const schema = Joi.object({
      location: Joi.object({
        type: Joi.string()
          .valid(POINT)
          .required()
          .messages({
            'any.only': INVALID_LOCATION_TYPE,
            'any.required': LOCATION_TYPE_REQUIRED,
          }),
        coordinates: Joi.array()
          .items(
            Joi.number()
              .min(-180)
              .max(180)
              .messages({
                'number.base': INVALID_COORDINATES,
                'number.min': LONGITUDE_MIN_ERROR,
                'number.max': LONGITUDE_MAX_ERROR,
              }),
            Joi.number()
              .min(-90)
              .max(90)
              .messages({
                'number.base': INVALID_COORDINATES,
                'number.min': LATITUDE_MIN_ERROR,
                'number.max': LATITUDE_MAX_ERROR,
              })
          )
          .length(2)
          .required()
          .messages({
            'array.base': INVALID_COORDINATES,
            'array.length': COORDINATES_LENGTH_ERROR,
            'any.required': COORDINATES_REQUIRED_ERROR,
          }),
      }).required().messages({
        'any.required': LOCATION_REQUIRED,
      }),
      address: Joi.string()
        .optional()
        .allow('')
        .messages({
          'string.base': ADDRESS_TYPE_ERROR,
        }),
    }).options({ abortEarly: false }); // Return all validation errors, not just the first one

    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      let messageArr = errorMessageHander(error.details);
      res.status(400).json(
        Utilities.sendResponsData({
          code: 400,
          message: messageArr[0],
        }));
    }
    next();
  } catch (error) {
    console.error(DEFAULT_ERROR_LOG, error);
    handleServerError(error, res);
  }
};

export const checkCommonAuthenticate = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.get('Authorization');

  if (!token) {
    return res.status(401).json({
      responseCode: 401,
      responseMessage: 'Token is required',
      data: {},
    });
  }

  const jwtSecretKey = process.env.JWT_SECRET_KEY || 'your_default_fallback';

  try {
    const decoded: any = jwt.verify(token, jwtSecretKey); // Verifies expiration

    // Check token against DB
    // const user = await userModel.findById(decoded.id);
    // const partner = await partnerModel.findById(decoded.id);

    // if ((!user || user.accessToken !== token) || (!partner || partner.accessToken !== token)) {
    //   return res.status(401).json({
    //     responseCode: 401,
    //     responseMessage: 'Token is invalid or revoked',
    //     data: {},
    //   });
    // }

    const user = await userModel.findById(decoded.id);
    const partner = await partnerModel.findById(decoded.id);

    if (user) {
      if (user.accessToken !== token) {
        return res.status(401).json({
          responseCode: 401,
          responseMessage: 'Token is invalid or revoked',
          data: {},
        });
      }
    } else if (partner) {
      if (partner.accessToken !== token) {
        return res.status(401).json({
          responseCode: 401,
          responseMessage: 'Token is invalid or revoked',
          data: {},
        });
      }
    } else {
      return res.status(401).json({
        responseCode: 401,
        responseMessage: 'User not found',
        data: {},
      });
    }

    (req as any).user = decoded;
    next();
  } catch (err: any) {
    console.log('JWT Error:', err);
    return res.status(401).json({
      responseCode: 401,
      responseMessage: err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token',
      data: {},
    });
  }
};