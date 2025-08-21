import { NextFunction, Request, Response } from "express";
import { deleteChat, getChat, getChatMessages, orderChatDetail, readChatMessages, updateChatStatus } from "./controller";
import { checkAuthenticate, checkCommonAuthenticate } from "../auth/middleware/check";
import { AUTHORIZATION } from "../../constants";

const basePath = process.env.BASE_PATH;
const currentPath = "chat";
const currentPathURL = basePath + currentPath;

export default [
  {
    path: `${currentPathURL}`,
    method: 'get',
    handler: [
      checkAuthenticate,
      checkCommonAuthenticate,
      async (req: Request, res: Response) => {
        const result = await getChat(req.get(AUTHORIZATION), req.query, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: `${currentPathURL}/orderChat`,
    method: 'get',
    handler: [
      checkAuthenticate,
      checkCommonAuthenticate,
      async (req: Request, res: Response) => {
        const result = await getChatMessages(req.get(AUTHORIZATION), req.query, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: `${currentPathURL}/deleteChat/:id`,
    method: 'delete',
    handler: [
      checkAuthenticate,
      checkCommonAuthenticate,
      async (req: Request, res: Response) => {
        const result = await deleteChat(req.get(AUTHORIZATION), req, res);
        res.status(200).send(result);
      },
    ],
  },

  {
    path: `${currentPathURL}/chatDetail/:id`,
    method: 'get',
    handler: [
      checkAuthenticate,
      checkCommonAuthenticate,
      async (req: Request, res: Response) => {
        const result = await orderChatDetail(req.get(AUTHORIZATION), req, res);
        res.status(200).send(result);
      },
    ],
  },

  {
    path: `${currentPathURL}`,
    method: 'put',
    handler: [
      checkAuthenticate,
      checkCommonAuthenticate,
      async (req: Request, res: Response) => {
        const result = await updateChatStatus(req.get(AUTHORIZATION), req.query, res);
        res.status(200).send(result);
      },
    ],
  },

  {
    path: `${currentPathURL}/readChat`,
    method: 'put',
    handler: [
      // checkAuthenticate,
      // checkCommonAuthenticate,
      async (req: Request, res: Response) => {
        const result = await readChatMessages(req.get(AUTHORIZATION), req.query, res);
        res.status(200).send(result);
      },
    ],
  }

];


