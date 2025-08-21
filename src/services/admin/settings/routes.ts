import { NextFunction, Request, Response } from "express";
import {
  addSettings,
  deleteSettingsById,
  getSettings,
  getSettingsById,
  updateSettings,
} from "./controller";
import { AUTHORIZATION } from "../../../constants";
import { checkAuthenticate } from "../../auth/middleware/check";

const basePath = process.env.BASE_PATH;
const currentPath = "admin/settings";
const currentPathURL = basePath + currentPath;

export default [
  {
    path: currentPathURL + "/add",
    method: "post",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await addSettings(req, res);
        res.status(201).send(result);
      },
    ],
  },
  {
    path: currentPathURL + "/update/:id",
    method: "put",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await updateSettings(req, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + "/detail/:id",
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await getSettingsById(req, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL ,
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await getSettings(req.query, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + "/:id",
    method: "delete",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await deleteSettingsById(req, res);
        res.status(200).send(result);
      },
    ],
  }  
];
