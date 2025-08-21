import { NextFunction, Request, Response } from "express";
import {
  getCustomerOrderList,
  getOrderAnalytics,
  getOrderById,
  getOrderList,
  getPartnerRevenue,
  updateOrderStatus
} from "./controller";
import { checkAuthenticate, checkPartnerAuthenticate } from "../auth/middleware/check";
import { AUTHORIZATION } from "../../constants";

const basePath = process.env.BASE_PATH;
const currentPath = "partner/order";
const currentPathURL = basePath + currentPath;

export default [
  {
    path: currentPathURL + '/revenue',
    method: "get",
    handler: [
      checkAuthenticate,
      checkPartnerAuthenticate,
      async (req: Request, res: Response) => {
        const result = await getPartnerRevenue(req.get(AUTHORIZATION), res, req.query);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: `${currentPathURL}/analytics`,
    method: "get",
    handler: [
      checkAuthenticate,
      checkPartnerAuthenticate,
      async (req: Request, res: Response) => {
        const result = await getOrderAnalytics(req.get(AUTHORIZATION), req.query, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + '/:id',
    method: "get",
    handler: [
      checkAuthenticate,
      checkPartnerAuthenticate,
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
      checkPartnerAuthenticate,
      async (req: Request, res: Response) => {
        const result = await getOrderList(req.get(AUTHORIZATION), req.query, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + '/customerOrders/:customerId',
    method: "get",
    handler: [
      checkAuthenticate,
      checkPartnerAuthenticate,
      async (req: Request, res: Response) => {
        const result = await getCustomerOrderList(req.get(AUTHORIZATION), req.query, req.params.customerId, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: `${currentPathURL}/:orderId/status`,
    method: "put",
    handler: [
      checkPartnerAuthenticate,
      async (req: Request, res: Response) => {
        const result = await updateOrderStatus(req.get(AUTHORIZATION), req.params.orderId, req.body, res);
        res.status(200).send(result);
      },
    ],
  },
  
  // {
  //   path: currentPathURL + "/calculate",
  //   method: "post",
  //   handler: [
  //     checkPartnerAuthenticate,
  //     async (req: Request, res: Response, next:NextFunction) => {
  //       const result = await calculateAmount(req.get(AUTHORIZATION), req.body, next);
  //       res.status(200).send(result);
  //     },
  //   ],
  // }
];
