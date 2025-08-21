import { Request, Response } from "express";
import {
  getPolicy,
  upsertPolicy
} from "./controller";
import { checkAuthenticate } from "../auth/middleware/check";
import { AUTHORIZATION } from "../../constants";

const basePath = process.env.BASE_PATH;
const currentPath = "policy";
const currentPathURL = basePath + currentPath;

export default [
  {
    path: currentPathURL,
    method: "post",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await upsertPolicy(req.get(AUTHORIZATION), req.body, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL,
    method: "get",
    handler: [
      async (req: Request, res: Response) => {
        const result = await getPolicy(res);
        res.status(200).send(result);
      },
    ],
  }
];
