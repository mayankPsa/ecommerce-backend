import { NextFunction, Request, Response } from "express";
import { addToCart, deleteCart, getCart, updateCart } from "./controller";
import { checkAuthenticate } from "../auth/middleware/check";
import { AUTHORIZATION } from "../../constants";

const basePath = process.env.BASE_PATH;
const currentPath = "cart";
const currentPathURL = basePath + currentPath;

export default [
  {
    path: `${currentPathURL}/add-to-cart`,
    method: 'post',
    handler: [
      // checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await addToCart(req.get(AUTHORIZATION), req.body, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: `${currentPathURL}/get-cart`,
    method: 'get',
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await getCart(req.get(AUTHORIZATION), req.query, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: `${currentPathURL}/update-cart/:id`,
    method: 'put',
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await updateCart(req.params.id, req.body, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: `${currentPathURL}/delete-cart/:id`,
    method: 'delete',
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await deleteCart(req.get(AUTHORIZATION), req.params.id, res);
        res.status(200).send(result);
      },
    ],
  },
];
