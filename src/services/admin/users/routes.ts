import { NextFunction, Request, Response } from "express";
import { getUserById, getUserList } from "./controller";
import { checkAuthenticate } from "../../auth/middleware/check";
import { AUTHORIZATION } from "../../../constants";

const basePath = process.env.BASE_PATH;
const currentPath = "admin/user";
const currentPathURL = basePath + currentPath;

export default [
  {
    path: currentPathURL + "/:id",
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await getUserById(req.get(AUTHORIZATION), req.params.id, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL,
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await getUserList(req.get(AUTHORIZATION), req.query, res);
        res.status(200).send(result);
      },
    ],
  },
];
