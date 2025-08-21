import { NextFunction, Request, Response } from "express";
import {
  addCategory,
  getCategoryList,
  deleteCategory,
  updateCategory,
  getCategoryDetailById,
} from "./controller";
import { validate, validateCategory } from './middleware/check';
import { checkAuthenticate, checkPartnerAuthenticate } from "../auth/middleware/check";
import { AUTHORIZATION } from "../../constants";
import { uploadFile } from "../../utils/FileUploadUtilities";

const basePath = process.env.BASE_PATH;
const currentPath = "category";
const currentPathURL = basePath + currentPath;


export default [
  {
    path: currentPathURL,
    method: "post",
    handler: [
      // uploadFile("image", true),
      checkPartnerAuthenticate,
      // validateCategory,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await addCategory(req.get(AUTHORIZATION), req, res);
        res.status(200).send(result);
      }
    ]
  },

  // Customer Category List 
  {
    path: currentPathURL + '/:id',
    method: "get",
    handler: [
      // checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await getCategoryList(req.get(AUTHORIZATION), req.query, req.params.id, res, "customer");
        res.status(200).send(result);
      }
    ]
  },
  // Partner Category List 
  {
    path: currentPathURL + '/partner/:id',
    method: "get",
    handler: [
      // checkAuthenticate,
      // checkPartnerAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await getCategoryList(req.get(AUTHORIZATION), req.query, req.params.id, res, 'partner');
        res.status(200).send(result);
      }
    ]
  },
  {
    path: currentPathURL + '/detail/:id',
    method: "get",
    handler: [
      checkAuthenticate,
      checkPartnerAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await getCategoryDetailById(req.get(AUTHORIZATION), req.params.id, res);
        res.status(200).send(result);
      }
    ]
  },
  {
    path: currentPathURL + '/:id',
    method: "delete",
    handler: [
      checkAuthenticate,
      checkPartnerAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await deleteCategory(req.get(AUTHORIZATION), req.params.id, req,res);
        res.status(200).send(result);
      }
    ]
  },

  {
    path: currentPathURL + '/:id',
    method: "put",
    handler: [
      uploadFile("image", true),
      // checkAuthenticate,
      // validate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await updateCategory(req.get(AUTHORIZATION), req, res);
        res.status(200).send(result);
      }
    ]
  }
];
