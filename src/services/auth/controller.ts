import { userModel } from "../../db/User";
import { Utilities, generateToken } from "../../utils/utilities";
var mongoose = require("mongoose");
import * as bcrypt from "bcrypt";
import moment from "moment";
const saltRound = 10;
import ejs from "ejs";
import { IpAddressModel } from "../../db/IpAddress";
import { ACCOUNT_AND_IP_BLOCKED, ACCOUNT_BLOCKED, INVALID_COORDINATES, INVALID_LOCATION_TYPE, INVALID_LOGIN, INVALID_OTP, INVALID_PASSWORD, LINK_EXPIRED, LOCATION_VALIDATION_SUCCESS, LOGIN_SUCCESSFUL, MAIL_SENT_WITH_OTP, OTP_EXPIRED, OTP_REQUIRED, OTP_RESENT, OTP_VERIFIED, PARTNER_NOT_EXIST, PASSWORD_CHANGED_SUCCESSFULLY, REGISTRATION_SUCCESSFULL, SUCCESS, TOKEN_REQUIRED, TOKEN_VERIFICATION_FAILED, USER_CANNOT_BE_FOUND, USER_NOT_EXIST, USER_NOT_FOUND } from "../../utils/messages";
import { ADMIN_INACTIVE_MESSAGE, AUTHORIZATION, CUSTOMER, DEFAULT_ERROR_LOG, IN_ACTIVE, PARTNER, POINT } from "../../constants";
import { handleServerError } from "../../utils/ErrorHandler";
import { NextFunction, Request } from 'express';
import { partnerModel } from "../../db/Partners";
import { deliveryOptionsModel } from "../../db/DeliveryOptions";
import { counterModel } from "../../db/Counter";
import { HTTP400Error } from "../../utils/httpErrors";
import admin, { sendFirebaseNotification } from '../../utils/firebase';
import { MailerUtilities } from "../../utils/MailerUtilities";
import { truncate } from "lodash";
import { settingsModel } from "../../db/Settings";
import * as path from "path";
import * as fs from "fs";

