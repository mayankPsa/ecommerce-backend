import { NextFunction, Request, Response } from "express";
import {
  getCustomerList,
  getPartnerDetail,
  deletePartner,
  createCustomer,
  editPartner,
  partnerForgotPassword,
  verifyPartnerOTP,
  createPartnerNePassword,
  updatePartnerStatus,
  getUsersByPartner,
  getUserById,
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
    path: currentPathURL + "/forgotPassword",
    method: "post",
    handler: [
      checkForgotPassword,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await partnerForgotPassword(req.body, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + "/update-status/:id",
    method: "put",
    handler: [
      checkAuthenticate,
      async (req: any, res: Response) => {
        const result = await updatePartnerStatus(req, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + "/verifyOTP",
    method: "post",
    handler: [
      checkOTP,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await verifyPartnerOTP(req, res, next);
        res.status(200).send(result);
      },
    ],
  },

  {
    path: currentPathURL + "/createNePassword",
    method: "post",
    handler: [
      checkCreateNewPassword,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await createPartnerNePassword(req.body, res);
        res.status(200).send(result);
      },
    ],
  },

  {
    path: currentPathURL + "/edit/:id",
    method: "put",
    handler: [
      uploadFile("photos", true),
      // checkPartnerAuthenticate,
      // validatePartnerProfile,
      async (req: Request, res: Response) => {
        const result = await editPartner(req, res);
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
  {
    path: currentPathURL + "/get-users-by-partner",
    method: "get",
    handler: [
      checkAuthenticate,
      checkPartnerAuthenticate,
      async (req: Request, res: Response) => {
        const result = await getUsersByPartner(req.get(AUTHORIZATION), req, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + "/get-user-by-parnterid/:id",
    method: "get",
    handler: [
      checkPartnerAuthenticate,
      async (req: Request, res: Response) => {
        const result = await getUserById(req.params.id, req, res);
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
      uploadFile("photos", true),
      checkPartnerAuthenticate,
      async (req: Request, res: Response) => {
        const result = await editPartner(req, res);
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
