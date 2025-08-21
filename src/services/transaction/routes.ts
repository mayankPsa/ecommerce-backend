import { NextFunction, Request, Response } from "express";
import {
  createPayment,
  getAllTransactions,
  getTransactionById
} from "./controller";
import { checkAuthenticate } from "../auth/middleware/check";
import { AUTHORIZATION } from "../../constants";

const basePath = process.env.BASE_PATH;
const currentPath = "transaction";
const currentPathURL = basePath + currentPath;

export default [
  {
    path: currentPathURL + "/create",
    method: "post",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await createPayment(req.get(AUTHORIZATION), req, res);
        res.status(200).send(result);
      }
    ]
  },
  {
    path: `${currentPathURL}/:id`,
    method: 'get',
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await getTransactionById(req.get(AUTHORIZATION), req.params.id, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL,
    method: 'get',
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await getAllTransactions(req.get(AUTHORIZATION), req.query, res);
        res.status(200).send(result);
      },
    ],
  }
];