export const register = async (req: any, next: NextFunction, res: any) => {
  try {
    const { email, password, name, countryCode, phone, fcmToken } = req;
    const user = await userModel.findOne({ email: email, isDeleted: false });
    let randomOTP = Utilities.genNumericCode(6);

    const existingPhoneUser = await userModel.findOne({ phone, isDeleted: false });

    if (user) {
      if (!user.otpVerified) {
        user.otp = randomOTP;
        let userObj: any = {
          name: name,
          email: email,
          countryCode: countryCode,
          phone: phone,
          otp: randomOTP,
          otpVerified: false,
          fcmToken: fcmToken
        };

        const pass: string = await bcrypt.hash(password, saltRound);

        userObj.password = pass;

        // let messageHtml = await ejs.renderFile(
        //   process.cwd() + "/src/views/emailVerification.ejs",
        //   {
        //     otp: randomOTP
        //   },
        //   { async: true }
        // );
        // let mailResponse = await MailerUtilities.sendSendgridMail({
        //   recipient_email: [email],
        //   subject: "Customer Registration",
        //   text: messageHtml,
        // });

        let obj = {
          otp: randomOTP,
          recipient_Name: user?.name ? user?.name?.charAt(0).toUpperCase() + user?.name?.slice(1)
            : ""
        }
        const templatePath = path.join(process.cwd(), 'src/views/emailVerification.ejs');
        let html;
        try {
          const template = fs.readFileSync(templatePath, "utf-8");
          html = await ejs.render(template, obj);
        } catch (fileError) {
          console.error("Error reading EJS template:", fileError);
          throw new Error("Failed to load email template");
        }
        const mailData = {
          recipient_email: [email],
          subject: "Customer Registration",
          text: "message",
          html,
        };
        await MailerUtilities.sendSendgridMail(mailData);

        await user.save();
        return Utilities.sendResponsData({
          code: 200,
          message: OTP_RESENT.message,
          data: randomOTP
        })
      }
      else {
        throw new HTTP400Error(
          Utilities.sendResponsData({
            code: 400,
            message: "User already registered!",
          }))
      }
    }

    if (existingPhoneUser) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "Phone number already registered!",
        })
      );
    }

    let userObj: any = {
      name: name,
      email: email,
      countryCode: countryCode,
      phone: phone,
      otp: randomOTP,
      otpVerified: false,
      fcmToken: fcmToken
    };

    const pass: string = await bcrypt.hash(password, saltRound);
    userObj.password = pass;

    // let messageHtml = await ejs.renderFile(
    //   process.cwd() + "/src/views/emailVerification.ejs",
    //   {
    //     otp: randomOTP
    //   },
    //   { async: true }
    // );
    // let mailResponse = await MailerUtilities.sendSendgridMail({
    //   recipient_email: [email],
    //   subject: "Customer Registration",
    //   text: messageHtml,
    // });

    let obj = {
      otp: randomOTP,
      recipient_Name: user?.name ? user?.name?.charAt(0).toUpperCase() + user?.name?.slice(1)
        : ""
    }
    const templatePath = path.join(process.cwd(), 'src/views/emailVerification.ejs');
    let html;
    try {
      const template = fs.readFileSync(templatePath, "utf-8");
      html = await ejs.render(template, obj);
    } catch (fileError) {
      console.error("Error reading EJS template:", fileError);
      throw new Error("Failed to load email template");
    }
    const mailData = {
      recipient_email: [email],
      subject: "Customer Registration",
      text: "message",
      html,
    };
    await MailerUtilities.sendSendgridMail(mailData);


    await new userModel(userObj).save();
    return Utilities.sendResponsData({
      code: 200,
      message: REGISTRATION_SUCCESSFULL.message,
      data: randomOTP
    })
  } catch (error) {
    console.log(error, ">>> error >>>")
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const googleAuth = async (req: Request, res: any, next: NextFunction) => {
  try {
    const { idToken, fcmToken } = req.body;
    console.log('====GOOGLE LOGIN===',req.body);
    let query: any = {}

    if (!idToken) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: TOKEN_REQUIRED.message,
        }))
    }

    const { email, name, uid, phone_number, picture } = await admin.auth().verifyIdToken(idToken);

    console.log(email, name, uid, phone_number, ">>> email , name , uid , phone number")

    const CheckUser = await userModel.findOne({ email: email, isDeleted: false, otpVerified: true, type: 'normal' });

    if (CheckUser) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "User already registered!",
        }))
    }

    query["$or"] = [
      { googleUid: uid },
      { email: email }
    ];
    let user: any = await userModel.findOne(query);

    if (user) {
      // const token = generateToken(user._id, email, user.role);
      const token = await Utilities.createJWTToken({
        id: user._id,
        email: email,
        name: name,
        role: user.role
      });
      if (name) user.name = name;
      if (phone_number) user.phone = phone_number
      user.accessToken = token;
      user.fcmToken = fcmToken;
      user.otpVerified = true;
      user.type = "google"
      user.lastLogin = new Date();
      user.loginStreak += 1;
      let res = await user.save();

      console.log('GOOGLE LOGIN >>> user >>>>',JSON.stringify(res))
      return Utilities.sendResponsData({
        code: 200,
        message: LOGIN_SUCCESSFUL.message,
        data: {
          ...user.toObject(),
          registered: true
        }
      });
    }

    if (!user) {
      user = new userModel({
        fullName: name,
        email,
        authProvider: 'google',
        isGuest: false,
        role: 'User',
        googleUid: uid,
        fcmToken: fcmToken,
        lastLogin: new Date(),
        type: "google"
      });

      console.log(name, phone_number, email, ">>> condition")
      if (name) user.name = name;
      if (phone_number) user.phone = phone_number
      let res = await user.save();
      if (res) {
        // const token = generateToken(user._id, email, user.role);
        const token = await Utilities.createJWTToken({
          id: user._id,
          email: email,
          name: name,
          role: user.role
        });
         res.accessToken = token;
         let updatedRes = await res.save();
        console.log('GOOGLE LOGIN >>> user >>>>1',JSON.stringify(updatedRes))
      }
      // console.log(user,">>> user >>>>")

      return Utilities.sendResponsData({
        code: 200,
        message: LOGIN_SUCCESSFUL.message,
        data: {
          ...user.toObject(),
          registered: false
        }
      });
    }
  } catch (error) {
    const err = error as Error;
    console.log(error, ">>> error ")
    handleServerError(err, res)
  }
};

