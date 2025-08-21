import { NextFunction, Request, Response } from "express";
import {
  addAddress,
  deleteAddress,
  getAllAddress,
  matchAddress,
  updateAddress
} from "./controller";
import { AUTHORIZATION } from "../../constants";
import { checkAuthenticate } from "../auth/middleware/check";
import { validateAddress } from "./middleware/check";

const basePath = process.env.BASE_PATH;
const currentPath = "customer";
const currentPathURL = basePath + currentPath;

export default [
  {
    path: currentPathURL + "/address",
    method: "post",
    handler: [
      checkAuthenticate,
      validateAddress,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await addAddress(req.get(AUTHORIZATION), req, res);
        res.status(200).send(result);
      },
    ],
  },
  // Get a list of partners
  {
    path: currentPathURL + "/address",
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await getAllAddress(req.get(AUTHORIZATION), req.query, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + "/address/:addressId",
    method: "put",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await updateAddress(req.get(AUTHORIZATION), req, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + "/address/:addressId",
    method: "delete",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await deleteAddress(req.get(AUTHORIZATION), req, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + "/matchAddress",
    method: "post",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await matchAddress(req.get(AUTHORIZATION), req, res);
        res.status(200).send(result);
      },
    ],
  },
];
