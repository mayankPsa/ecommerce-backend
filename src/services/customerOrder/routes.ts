import { NextFunction, Request, Response } from "express";
import {
  calculateAmount,
  calculateTransportationFee,
  cancelOrder,
  createOrder,
  getOrderById,
  getOrderList,
} from "./controller";
import { checkAuthenticate, checkPartnerAuthenticate } from "../auth/middleware/check";
import { AUTHORIZATION } from "../../constants";
import { validateOrder, validatePickupAndDeliveryAddress } from "./middleware/check";

const basePath = process.env.BASE_PATH;
const currentPath = "order";
const currentPathURL = basePath + currentPath;

export default [
  {
    path: currentPathURL + "/create",
    method: "post",
    handler: [
      checkAuthenticate,
      validateOrder,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await createOrder(req.get(AUTHORIZATION), req, res);
        res.status(200).send(result);
      }
    ]
  },
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
    path: currentPathURL + "/calculate",
    method: "post",
    handler: [
      checkAuthenticate,
      async (req: Request, res: any, next: NextFunction) => {
        const result = await calculateAmount(req.get(AUTHORIZATION), req.body, next, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + "/calculate-transportation-fee",
    method: "post",
    handler: [
      checkAuthenticate,
      validatePickupAndDeliveryAddress,
      async (req: Request, res: any, next: NextFunction) => {
        const result = await calculateTransportationFee(req.get(AUTHORIZATION), req.body, next, res, req);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: `${currentPathURL}/cancel/:orderId`,
    method: "put",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await cancelOrder(req.get(AUTHORIZATION), req.params.orderId, req.body, res);
        res.status(200).send(result);
      },
    ],
  }
];