export const appleAuth = async (req: Request, res: any, next: NextFunction) => {
  try {
    const { idToken, fcmToken } = req.body;
    let query: any = {}
    console.log('====APPLE LOGIN===',req.body);

    if (!idToken) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: TOKEN_REQUIRED.message,
        }))
    }

    const { email, name, uid, phone_number, picture } = await admin.auth().verifyIdToken(idToken);

    const CheckUser = await userModel.findOne({ email: email, isDeleted: false, otpVerified: true, type: 'apple' });

    if (CheckUser) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "User already registered!",
        }))
    }

    query["$or"] = [
      { appleUid: uid },
      { email: email }
    ];
    let user: any = await userModel.findOne(query);

    if (user) {
      const token = await Utilities.createJWTToken({
        id: user._id,
        email: email,
        name: name,
        role: user.role
      });
      if (name) user.name = name;
      if (phone_number) user.phone = phone_number
      user.accessToken = token;
      user.fcmToken = fcmToken;
      user.otpVerified = true;
      user.type = "apple"
      user.lastLogin = new Date();
      user.loginStreak += 1;
      let updatedRes = await user.save();
      console.log('APPLE LOGIN >>> user >>>>',JSON.stringify(updatedRes))

      return Utilities.sendResponsData({
        code: 200,
        message: LOGIN_SUCCESSFUL.message,
        data: {
          ...user.toObject(),
          registered: true
        }
      });
    }

    if (!user) {
      user = new userModel({
        fullName: name,
        email,
        authProvider: 'apple',
        isGuest: false,
        role: 'User',
        appleUid: uid,
        fcmToken: fcmToken,
        lastLogin: new Date(),
        type: "apple"
      });

      console.log(name, phone_number, email, ">>> condition")
      if (name) user.name = name;
      if (phone_number) user.phone = phone_number
      let res = await user.save();
      if (res) {
        // const token = generateToken(user._id, email, user.role);
        const token = await Utilities.createJWTToken({
          id: user._id,
          email: email,
          name: name,
          role: user.role
        });
        res.accessToken = token;
       let updatedRe = await res.save();
        console.log('APPLE LOGIN >>> user >>>>1',JSON.stringify(updatedRe))
      }

      return Utilities.sendResponsData({
        code: 200,
        message: LOGIN_SUCCESSFUL.message,
        data: {
          ...user.toObject(),
          registered: false
        }
      });
    }
  } catch (error) {
    const err = error as Error;
    console.log(error, ">>> error ")
    handleServerError(err, res)
  }
};

export const updateFcmToken = async (token: any, req: any, next: NextFunction, res: any) => {
  try {
    const { fcmToken, accesstoken } = req.body;
    const decoded: any = await Utilities.getDecoded(accesstoken);

    console.log(fcmToken, ">fcm ", accesstoken, ">>> access Token")

    const user = await userModel.findById(decoded.id);

    if (!user) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 404,
          message: 'User not found',
        }))
    }

    user.fcmToken = fcmToken;
    await user.save();

    // console.log(user,">>>> fcm token update")

    return Utilities.sendResponsData({
      code: 200,
      message: 'FCM token updated successfully',
      data: {}
    });

  } catch (error) {
    console.log()
    handleServerError(error as Error, res);
  }
};


export const facebookLogin = async (req: Request, res: Response) => {
  try {
    const { idToken, fcmToken } = req.body;
    let query: any = {}
    if (!idToken) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: TOKEN_REQUIRED.message,
        })
      );
    }

    // const decodedToken: any = await admin.auth().verifyIdToken(idToken);

    // if (!decodedToken || !decodedToken.uid) {
    //   return Utilities.sendResponsData({
    //     statusCode: 400,
    //     message: TOKEN_VERIFICATION_FAILED,
    //   });
    // }

    // const { uid, email, name } = decodedToken;

    // query["$or"] = [
    //   { appleUid: uid },
    //   { email: email }
    // ];

    // let user: any = await userModel.findOne(query);

    // if (!user) {
    //   user = new userModel({
    //     fullName: name,
    //     email: email,
    //     authProvider: 'apple',
    //     appleUid: uid,
    //   });

    //   let res = await user.save();
    //   if (res) {
    //     const token = generateToken(res._id, email, user.role);
    //     res.accessToken = token;
    //     await res.save();
    //   }
    //   return Utilities.sendResponsData({
    //     statusCode: 200,
    //     message: LOGIN_SUCCESSFUL,
    //     data: user
    //   });
    // }

    // if (user) {
    //   const token = generateToken(user._id, email, user.role);
    //   user.accessToken = token;
    //   user.fcmToken = fcmToken;
    //   await user.save();
    //   return Utilities.sendResponsData({
    //     statusCode: 200,
    //     message: LOGIN_SUCCESSFUL,
    //     data: user
    //   });
    // }
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res)
  }
};

