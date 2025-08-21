import { NextFunction, Request, Response } from "express";
import {
  createDeliveryOption,
  deleteDeliveryOption,
  getDeliveryOptionsList,
  updateDeliveryOption
} from "./controller";
import { AUTHORIZATION } from "../../constants";
import { checkAuthenticate } from "../auth/middleware/check";
import { validateDeliveryOption } from "./middleware/check";

const basePath = process.env.BASE_PATH;
const currentPath = "options";
const currentPathURL = basePath + currentPath;

export default [
  {
    path: currentPathURL,
    method: "get",
    handler: [
      async (req: Request, res: Response) => {
        const result = await getDeliveryOptionsList(req.get(AUTHORIZATION), req.query, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + "/create",
    method: "post",
    handler: [
      checkAuthenticate,
      validateDeliveryOption,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await createDeliveryOption(req.get(AUTHORIZATION), req, res);
        res.status(200).send(result);
      }
    ]
  },
  {
    path: currentPathURL + "/update/:id",
    method: "put",
    handler: [
      checkAuthenticate,
      validateDeliveryOption,
      async (req: Request, res: Response) => {
        const result = await updateDeliveryOption(req.get(AUTHORIZATION), req, res);
        res.status(200).send(result);
      }
    ]
  },
  {
    path: currentPathURL + "/delete/:id",
    method: "delete",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await deleteDeliveryOption(req.get(AUTHORIZATION), req, res);
        res.status(200).send(result);
      }
    ]
  }
];
