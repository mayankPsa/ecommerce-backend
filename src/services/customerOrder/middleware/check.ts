import { Request, Response, NextFunction } from "express";
import { HTTP400Error } from "../../../utils/httpErrors";
import Joi, { any } from "joi";
import { Utilities } from "../../../utils/utilities";
import { errorMessageHander } from "../../../utils/ErrorHandler";
import { NAME_REQUIRED, PARTNER_ID_REQUIRED } from "../../../constants";

export const validateOrder = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const schema = Joi.object({
    // categoryId: Joi.string().required().messages({
    //   "string.empty": "Category ID is required",
    // }),
    // cartId: Joi.string().required().messages({
    //   "string.empty": "Cart ID is required",
    // }),
    instructions: Joi.string().optional().allow('').messages({
      "string.empty": "Instructions cannot be empty",
    }),
    // type: Joi.string().valid("bag", "kg").required().messages({
    //   "any.only": "Type must be either 'bag' or 'kg'",
    //   "any.required": "Type is required",
    // }),
    // weight: Joi.number().optional().messages({
    //   "number.base": "Weight must be a number",
    // }),
    // bags: Joi.number().integer().optional().messages({
    //   "number.base": "Bags must be a number",
    // }),
    partnerId: Joi.string().required().messages({
      "string.empty": "Partner ID is required",
    }),
    customerId: Joi.string().required().messages({
      "string.empty": "Customer ID is required",
    }),
    pickupDate: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required()
      .messages({
        "string.pattern.base": "Pickup date must be in YYYY-MM-DD format",
        "any.required": "Pickup date is required",
      }),
    pickupTime: Joi.string()
    .pattern(/^([0-1]?[0-9]):[0-5][0-9] (AM|PM) - ([0-1]?[0-9]):[0-5][0-9] (AM|PM)$/)
      .required()
      .messages({
        "string.pattern.base": "Pickup time must be in HH:MM:A - HH:MM:A format",
        "any.required": "Pickup time is required",
      }),
    // deliveryTime: Joi.string()
    //   .pattern(/^([0-1]?[0-9]):[0-5][0-9] (AM|PM) - ([0-1]?[0-9]):[0-5][0-9] (AM|PM)$/)
    //     .required()
    //     .messages({
    //       "string.pattern.base": "Pickup time must be in HH:MM:A - HH:MM:A format",
    //       "any.required": "Pickup time is required",
    //     }),
    deliveryOption: Joi.string().required().messages({
      "string.empty": "Delivery option is required",
    }),
    customerAddressId: Joi.string().required().messages({
      "string.empty": "Customer address ID is required",
    }),
    deliveryAddressId: Joi.string().required().messages({
      "string.empty": "Delivery address ID is required",
    }),
    amount: Joi.number().required().messages({
      "number.base": "Amount must be a number",
      "any.required": "Amount is required",
    }),
    expressFee: Joi.number().required().messages({
      "number.base": "Amount must be a number",
      "any.required": "Express Fee is required",
    }),
    netAmount: Joi.number().required().messages({
      "number.base": "Amount must be a number",
      "any.required": "Net Amount is required",
    }),
    transportation: Joi.number().required().messages({
      "number.base": "Amount must be a number",
      "any.required": "Transaportation is required",
    }),
    paymentType: Joi.string().optional().messages({
      "string.base": "Payment type must be a string",
    }),
    // services: Joi.array()
    // .items(
    //   Joi.object({
    //     type: Joi.string()
    //       .valid("bag", "kg") // replace with `...weightType` if it's a constant enum array
    //       .required()
    //       .messages({
    //         "any.required": "Service type is required",
    //         "any.only": "Service type must be one of 'bag' or 'kg'",
    //       }),
    //     amount: Joi.number().required().messages({
    //       "number.base": "Service amount must be a number",
    //       "any.required": "Service amount is required",
    //     }),
    //     serviceId: Joi.string().optional().allow(null).messages({
    //       "string.base": "Service ID must be a string or null",
    //     })
    //   })
    // )
    // .required()
    // .messages({
    //   "array.base": "Services must be an array of service objects",
    //   "any.required": "Services are required",
    // }),
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {

    const messageArr = errorMessageHander(error.details);
    console.log(messageArr,">>> message Arr")
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

export const validatePickupAndDeliveryAddress = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const schema = Joi.object({
    pickupAddress: Joi.object({
      location: Joi.object({
        type: Joi.string().valid("Point").required().messages({
          "any.only": "pickupAddress.location.type must be 'Point'",
          "any.required": "pickupAddress.location.type is required",
        }),
        coordinates: Joi.array()
          .length(2)
          .items(Joi.number().required())
          .required()
          .messages({
            "array.length":
              "pickupAddress.location.coordinates must have exactly two numbers",
            "any.required": "pickupAddress.location.coordinates is required",
          }),
      }).required().messages({
        "any.required": "pickupAddress.location is required",
      }),
    }).required().messages({
      "any.required": "pickupAddress is required",
    }),

    deliveryAddress: Joi.object({
      location: Joi.object({
        type: Joi.string().valid("Point").required().messages({
          "any.only": "deliveryAddress.location.type must be 'Point'",
          "any.required": "deliveryAddress.location.type is required",
        }),
        coordinates: Joi.array()
          .length(2)
          .items(Joi.number().required())
          .required()
          .messages({
            "array.length":
              "deliveryAddress.location.coordinates must have exactly two numbers",
            "any.required": "deliveryAddress.location.coordinates is required",
          }),
      }).required().messages({
        "any.required": "deliveryAddress.location is required",
      }),
    }).required().messages({
      "any.required": "deliveryAddress is required",
    }),
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const messageArr = errorMessageHander(error.details);
    return res.status(400).json(
      Utilities.sendResponsData({
        code: 400,
        message: messageArr[0],
      })
    );
  }

  req.body = value;
  next();
};