export const verifyOTP = async (req: any, next: NextFunction, res: any) => {
  try {
    const { email, otp } = req.body;
    const ipAddress = getIPAddress();
    // const ipRecord = await IpAddressModel.findOne({ ipAddress });

    // if (ipRecord) {
    //   const blockedDuration = moment().diff(moment(ipRecord.blockedAt), 'minutes');
    //   if (blockedDuration < 30) {
    //     throw new HTTP400Error(
    //       Utilities.sendResponsData({
    //       code: 400,
    //       message: MAIL_SENT_WITH_OTP,
    //     }))
    //   } else {
    //     await IpAddressModel.deleteOne({ ipAddress });
    //   }
    // }

    const user = await userModel.findOne({ email });

    if (!user) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: USER_NOT_FOUND.message,
        }))
    }

    // if (user.isBlocked) {
    //   const blockedDuration = moment().diff(moment(user.blockedAt), 'minutes');
    //   if (blockedDuration < 30) {
    //     throw new HTTP400Error( 
    //       Utilities.sendResponsData({
    //         code: 400,
    //         message: ACCOUNT_BLOCKED,
    //     }))
    //   }
    // }

    if (otp === "") {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: OTP_REQUIRED.message,
        }))
    }

    console.log(user.otp, '>>> user.otp >>>>>')
    console.log(otp, ">>> otp >>>>")

    if (user.otp !== otp || user.isDeleted) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: INVALID_OTP.message,
        }))
    }

    // let currentDateTime = moment();
    // if (currentDateTime.diff(user.otpExipredAt, "minutes") > 1) {
    //   throw new HTTP400Error( 
    //     Utilities.sendResponsData({
    //       code: 400,
    //       message: OTP_EXPIRED.message,
    //   }))
    // }

    user.otpVerified = true;
    let userToken = await Utilities.createJWTToken({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    user.accessToken = userToken;
    await user.save();

    return Utilities.sendResponsData({
      code: 200,
      message: OTP_VERIFIED.message,
      data: {
        name: user.name,
        otp: user.otp,
        otpVerified: user.otpVerified,
        accessToken: user.accessToken,
        _id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        fcmToken: user.fcmToken
      },
    });
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const login = async (req: any, next: NextFunction, res: any) => {
  try {
    const { email, password, fcmToken } = req;
    const user = await userModel.findOne({
      email: email,
      isDeleted: false,
      role: { $eq: "User" },
    });
    if (!user) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: USER_NOT_EXIST.message,
        }))
    }

    if (user.isBlocked) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "You can't access your account. Please contact support team.",
        }))
    }

    const CheckUser = await userModel.findOne({ email: email, isDeleted: false, type: 'google' });

    if (CheckUser) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "User already registered!",
        }))
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: INVALID_PASSWORD.message,
        }))
    }
    let userToken = await Utilities.createJWTToken({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role
    });
    user.accessToken = userToken;
    user['fcmToken'] = fcmToken || "";
    if (fcmToken) {
      // Remove fcmToken from any other user
      await userModel.updateMany(
        {
          _id: { $ne: user._id },
          fcmToken: fcmToken
        },
        { $set: { fcmToken: "" } }
      );
    }
    let randomOTP = Utilities.genNumericCode(6);
    user.otp = (email === "dummy@yopmail.com")  ? "123456" : randomOTP;
    user.otpVerified = false;
    await user.save();

    user.token = userToken;

    const userData = { ...user };
    const result = userData?._doc;
    delete result.password;

    let obj = {
      otp: (email === "dummy@yopmail.com")  ? "123456" : randomOTP,
      recipient_Name: user?.name ? user?.name?.charAt(0).toUpperCase() + user?.name?.slice(1)
        : ""
    }
    const templatePath = path.join(process.cwd(), 'src/views/emailVerification.ejs');
    let html;
    try {
      const template = fs.readFileSync(templatePath, "utf-8");
      html = await ejs.render(template, obj);
    } catch (fileError) {
      console.error("Error reading EJS template:", fileError);
      throw new Error("Failed to load email template");
    }
    const mailData = {
      recipient_email: [email],
      subject: "Customer Login",
      text: "message",
      html,
    };
    await MailerUtilities.sendSendgridMail(mailData);

    return Utilities.sendResponsData({
      code: 200,
      message: SUCCESS.message,
      data: result,
    });
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const partnerLogin = async (req: any, next: NextFunction, res: any) => {
  try {
    const { email, password, fcmToken } = req;

    console.log("parnter fcm token >>>>>>", fcmToken)
    const user = await partnerModel.findOne({
      email: email,
      isDeleted: false
    });

    if (!user) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: PARTNER_NOT_EXIST.message,
        }))
    }

    if (user.status === IN_ACTIVE) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: ADMIN_INACTIVE_MESSAGE,
        }))
    }

    if (!password || !email) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "Email and Password are required",
        }))
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: INVALID_PASSWORD.message,
        })
      )
    }
    let userToken = await Utilities.createJWTToken({
      id: user._id,
      email: user.email,
      name: user.name,
      laundryName: user.laundryName
    });
    user.accessToken = userToken;
    user.fcmToken = fcmToken;

    if (fcmToken) {
      // Remove fcmToken from any other user
      await partnerModel.updateMany(
        {
          _id: { $ne: user._id },
          fcmToken: fcmToken
        },
        { $set: { fcmToken: "" } }
      );
    }

    await user.save(user);

    user.token = userToken;

    const userData = { ...user };
    const result = userData?._doc;
    delete result.password;
    return Utilities.sendResponsData({
      code: 200,
      message: SUCCESS.message,
      data: result,
    });
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
}

