import { NextFunction, Request, Response } from "express";
import {
  getOrderById,
  getOrderList,
  updateOrderStatus
} from "./controller";
import { checkAuthenticate } from "../../auth/middleware/check";
import { AUTHORIZATION } from "../../../constants";

const basePath = process.env.BASE_PATH;
const currentPath = "admin/order";
const currentPathURL = basePath + currentPath;

export default [
  {
    path: currentPathURL + '/:id',
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await getOrderById(req.get(AUTHORIZATION), req.params.id, res);
        res.status(200).send(result);
      }
    ]
  },
  {
    path: currentPathURL,
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await getOrderList(req.get(AUTHORIZATION), req.query, res);
        res.status(200).send(result);
      },
    ],
  },

  {
    path: currentPathURL + "/update-status/:id",
    method: "put",
    handler: [
      checkAuthenticate,
      async (req: any, res: Response) => {
        const result = await updateOrderStatus(req, res);
        res.status(200).send(result);
      },
    ],
  },

];
