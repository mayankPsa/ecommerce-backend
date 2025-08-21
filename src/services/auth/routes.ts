import { NextFunction, Request, Response } from "express";
import {
  createAdmin,
  adminLogin,
  login,
  logout,
  forgotPassword,
  register,
  resetPassword,
  verifyOTP,
  resendOTP,
  createNePassword,
  onboardingLocation,
  partnerLogin,
  googleAuth,
  updateFcmToken,
  sendResetPasswordOtp,
  confirmResetPassword,
  partnerLogout,
  appleAuth,
  refreshFCMToken,
  refreshAccessToken
} from "./controller";
import {
  checkAuthenticate,
  checkForgotPassword,
  checkSignup,
  checkOTP,
  checkPassword,
  checkResendOTP,
  checkCreateNewPassword,
  checkLogin,
  checkPartnerAuthenticate,
} from "./middleware/check";
import dotenv from "dotenv";
import { AUTHORIZATION } from "../../constants";
import { AnyArray } from "mongoose";
dotenv.config();
const basePath = process.env.BASE_PATH;
const currentPath = "auth";
const currentPathURL = basePath + currentPath;

export default [
  {
    path: currentPathURL + "/register",
    method: "post",
    handler: [
      checkSignup,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await register(req.body, next, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + "/send-reset-password-otp",
    method: "post",
    handler: [
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await sendResetPasswordOtp(req, res, next);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + "/confirm-reset-password",
    method: "post",
    handler: [
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await confirmResetPassword(req, res, next);
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
        const result = await verifyOTP(req, next, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + "/login",
    method: "post",
    handler: [
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await login(req.body, next, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + '/google-login',
    method: "post",
    handler: [
      // googleAuthValidator,
      async (req: Request, res: any, next: NextFunction) => {
        const result = await googleAuth(req, res, next);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + '/apple-login',
    method: "post",
    handler: [
      // googleAuthValidator,
      async (req: Request, res: any, next: NextFunction) => {
        const result = await appleAuth(req, res, next);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + '/update-fcm-token',
    method: 'post',
     handler: [
      async (req: Request, res: any, next: NextFunction) => {
        const result = await updateFcmToken(req.get(AUTHORIZATION), req, res, next);
        res.status(200).send(result);
      },
    ]
  },
  {
    path: currentPathURL + "/partner/login",
    method: "post",
    handler: [
      async (req: Request, res: Response, next: NextFunction) => {        
        const result = await partnerLogin(req.body, next, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + "/resendOTP",
    method: "post",
    handler: [
      checkResendOTP,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await resendOTP(req.body, next, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + "/forgotPassword",
    method: "post",
    handler: [
      checkForgotPassword,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await forgotPassword(req.body, res);
        res.status(200).send(result);
      },
    ],
  },
  {
    path: currentPathURL + '/resetPassword',
    method: "post",
    handler: [
      checkPassword,
      async (req: Request, res: Response) => {
        const result = await resetPassword(req.body, res);
        res.status(200).send(result);
      }
    ]
  },

  {
    path: currentPathURL + "/createNePassword",
    method: "post",
    handler: [
      checkCreateNewPassword,
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await createNePassword(req.body);
        res.status(200).send(result);
      },
    ],
  },

  // {
  //   path: currentPathURL + "/login",
  //   method: "post",
  //   handler: [
  //     checkLogin,
  //     async (req: Request, res: Response, next: NextFunction) => {
  //       const result = await login(req.body, next, res);
  //       res.status(200).send(result);
  //     },
  //   ],
  // },
  {
    path: currentPathURL + "/logout",
    method: "post",
    handler: [
      checkAuthenticate,
      async (req: Request, res: Response) => {
        const result = await logout(req.get(AUTHORIZATION));
        res.status(200).send(result);
      },
    ],
  },

  {
    path: currentPathURL + "/createAdmin",
    method: "post",
    handler: [
      async (req: Request, res: Response) => {
        const result = await createAdmin();
        res.status(200).send(result);
      },
    ],
  },

  {
    path: currentPathURL + "/admin/login",
    method: "post",
    handler: [
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await adminLogin(req.body, next, res);
        res.status(200).send(result);
      },
    ],
  },

  {
    path: currentPathURL + "/onboarding-location",
    method: "post",
    handler: [
      async (req: Request, res: Response, next: NextFunction) => {
        const result = await onboardingLocation(req, next, res);
        res.status(200).send(result);
      },
    ],
  },

  {
    path: currentPathURL + "/partner/logout",
    method: "post",
    handler: [
      checkAuthenticate,
      checkPartnerAuthenticate,
      async (req: Request, res: Response) => {
        const result = await partnerLogout(req.get(AUTHORIZATION));
        res.status(200).send(result);
      },
    ],
  },

  {
    path: currentPathURL + '/refreshFCMToken',
    method: "post",
    handler: [
      async (req: Request, res: Response) => {
        const result = await refreshFCMToken(req.get(AUTHORIZATION),req, res);
        res.status(200).send(result);
      }
    ]
  },

  {
    path: currentPathURL + '/refreshAccessToken',
    method: "post",
    handler: [
      async (req: Request, res: Response) => {
        const result = await refreshAccessToken(req.get(AUTHORIZATION),req, res);
        res.status(200).send(result);
      }
    ]
  }

];