export const resendOTP = async (req: any, next: NextFunction, res: any) => {
  try {
    const { email } = req;
    const user = await userModel.findOne({ email: email, isDeleted: false });
    if (user) {
      let randomOTP = Utilities.genNumericCode(6);

      await userModel.updateOne(
        { email: email },
        { $set: { otp: randomOTP, otpVerified: false } }
      );

      // let messageHtml = await ejs.renderFile(
      //   process.cwd() + "/src/views/emailVerification.ejs",
      //   {
      //     otp: randomOTP
      //   },
      //   { async: true }
      // );
      // let mailResponse = await MailerUtilities.sendSendgridMail({
      //   recipient_email: [email],
      //   subject: "Customer Login",
      //   text: messageHtml,
      // });

      let obj = {
        otp: randomOTP,
        recipient_Name: user?.name ? user?.name?.charAt(0).toUpperCase() + user?.name?.slice(1)
          : ""
      }
      const templatePath = path.join(process.cwd(), 'src/views/emailVerification.ejs');
      let html;
      try {
        const template = fs.readFileSync(templatePath, "utf-8");
        html = await ejs.render(template, obj);
      } catch (fileError) {
        console.error("Error reading EJS template:", fileError);
        throw new Error("Failed to load email template");
      }
      const mailData = {
        recipient_email: [email],
        subject: "Customer Login",
        text: "message",
        html,
      };
      await MailerUtilities.sendSendgridMail(mailData);

      return Utilities.sendResponsData({
        code: 200,
        message: MAIL_SENT_WITH_OTP.message,
        data: randomOTP
      });
    } else {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: USER_NOT_EXIST.message,
        }))
    }
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const forgotPassword = async (body: any, res: any) => {
  try {
    let email = body.email;
    let userRes: any = await userModel.findOne({
      email: body.email,
      isDeleted: false,
    });
    if (userRes) {
      let randomOTP = Utilities.genNumericCode(6);
      (userRes["otp"] = randomOTP),
        (userRes["otpVerified"] = false),
        (userRes["otpExipredAt"] = moment().add(1, "m")),
        await userRes.save();

      // let messageHtml = await ejs.renderFile(
      //   process.cwd() + "/src/views/emailVerification.ejs",
      //   {
      //     otp: randomOTP,
      //   },
      //   { async: true }
      // );
      // let mailResponse = MailerUtilities.sendSendgridMail({
      //   recipient_email: [body.email],
      //   subject: "Customer Registration",
      //   text: messageHtml,
      // });

      let obj = {
        otp: randomOTP,
        recipient_Name: userRes?.name ? userRes?.name?.charAt(0).toUpperCase() + userRes?.name?.slice(1)
          : ""
      }
      const templatePath = path.join(process.cwd(), 'src/views/emailVerification.ejs');
      let html;
      try {
        const template = fs.readFileSync(templatePath, "utf-8");
        html = await ejs.render(template, obj);
      } catch (fileError) {
        console.error("Error reading EJS template:", fileError);
        throw new Error("Failed to load email template");
      }
      const mailData = {
        recipient_email: [body.email],
        subject: "Customer Registration",
        text: "message",
        html,
      };
      await MailerUtilities.sendSendgridMail(mailData);

      return Utilities.sendResponsData({
        code: 200,
        message: MAIL_SENT_WITH_OTP.message,
        data: randomOTP,
      });
    } else {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: USER_NOT_EXIST.message,
        })
      );
    }
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const logout = async (token: any) => {
  const decoded: any = await Utilities.getDecoded(token);

  let userRes: any = await userModel.findOne({
    _id: mongoose.Types.ObjectId(decoded.id),
    isDeleted: false,
  });
  if (userRes) {
    userRes.accessToken = "";
    userRes.fcmToken = "";
    await userRes.save();
    return Utilities.sendResponsData({ code: 200, message: SUCCESS.message });
  } else {
    throw new HTTP400Error(
      Utilities.sendResponsData({
        code: 400,
        message: USER_NOT_EXIST.message,
      }))
  }
};

