import { Request, Response } from "express";
import {
  getNotifications,
  markNotificationAsRead
} from "./controller";
import { checkAuthenticate } from "../auth/middleware/check";
import { AUTHORIZATION } from "../../constants";

const basePath = process.env.BASE_PATH;
const currentPath = "notifications";
const currentPathURL = basePath + currentPath;

export default [
  {
    path: currentPathURL,
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await getNotifications(req.get(AUTHORIZATION), req.query, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + "/mark-read",
    method: "post",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await markNotificationAsRead(req.get(AUTHORIZATION), req.body, res);
        res.status(200).send(result);
      },
    ],
  }
 ];
