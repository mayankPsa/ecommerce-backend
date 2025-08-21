import { Request, Response } from "express";
import {
  createContact,
  getContacts,
} from "./controller";
import { checkAuthenticate } from "../auth/middleware/check";

const basePath = process.env.BASE_PATH;
const currentPath = "contactUs";
const currentPathURL = basePath + currentPath;

export default [
  {
    path: currentPathURL,
    method: "post",
    handler: [
      async (req: Request, res: Response) => {
        const result = await createContact(req.body, res);
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
        const result = await getContacts(req.query, res);
        res.status(200).send(result);
      }
    ]
  }
  
];
