import { NextFunction, Request, Response } from "express";
import {
  getCustomerList,
  getPartnerDetail,
  deletePartner,
  createCustomer,
  editCustomer
} from "./controller";
import { AUTHORIZATION } from "../../../constants";
import { checkAuthenticate, checkCreateNewPassword, checkForgotPassword, checkOTP, checkPartnerAuthenticate } from "../../auth/middleware/check";
import { uploadFile } from "../../../utils/FileUploadUtilities";
import { validatePartnerProfile } from "../../partner/middleware/check";
const basePath = process.env.BASE_PATH;
const currentPath = "admin/customer";
const currentPathURL = basePath + currentPath;

export default [
  {
    path: currentPathURL + "/create",
    method: "post",
    handler: [
      uploadFile("profile", true),
      // checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await createCustomer(req, res);
        res.status(201).send(result);
      },
    ],
  },
  {
    path: currentPathURL + "/edit/:id",
    method: "put",
    handler: [
      uploadFile("profile", true),
      // checkPartnerAuthenticate,
      // validatePartnerProfile,
      async (req: Request, res: Response) => {
        const result = await editCustomer(req, res);
        res.status(200).send(result);
      },
    ],
  },
  // Get a list of partners
  {
    path: currentPathURL,
    method: "get",
    handler: [
      // checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await getCustomerList(req.get(AUTHORIZATION), req.query, res);
        res.status(200).send(result);
      },
    ],
  },
  // Get partner details by ID
  {
    path: currentPathURL + "/detail/:id",
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await getPartnerDetail(req.params.id, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + "/edit/:id",
    method: "get",
    handler: [
      checkAuthenticate,
      checkPartnerAuthenticate,
      async (req: Request, res: Response) => {
        const result = await getPartnerDetail(req.params.id, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + "/detail/:id",
    method: "put",
    handler: [
      uploadFile("profile", true),
      checkPartnerAuthenticate,
      async (req: Request, res: Response) => {
        const result = await editCustomer(req, res);
        res.status(200).send(result);
      },
    ],
  },

  // Soft delete a partner
  {
    path: currentPathURL + "/:id",
    method: "delete",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await deletePartner(req.params.id, res);
        res.status(200).send(result);
      },
    ],
  },

];
