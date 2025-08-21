import { Request, Response } from "express";
import {
  getAnalytics
} from "./controller";
import { checkAuthenticate } from "../../auth/middleware/check";
import { AUTHORIZATION } from "../../../constants";

const basePath = process.env.BASE_PATH;
const currentPath = "admin";
const currentPathURL = basePath + currentPath;

export default [
  {
    path: currentPathURL + "/dashboard",
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await getAnalytics(req.get(AUTHORIZATION), req.query, res);
        res.status(200).send(result);
      },
    ],
  },
];
