import { userModel } from "../../db/User";
import mongoose = require("mongoose");
import { Utilities } from "../../utils/utilities";
import { NextFunction } from "express-serve-static-core";
import { handleServerError } from "../../utils/ErrorHandler";
import {
  ACCOUNT_DELETED_SUCCESS,
  NO_RECORD_FOUND,
  SUCCESS,
} from "../../utils/messages";
import { HTTP400Error } from "../../utils/httpErrors";
import { couponModel } from "../../db/Coupon";
import { FileUpload, uploadFile } from "../../utils/FileUploadUtilities";
import ejs from "ejs";
import { MailerUtilities } from "../../utils/MailerUtilities";
import moment from "moment";
import * as path from "path";
import * as fs from "fs";
// import { FirebaseUtilities } from "../../utils/firebase";
import { BLOCK_BY_PARTNER, BLOCK_MESSAGE } from "../../constants";
import { orderModel } from "../../db/Order";
import { cartModel } from "../../db/cart";
import { Chat } from "../../db/Chat";
import { customerAddressModel } from "../../db/CustomerAddress";
import { notificationModel } from "../../db/Notification";
import { transactionModel } from "../../db/transaction";

export const getUserList = async (token: any, queryParams: any, res: any) => {
  try {
    const page = parseInt(queryParams.page as string) || 1;
    const limit = parseInt(queryParams.limit as string) || 10;
    const skip = (page - 1) * limit;
    // let query: any = {
    //   $and: [{ role: { $ne: 'Admin' } }, { isDeleted: false }],
    // }
    let search = queryParams.search;
    let query: any = {
      role: { $ne: "Admin" },
      isDeleted: false,
    };
    if (search) {
      query["$or"] = [
        { name: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
      ];
    }

    let totalRecords = await userModel.find(query);
    let userRes = await userModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(isNaN(Number(skip)) ? 0 : Number(skip))
      .limit(isNaN(Number(limit)) ? 0 : Number(limit));

    let totalCount = await userModel.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    return Utilities.sendResponsData({
      code: 200,
      data: userRes,
      totalRecord: totalCount,
      message: SUCCESS.message,
      pagination: {
        totalPages,
        currentPage: page,
        limit,
        totalRecords: totalCount,
      },
    });
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const getUserDetail = async (id: string, res: any) => {
  try {
    let userRes = await userModel.findOne({
      _id: mongoose.Types.ObjectId(id),
      isDeleted: false,
    });
    if (userRes) {
      return Utilities.sendResponsData({
        code: 200,
        message: SUCCESS.message,
        data: userRes,
      });
    } else {
      throw new HTTP400Error(Utilities.sendResponsData({
        code: 400,
        message: NO_RECORD_FOUND.message,
      }))
    }
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const deleteUser = async (id: string, res: any) => {
  try {
    const objectId = new mongoose.Types.ObjectId(id);
    
    const result = await userModel.deleteOne({ _id: objectId });
    await orderModel.deleteMany({ customerId: objectId });
    await cartModel.deleteMany({ customerId: objectId });
    await Chat.deleteMany({ customerId: objectId });
    await customerAddressModel.deleteMany({ customerId: objectId });
    await transactionModel.deleteMany({ customerId: objectId });
    await notificationModel.deleteMany({
      $or: [
        { senderId: objectId },
        { recevierId: objectId },
      ]
    });
    if (result.deletedCount === 1) {
      return Utilities.sendResponsData({
        code: 200,
        message: ACCOUNT_DELETED_SUCCESS.message,
      });
    } else {
      throw new HTTP400Error(Utilities.sendResponsData({
        code: 400,
        message: NO_RECORD_FOUND.message,
      }));
    }
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const getUserProfile = async (token: any, next: NextFunction, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);

    const userRes: any = await userModel.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(decoded.id),
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: "customeraddresses",
          localField: "_id",
          foreignField: "customerId",
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "customerAddresses",
        },
      },
      {
        $project: {
          password: 0,
          __v: 0,
          accessToken: 0,
        },
      },
    ]);

    if (userRes.length > 0) {
      return Utilities.sendResponsData({
        code: 200,
        message: SUCCESS.message,
        data: userRes[0],
      });
    } else {
      throw new HTTP400Error(Utilities.sendResponsData({
        code: 400,
        message: NO_RECORD_FOUND.message,
      }));
    }
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const updateProfile = async (token: any, req: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);
    let bodyData: any = req.body;
    let filesArr: any = req.files;
    const filePaths = filesArr?.map((file: any) => file.path);

    let userDetails = await userModel.findOne({
      _id: mongoose.Types.ObjectId(decoded.id),
      isDeleted: false
    });

    if (userDetails) {
      if (bodyData.name) userDetails.name = bodyData.name;
      if (bodyData.email) userDetails.email = bodyData.email;
      if (bodyData.dob) userDetails.dob = bodyData.dob;
      if (bodyData.phone) userDetails.phone = bodyData.phone;
      if (bodyData.gender) userDetails.gender = bodyData.gender;

      // if (filePaths?.length > 0) userDetails.profilePicture = filePaths[0];
      let image: any = "";

      if (filePaths?.length > 0) {
        let url = await FileUpload.uploadFileToAWS(filesArr[0], "profile", null);
        userDetails.profilePicture = url
      }
      let result = await userDetails.save()

      return Utilities.sendResponsData({
        code: 200,
        message: SUCCESS.message,
        data: result,
      });
    }
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const blockUserByPartner = async (req: any, res: any) => {
  try {
    let id = req.params.id;
    let bodyData: any = req.body;
    let userRes: any = await userModel.findOne({
      _id: mongoose.Types.ObjectId(id),
      isDeleted: false,
    });
    if (userRes) {
      userRes.isBlocked = bodyData.status;
      if (bodyData.status == true) {
        userRes.blockedAt = new Date();
      }
      let result = await userRes.save();
      let status = (bodyData.status === true) ? "Blocked" : "UnBlocked";
      let mailSubject = `Your Peakup Account Has Been ${status}`

      let msg = BLOCK_MESSAGE;

      const payload = {
        notification: {
          title: "Notification",
          body: msg,
        },
        data: {
          title: BLOCK_BY_PARTNER,
          body: msg,
        },
      };

      // *************************************
      // if (userRes?.fcmToken && (typeof userRes?.fcmToken === 'string') && userRes?.fcmToken?.trim()){
      //   let messageRes = await FirebaseUtilities.firebaseSendNotification(
      //     userRes.fcmToken,
      //     payload
      //   );
      // }

      const templateFileName = bodyData.status === true
        ? 'block-user-email.ejs'
        : 'unblock-user-email.ejs';

      const obj = {
        name: userRes?.name || 'User',
        blockedAt: bodyData.status === true ? moment(userRes?.blockedAt).format('MMMM Do YYYY, h:mm A') : '',
        unblockedAt: bodyData.status === false ? moment().format('MMMM Do YYYY, h:mm A') : '',
      };
      const templatePath = path.join(process.cwd(), 'src/views', templateFileName);

      // let obj = {
      //   name: userRes?.name || 'User',
      //   blockedAt: moment(userRes?.blockedAt).format('MMMM Do YYYY, h:mm A'),
      // }
      // const templatePath = path.join(process.cwd(), 'src/views/block-user-email.ejs');
      let html;
      // try {
      //   const template = fs.readFileSync(templatePath, "utf-8");
      //   html = await ejs.renderFile(templatePath, obj, { async: true });
      // } catch (fileError) {
      //   console.error("Error reading EJS template:", fileError);
      //   throw new Error("Failed to load email template");
      // }
      try {
        html = await ejs.renderFile(templatePath, obj, { async: true });
      } catch (fileError) {
        console.error("Error reading EJS template:", fileError);
        throw new Error("Failed to load email template");
      }
      const mailData = {
        recipient_email: [userRes.email],
        subject: mailSubject,
        text: "message",
        html,
      };
      await MailerUtilities.sendSendgridMail(mailData);

      const dynamicMessage = bodyData.status === true
        ? "Account Blocked Successfully."
        : "Account Unblocked Successfully.";

      return Utilities.sendResponsData({
        code: 200,
        message: dynamicMessage,
      });
    } else {
      throw new HTTP400Error(Utilities.sendResponsData({
        code: 400,
        message: NO_RECORD_FOUND.message,
      }));
    }
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const uploadFileData = async (req: any, res: any) => {
  try {
    const MAX_FILE_SIZE = 5 * 1024 * 1024;  // 5 MB in bytes
    let uploadRes: any[] = [];
    let filesArr: any = req.files;

    for (let i = 0; i < filesArr.length; i++) {
      if (filesArr[i].size > MAX_FILE_SIZE) {
        return Utilities.sendResponsData({
          statusCode: 400,
          message: `File ${filesArr[i].originalname} exceeds the 5MB size limit.`,
          data: null,
        });
      }
    }

    for (let i = 0; i < filesArr.length; i++) {
      const uploadedFile = await FileUpload.uploadFileToAWS(filesArr[i], "images", null);
      uploadRes.push(uploadedFile);
    }

    return Utilities.sendResponsData({
      statusCode: 200,
      message: SUCCESS.message,
      data: uploadRes,
    });
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};
