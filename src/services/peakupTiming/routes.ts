import { Request, Response } from "express";
import {
  createTiming,
  deleteTiming,
  getAllTimings,
  getTimingById,
  getTimings,
  updateTiming,
  updateTimingStatus
} from "./controller";
import { checkAuthenticate } from "../auth/middleware/check";
import { AUTHORIZATION } from "../../constants";

const basePath = process.env.BASE_PATH;
const currentPath = "peakupTiming";
const currentPathURL = basePath + currentPath;

export default [
  {
    path: currentPathURL,
    method: "post",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await createTiming(req.get('Authorization'), req.body, res);
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
        const result = await getTimings(req.get(AUTHORIZATION), req.query, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + "/forAdmin",
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await getAllTimings(req.get(AUTHORIZATION), req.query, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + "/:id",
    method: "get",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await getTimingById(req.get(AUTHORIZATION), req.query, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + '/:id',
    method: "delete",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await deleteTiming(req.get(AUTHORIZATION), req.params.id, res);
        res.status(200).send(result);
      }
    ]
  },

  {
    path: currentPathURL + '/:id',
    method: "put",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await updateTiming(req.get(AUTHORIZATION), req.params.id, req.body, res);
        res.status(200).send(result);
      }
    ]
  },
  {
    path: currentPathURL + '/:id/status',
    method: "put",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await updateTimingStatus(req.get(AUTHORIZATION), req.params.id, req.body, res);
        res.status(200).send(result);
      }
    ]
  }
];