export const createAdmin = async () => {
  try {
    let pass = await Utilities.cryptPassword("Qwerty@1");
    let userRes: any = await userModel.findOne({ email: "peakup2025@gmail.com", isDeleted: false });

    const counterExists = await counterModel.findOne({ name: "orderId" });
    if (!counterExists) {
      await counterModel.create({ name: "orderId", seq: 999001 });
    }

    if (!userRes) {
      let adminArr = [
        {
          name: "Admin",
          email: "admin@yopmail.com",
          password: pass,
          isDeleted: false,
          countryCode: "+91",
          role: 'Admin',
        },
      ];
      return await userModel.create(adminArr);
    } else {
      userRes.role = 'Admin';
      return await userRes.save();
    }
  } catch (error) {

  }
};

export const adminLogin = async (req: any, next: NextFunction, res: any) => {
  try {
    const { email, password } = req;
    const admin = await userModel.findOne({
      email: email,
      isDeleted: false,
      role: { $eq: "Admin" },
    });
    if (!admin) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: USER_NOT_EXIST.message,
        }))
    }
    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: INVALID_LOGIN.message,
        }))
    }
    let userToken = await Utilities.createJWTToken({
      id: admin._id,
      email: admin.email,
      name: admin.name,
      role: admin.role
    });
    admin.accessToken = userToken;
    admin.fcmToken = "";
    await admin.save(admin);

    admin.token = userToken;

    const userData = { ...admin };
    const result = userData?._doc;
    delete result.password;

    return Utilities.sendResponsData({
      code: 200,
      message: SUCCESS.message,
      data: result,
    });
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const resetPassword = async (body: any, res: any) => {
  try {
    let userRes: any = await userModel.findOne({
      email: body.email,
      isDeleted: false,
    });
    if (userRes) {
      let hashedPassword = await Utilities.cryptPassword(body.password);
      userRes.password = hashedPassword;
      userRes.resetPasswordToken = "";
      await userRes.save();
      return Utilities.sendResponsData({
        code: 200,
        message: SUCCESS.message,
        data: userRes,
      });
    } else {
      return Utilities.sendResponsData({
        code: 200,
        message: LINK_EXPIRED.message,
      });
    }
  } catch (error) {
    console.error(DEFAULT_ERROR_LOG, error);
    handleServerError(error, res)
  }
};

export const createNePassword = async (body: any) => {
  let userRes: any = await userModel.findOne({
    email: body.email,
    isDeleted: false,
  });
  if (userRes) {
    // let currentDateTime = moment();
    // if (currentDateTime.diff(userRes.otpExipredAt, "m") > 10) {
    //   throw new HTTP400Error( 
    //     Utilities.sendResponsData({
    //       code: 400,
    //       message: OTP_EXPIRED.message
    //     }))
    // }
    // if (userRes['otp'] !== body['otp']) {
    //   throw new HTTP400Error( 
    //      Utilities.sendResponsData({
    //       code: 400,
    //       message: INVALID_OTP.message
    //   }))
    // } else {
    const pass: string = await bcrypt.hash(body.password, saltRound);
    userRes.password = pass;
    userRes.save();
    return Utilities.sendResponsData({
      code: 200,
      message: PASSWORD_CHANGED_SUCCESSFULLY.message,
    });
    // }
  } else {
    throw new HTTP400Error(
      Utilities.sendResponsData({
        code: 400,
        message: USER_NOT_EXIST.message,
      }))
  }
};


