import { Request, Response } from "express";
import {
  editPartnerProfile,
  getPartnerList
} from "./controller";
import { AUTHORIZATION } from "../../constants";
import { checkAuthenticate, checkPartnerAuthenticate } from "../auth/middleware/check";
import { uploadFile } from "../../utils/FileUploadUtilities";
import { validatePartnerProfile } from "./middleware/check";

const basePath = process.env.BASE_PATH;
const currentPath = "partners";
const currentPathURL = basePath + currentPath;

export default [

  // Get a list of partners
  {
    path: currentPathURL,
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await getPartnerList(req.get(AUTHORIZATION), req.query, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + "/profile/:id",
    method: "put",
    handler: [
      uploadFile("photos", true),
      checkAuthenticate,
      checkPartnerAuthenticate,
      async (req: Request, res: Response) => {
        const result = await editPartnerProfile(req, res); 
        res.status(200).send(result); 
      },
    ],
  },

];
