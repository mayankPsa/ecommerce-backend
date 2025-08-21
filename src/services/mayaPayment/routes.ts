import { NextFunction, Request, Response } from "express";
import {
  createWallet
} from "./controller";
import { checkAuthenticate, checkPartnerAuthenticate } from "../auth/middleware/check";
import { AUTHORIZATION } from "../../constants";

const basePath = process.env.BASE_PATH;
const currentPath = "payment";
const currentPathURL = basePath + currentPath;

export default [
  {
    path: currentPathURL + "/create-wallet",
    method: "post",
    handler: [
      // checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await createWallet(req.get(AUTHORIZATION), req, res);
        res.status(200).send(result);
      }
    ]
  },
];