export const onboardingLocation = async (req: Request, next: NextFunction, res: any) => {

  try {
    const token = req.get(AUTHORIZATION);
    const decoded: any = await Utilities.getDecoded(token);
    const userId = decoded?.id;
    const { location, address } = req.body;
    const user: any = await userModel.findById(userId);
    if (!user) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: USER_CANNOT_BE_FOUND.message,
        }))
    }
    if (!location || ((location.type === POINT) && !Array.isArray(location.coordinates))) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: INVALID_LOCATION_TYPE.message,
        }))
    }

    if (location.type === POINT) {
      const [longitude, latitude] = location.coordinates;
      if (typeof longitude !== 'number' || typeof latitude !== 'number') {
        throw new HTTP400Error(
          Utilities.sendResponsData({
            code: 400,
            message: INVALID_COORDINATES.message,
          }))
      }
    }

    user.location = location || user.location;
    user.address = address || user.address

    const updatedUserRes = await user.save();
    if (updatedUserRes) {
      return Utilities.sendResponsData({
        code: 200,
        message: LOCATION_VALIDATION_SUCCESS.message,
        data: updatedUserRes,
      });
    }
  } catch (error) {
    console.error(DEFAULT_ERROR_LOG, error);
    handleServerError(error, res)
  }
};

function getIPAddress() {
  var interfaces = require('os').networkInterfaces();
  for (var devName in interfaces) {
    var iface = interfaces[devName];

    for (var i = 0; i < iface.length; i++) {
      var alias = iface[i];
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
        return alias.address;
    }
  }
  return '0.0.0.0';
}

export const sendResetPasswordOtp = async (req: Request, res: any, next: NextFunction) => {
  try {
    const { email } = req.body;

    console.log(email, ">>> email >>>>")

    if (!email) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "Email is required",
        }))
    }

    const user = await userModel.findOne({ email, isDeleted: false, role: 'Admin' });

    if (!user) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "User not found",
        }))
    }

    const otp = Utilities.genNumericCode(6);
    user.otp = otp;
    user.otpVerified = false;

    // const messageHtml = await ejs.renderFile(
    //   process.cwd() + '/src/views/emailVerification.ejs',
    //   { otp },
    //   { async: true }
    // );

    // await MailerUtilities.sendSendgridMail({
    //   recipient_email: [email],
    //   subject: 'Reset Admin Password OTP',
    //   text: messageHtml,
    // });

    // console.log(MailerUtilities, '>>> mailerUtilites')

    let obj = {
      otp: otp,
      recipient_Name: user?.name ? user?.name?.charAt(0).toUpperCase() + user?.name?.slice(1)
        : ""
    }
    const templatePath = path.join(process.cwd(), 'src/views/emailVerification.ejs');
    let html;
    try {
      const template = fs.readFileSync(templatePath, "utf-8");
      html = await ejs.render(template, obj);
    } catch (fileError) {
      console.error("Error reading EJS template:", fileError);
      throw new Error("Failed to load email template");
    }
    const mailData = {
      recipient_email: [email],
      subject: "Reset Admin Password OTP",
      text: "message",
      html,
    };
    await MailerUtilities.sendSendgridMail(mailData);

    await user.save();

    return Utilities.sendResponsData({
      code: 200,
      message: 'OTP sent to your email.',
      data: { email, otp },
    });

  } catch (error) {
    console.error('sendResetPasswordOtp error:', error);
    handleServerError(error as Error, res);
  }
};

export const confirmResetPassword = async (req: Request, res: any, next: NextFunction) => {
  try {
    const { email, otp, password } = req.body;

    console.log(email, otp, password, ">>>> email")

    if (!email || !otp || !resetPassword) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "All fields are required.",
        }))
    }

    // if (password !== confirmPassword) {
    //   return res.status(400).json({ code: 400, message: 'Passwords do not match.' });
    // }

    const user = await userModel.findOne({ email, otp, isDeleted: false });

    if (!user) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "Invalid OTP or user not found.",
        }))
    }

    user.password = await bcrypt.hash(password, saltRound);
    console.log(user.password, ">>> user password")
    user.otp = null;
    user.otpVerified = true;

    await user.save();

    return Utilities.sendResponsData({
      code: 200,
      message: 'Password reset successful.'
    });
  } catch (error) {
    console.error('confirmResetPassword error:', error);
    handleServerError(error as Error, res);
  }
};

export const partnerLogout = async (token: any) => {
  const decoded: any = await Utilities.getDecoded(token);

  let userRes: any = await partnerModel.findOne({
    _id: mongoose.Types.ObjectId(decoded.id),
    isDeleted: false,
  });
  if (userRes) {
    userRes.accessToken = "";
    userRes.fcmToken = "";
    await userRes.save();
    return Utilities.sendResponsData({ code: 200, message: SUCCESS.message });
  } else {
    throw new HTTP400Error(
      Utilities.sendResponsData({
        code: 400,
        message: USER_NOT_EXIST.message,
      }))
  }
};


