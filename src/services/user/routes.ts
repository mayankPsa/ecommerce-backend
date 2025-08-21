import { NextFunction, Request, Response } from "express";
import {
  getUserList,
  getUserDetail,
  deleteUser,
  getUserProfile,
  updateProfile,
  blockUserByPartner,
  uploadFileData,
} from "./controller";
import { checkAuthenticate, checkPartnerAuthenticate } from "../auth/middleware/check";
import { AUTHORIZATION } from "../../constants";
import { uploadFile } from "../../utils/FileUploadUtilities";
import { validateProfile } from "./middleware/check";
const basePath = process.env.BASE_PATH;
const currentPath = "users";
const currentPathURL = basePath + currentPath;

export default [
  {
    path: currentPathURL,
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await getUserList(req.get(AUTHORIZATION),req.query, res);
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
        const result = await getUserDetail(req.params.id, res);
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
        const result = await deleteUser(req.params.id, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + '/profile',
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await getUserProfile(req.get(AUTHORIZATION), next, res);
        res.status(200).send(result);
      }
    ]
  },
  {
    path: currentPathURL + '/profile',
    method: "put",
    handler: [
      uploadFile("photos", true),
      validateProfile,
      checkAuthenticate,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await updateProfile(req.get(AUTHORIZATION), req, res);
        res.status(200).send(result);
      }
    ]
  },
  {
    path: currentPathURL + "/block/:id",
    method: "put",
    handler: [
      checkAuthenticate,
      checkPartnerAuthenticate,
      async (req: Request, res: Response) => {
        const result = await blockUserByPartner(req, res);
        res.status(200).send(result);
      },
    ],
  },

  {
    path: currentPathURL + '/uploadFile',
    method: "post",
    handler: [
      uploadFile("photos", true),
      async (req: Request, res: Response) => {
        const result = await uploadFileData(req, res);
        res.status(200).send(result);
      },
    ],
  },

];
