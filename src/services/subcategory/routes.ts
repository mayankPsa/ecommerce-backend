import { NextFunction, Request, Response } from "express";
import {
  addSubCategory,
  deleteSubCategory,
  getSubCategoryList,
  updateSubCategory
} from "./controller";
import { validate } from './middleware/check';
import { checkAuthenticate } from "../auth/middleware/check";
import { AUTHORIZATION } from "../../constants";
import { uploadFile } from "../../utils/FileUploadUtilities";

const basePath = process.env.BASE_PATH;
const currentPath = "subcategory";
const currentPathURL = basePath + currentPath;


export default [
  {
    path: currentPathURL,
    method: "post",
    handler: [
      uploadFile("photos", true),
      checkAuthenticate,
      validate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await addSubCategory(req.get(AUTHORIZATION), req, next, res);
        res.status(200).send(result);
      }
    ]
  },
  {
    path: currentPathURL,
    method: "get",
    handler: [
      checkAuthenticate,
      validate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await getSubCategoryList(req.get(AUTHORIZATION), req, res);
        res.status(200).send(result);
      }
    ]
  },

  {
    path: currentPathURL + '/:id',
    method: "delete",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await deleteSubCategory(req, res);
        res.status(200).send(result);
      }
    ]
  },

  {
    path: currentPathURL + '/:id',
    method: "put",
    handler: [
      uploadFile("photos", true),
      checkAuthenticate,
      validate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await updateSubCategory(req.get(AUTHORIZATION), req, next, res);
        res.status(200).send(result);
      }
    ]
  }
];