export const refreshFCMToken = async (token: any, req: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);
    const { fcmToken, type } = req.body;
    console.log('**********req.body',req.body);
    if (decoded) {
      if (type === CUSTOMER) {
        let userRes: any = await userModel.findOne({ _id: mongoose.Types.ObjectId(decoded?.id), isDeleted: false });
        console.log('******==userRes',JSON.stringify(userRes));
        if (userRes) {
         let res = await userModel.updateOne(
            { _id: mongoose.Types.ObjectId(decoded.id), isDeleted: false },
            { fcmToken: fcmToken }
          );
          let ans1: any = await userModel.findOne({ _id: mongoose.Types.ObjectId(decoded?.id), isDeleted: false });
          console.log('******==res===',JSON.stringify(ans1));
          return Utilities.sendResponsData({
            code: 200,
            message: 'Token updated successfully',
            data: { fcmToken: res ? (fcmToken) : (userRes?.fcmToken)}
          });
        } else {
          throw new HTTP400Error(
            Utilities.sendResponsData({
              code: 404,
              message: 'User not found',
            }))
        }
      }

      if (type === PARTNER) {
        let partnerRes: any = await partnerModel.findOne({ _id: mongoose.Types.ObjectId(decoded?.id), isDeleted: false });
        console.log('******==partnerRes',JSON.stringify(partnerRes));
        if (partnerRes) {
          let fcmRes = await partnerModel.updateOne(
            { _id: mongoose.Types.ObjectId(decoded.id), isDeleted: false },
            { fcmToken: fcmToken }
          );
          let ans2: any = await partnerModel.findOne({ _id: mongoose.Types.ObjectId(decoded?.id), isDeleted: false });
          console.log('******==partnerRes===',JSON.stringify(ans2));
          return Utilities.sendResponsData({
            code: 200,
            message: 'Token updated successfully',
            data: { fcmToken: fcmRes ? fcmToken : (partnerRes?.fcmToken) }
          });
        } else {
          throw new HTTP400Error(
            Utilities.sendResponsData({
              code: 404,
              message: 'User not found',
            }))
        }
      }
    }
  }
  catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
}


export const refreshAccessToken = async (token: any, req: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);
    const { type } = req.body;
    if (decoded) {
      if (type === CUSTOMER) {
        let userRes: any = await userModel.findOne({ _id: mongoose.Types.ObjectId(decoded?.id), isDeleted: false });
        if (userRes) {
          const refreshUserToken = await Utilities.createJWTToken({
            id: res?._id,
            email: res?.email,
            name: res?.name,
            role: res?.role
          });
  console.log('refreshUserToken==>',refreshUserToken);
  
         let updateuserRes = await userModel.updateOne(
            { _id: mongoose.Types.ObjectId(decoded.id), isDeleted: false },
            { accessToken: refreshUserToken }
          );
          return Utilities.sendResponsData({
            code: 200,
            message: 'Token updated successfully',
            data: { accessToken: updateuserRes ? refreshUserToken : updateuserRes?.accessToken}
          });
        } else {
          throw new HTTP400Error(
            Utilities.sendResponsData({
              code: 404,
              message: 'User not found',
            }))
        }
      }

      if (type === PARTNER) {
        let partnerRes: any = await partnerModel.findOne({ _id: mongoose.Types.ObjectId(decoded?.id), isDeleted: false });
        if (partnerRes) {
          const refreshPartnerToken = await Utilities.createJWTToken({
            id: res?._id,
            email: res?.email,
            name: res?.name,
            role: res?.role
          });
          console.log('refreshPartnerToken==>>',refreshPartnerToken);
          
         let updatePartnerRes = await partnerModel.updateOne(
            { _id: mongoose.Types.ObjectId(decoded.id), isDeleted: false },
            { accessToken: refreshPartnerToken }
          );
          return Utilities.sendResponsData({
            code: 200,
            message: 'Token updated successfully',
            data: { accessToken: updatePartnerRes ? refreshPartnerToken : updatePartnerRes?.accessToken}
          });
        } else {
          throw new HTTP400Error(
            Utilities.sendResponsData({
              code: 404,
              message: 'User not found',
            }))
        }
      }
    }
  }
  catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
}