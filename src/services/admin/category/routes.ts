import { NextFunction, Request, Response } from "express";
import {
  addCategoryIcon,
  deleteIcon,
  getCategoryList,
  getIconDetail,
  getIconList,
  updateCategoryStatus,
  updateIcon,
} from "./controller";
import { checkAuthenticate } from "../../auth/middleware/check";
import { AUTHORIZATION } from "../../../constants";
import { uploadFile } from "../../../utils/FileUploadUtilities";


const basePath = process.env.BASE_PATH;
const currentPath = "admin/category";
const currentPathURL = basePath + currentPath;

export default [
  // Customer Category List 
  {
    path: currentPathURL,
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await getCategoryList(req.get(AUTHORIZATION), req.query, req.params.id, res);
        res.status(200).send(result);
      }
    ]
  },
  {
    path: currentPathURL + '/icons',
    method: "get",
    handler: [
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await getIconList(req.get(AUTHORIZATION), req.query, req.params.id, res);
        res.status(200).send(result);
      }
    ]
  },
  {
    path: currentPathURL + '/:id',
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await getCategoryList(req.get(AUTHORIZATION), req.query, req.params.id, res);
        res.status(200).send(result);
      }
    ]
  },
  {
    path: currentPathURL + '/icon',
    method: "post",
    handler: [
      uploadFile("photos", true),
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await addCategoryIcon(req.get(AUTHORIZATION), req, res);
        res.status(200).send(result);
      }
    ]
  },

  {
    path: currentPathURL + '/icon/:id',
    method: "delete",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await deleteIcon(req.get(AUTHORIZATION), req.params.id, res);
        res.status(200).send(result);
      }
    ]
  },

  {
    path: currentPathURL + "/update-status/:id",
    method: "put",
    handler: [
      checkAuthenticate,
      async (req: any, res: Response) => {
        const result = await updateCategoryStatus(req, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + '/icon/:id',
    method: "put",
    handler: [
      uploadFile("photos", true),
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await updateIcon(req.get(AUTHORIZATION), req, res);
        res.status(200).send(result);
      }
    ]
  },
  {
    path: currentPathURL + '/icon/:id',
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await getIconDetail(req.get(AUTHORIZATION), req.params.id, res);
        res.status(200).send(result);
      }
    ]
  },
];
