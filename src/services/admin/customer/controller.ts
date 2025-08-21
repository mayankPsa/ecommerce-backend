import mongoose = require('mongoose')
import { Utilities } from '../../../utils/utilities'
import { ACCOUNT_AND_IP_BLOCKED, ACCOUNT_BLOCKED, EMAIL_EXIST, INVALID_OTP, MAIL_SENT_WITH_OTP, NO_RECORD_FOUND, OTP_EXPIRED, OTP_REQUIRED, OTP_VERIFIED, PARTNER_NOT_EXIST, PASSWORD_CHANGED_SUCCESSFULLY, SUCCESS, USER_NOT_FOUND } from '../../../utils/messages'
import { partnerModel } from '../../../db/Partners';
import { handleServerError } from '../../../utils/ErrorHandler';
import ejs from "ejs";
import { MailerUtilities } from '../../../utils/MailerUtilities';
import { HTTP400Error } from '../../../utils/httpErrors';
import moment from 'moment';
import { NextFunction } from 'express';
import * as bcrypt from "bcrypt";
import { saltRound } from '../../../constants';
import { FileUpload } from '../../../utils/FileUploadUtilities';
// import { FirebaseUtilities } from '../../../utils/firebase';
import { orderModel } from '../../../db/Order';
import { userModel } from '../../../db/User';
import * as path from "path";
import * as fs from "fs";
import { customerAddressModel } from '../../../db/CustomerAddress';


export const createCustomer = async (req: any, res: any) => {


  console.log(">>> createCustomer >>>", req.body, req.files);
  try {
    const { 
      email, 
      firstName, 
      lastName, 
      phone, 
      dob, 
      gender,
      street, 
      city, 
      state, 
      country,
      zipCode,
      addressType,
      location // { coordinates: [lng, lat] }
    } = req.body;

    // check duplicate
    const existingCustomer = await userModel.findOne({ email });
    if (existingCustomer) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: EMAIL_EXIST.message
        })
      );
    }

    // handle file upload (profile picture)
    let profileUrl: string = "";
    if (req.files && req.files.length > 0) {
      const fileName = req.files[0].filename;
      profileUrl = `${req.protocol}://${req.get("host")}/temp/${fileName}`; 
    }

    // generate random password
    const randomPassword: string = await Utilities.generateRandomPassword(8);
    const hashedPassword = await Utilities.cryptPassword(randomPassword);

    // create new user (Customer)
    const newCustomer = new userModel({
      email,
      firstName,
      lastName,
      phone,
      dob,
      gender,
      password: hashedPassword,
      profile: profileUrl,
      role: "Customer"
    });

    const savedCustomer = await newCustomer.save();

    // create address for this customer
    const customerAddress = new customerAddressModel({
      customerId: savedCustomer._id,
      location,
      street,
      city,
      state,
      country,
      zipCode,
      addressType
    });

    await customerAddress.save();

    // send registration email
    // let messageHtml = await ejs.renderFile(
    //   process.cwd() + "/src/views/registerCustomer.ejs",
    //   {
    //     password: randomPassword,
    //     name: firstName || "",
    //     email: email || "",
    //   },
    //   { async: true }
    // );

    // await MailerUtilities.sendSendgridMail({
    //   recipient_email: [email],
    //   subject: "Customer Registration",
    //   html: messageHtml,
    // });

    return Utilities.sendResponsData({
      code: 200,
      message: SUCCESS.message,
      data: { customer: savedCustomer, address: customerAddress },
    });

  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const updatePartnerStatus = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(req.body, ">>> body >>>")
    // Validate status input
    if (!['Active', 'InActive'].includes(status)) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "Invalid status. Only 'Active' or 'InActive' allowed.",
        })
      );
    }

    const partner = await partnerModel.findById(id);
    if (!partner) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 404,
          message: "Partner not found.",
        })
      );
    }

    partner.status = status;
    partner.updatedBy = req?.user?._id; // if `checkAuthenticate` provides `req.user`
    await partner.save();

    let msg =
      status === 'Active'
        ? 'Your partner account has been activated. You can now start receiving orders.'
        : 'Your partner account has been deactivated. You will not receive new orders until reactivated.';

    const payload = {
      notification: {
        title: "Notification",
        body: msg,
      },
      data: {
        title: "Notification",
        body: msg,
      },
    };

    // **********************************
    // if (partner?.fcmToken && (typeof partner?.fcmToken === 'string') && partner?.fcmToken?.trim()) {
    //   let messageRes = await FirebaseUtilities.firebaseSendNotification(
    //     partner.fcmToken,
    //     payload
    //   );
    // }

    return Utilities.sendResponsData({
      code: 200,
      message: "Status updated successfully.",
      data: { id, status },
    });
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const editPartner = async (req: any, res: any) => {
  try {
    const partnerId = req.params.id;

    console.log(partnerId, ">>> partner Id >>>>")
    const {
      email,
      laundryName,
      name,
      phoneNumber,
      openingTime,
      closingTime,
      street,
      city,
      state,
      address,
      postalCode,
      location
    } = req.body;

    const existingPartner = await partnerModel.findOne({
      email,
      _id: { $ne: partnerId },
    });

    if (existingPartner) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: EMAIL_EXIST,
        })
      );
    }

    let filesArr: any = req.files;
    const filePaths = filesArr?.map((file: any) => file.path);

    const updatedData: any = {
      email,
      laundryName,
      name,
      phone: phoneNumber,
      openingHours: {
        start: openingTime,
        end: closingTime,
      },
      street,
      city,
      state,
      address,
      postalCode,
      location
    };

    if (filePaths?.length > 0) {
      let url = await FileUpload.uploadFileToAWS(filesArr[0], "profile", null);
      updatedData.profilePicture = url
    }

    const updatedPartner = await partnerModel.findByIdAndUpdate(
      partnerId,
      updatedData,
      { new: true }
    );

    return Utilities.sendResponsData({
      code: 200,
      message: SUCCESS.message,
      data: updatedPartner,
    });
  } catch (error) {
    console.log(error)
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const getCustomerList = async (token: any, queryParams: any, res: any) => {
  try {
    const page = parseInt(queryParams.page as string) || 1;
    const limit = parseInt(queryParams.limit as string) || 10;
    const skip = (page - 1) * limit;
    const applyPagination = queryParams.pagination !== "false"; // default true

    let search = queryParams.search;
    let query: any = {
      isDeleted: false,
      role: "Customer", // ✅ only customers
    };

    if (search) {
      query["$or"] = [
        { firstName: new RegExp(search, "i") },
        { lastName: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
        { phone: new RegExp(search, "i") },
      ];
    }

    // Count total
    const totalCount = await userModel.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Build query
    let userQuery = userModel.find(query).sort({ createdAt: -1 });

    if (applyPagination) {
      userQuery = userQuery.skip(skip).limit(limit);
    }

    // Populate address for each customer
    const users = await userQuery.lean();

    const userIds = users.map((u:any) => u._id);
    const addresses = await customerAddressModel.find({
      customerId: { $in: userIds },
      isDeleted: false,
    }).lean();

    // Merge user + address
    const userWithAddresses = users.map((u:any) => {
      const userAddr = addresses.filter((a:any) => String(a.customerId) === String(u._id));
      return {
        ...u,
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
        addresses: userAddr,
      };
    });

    return Utilities.sendResponsData({
      code: 200,
      data: userWithAddresses,
      totalRecord: totalCount,
      message: "SUCCESS",
      pagination: applyPagination
        ? {
            totalPages,
            currentPage: page,
            limit,
            totalRecords: totalCount,
          }
        : undefined,
    });
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};


// Get partner details by ID
export const getPartnerDetail = async (id: string, res: any) => {
  try {
    const customerRes = await userModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      isDeleted: false,
    }).lean(); // ✅ lean for plain object

    if (customerRes) {
      // Fetch customer addresses
      const addresses = await customerAddressModel.find({
        customerId: id,
        isDeleted: false,
      }).lean();

      // Merge into response
      const customerWithAddress = {
        ...customerRes,
        name: `${customerRes.firstName || ""} ${customerRes.lastName || ""}`.trim(),
        addresses: addresses || [],
      };

      return Utilities.sendResponsData({
        code: 200,
        message: SUCCESS.message,
        data: customerWithAddress,
      });
    } else {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: NO_RECORD_FOUND.message,
        })
      );
    }
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};


// Soft delete partner
export const deletePartner = async (id: string, res: any) => {
  try {
    let customerRes = await partnerModel.findOne({ _id: mongoose.Types.ObjectId(id), isDeleted: false });

    if (customerRes) {
      customerRes.isDeleted = true;
      let result = await customerRes.save();

      return Utilities.sendResponsData({
        code: 200,
        message: 'Partner account deleted successfully',
      });
    } else {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: NO_RECORD_FOUND.message,
        }))
    }
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};


export const partnerForgotPassword = async (body: any, res: any) => {
  try {
    let userRes: any = await partnerModel.findOne({
      email: body.email,
      isDeleted: false,
    });

    if (userRes) {
      let randomOTP = Utilities.genNumericCode(6);

      await partnerModel.updateOne(
        { _id: userRes._id },
        {
          $set: {
            otp: randomOTP,
            otpVerified: false,
            otpExipredAt: moment().add(1, "m").toDate(),
          },
        }
      );

      // userRes['otp'] = randomOTP,
      // userRes['otpVerified'] = false,
      // userRes['otpExipredAt'] = moment().add(1, "m"),

      // await userRes.save();

      // let messageHtml = await ejs.renderFile(
      //   process.cwd() + "/src/views/emailVerification.ejs",
      //   {
      //     otp: randomOTP,
      //   },
      //   { async: true }
      // );
      // let mailResponse = MailerUtilities.sendSendgridMail({
      //   recipient_email: [body.email],
      //   subject: "Partner Forgot Email",
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
        subject: "Partner Forgot Email",
        text: "message",
        html,
      };
      await MailerUtilities.sendSendgridMail(mailData);

      console.log(">>> mail Response");

      return Utilities.sendResponsData({
        code: 200,
        message: MAIL_SENT_WITH_OTP.message,
        data: randomOTP
      });
    } else {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: PARTNER_NOT_EXIST.message,
        }))
    }
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const verifyPartnerOTP = async (req: any,res: any, next: NextFunction) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: OTP_REQUIRED.message,
        }))
    }

    const user = await partnerModel.findOne({ email });

    if (!user) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: USER_NOT_FOUND.message,
        }));
    }

    if (user.otp !== otp) {
      throw new HTTP400Error(Utilities.sendResponsData({
        code: 400,
        message: INVALID_OTP.message,
      }))
    }

    // if (moment().diff(moment(user.otpExpiredAt), "minutes") > 1) {
    //   throw new HTTP400Error( Utilities.sendResponsData({
    //     code: 400,
    //     message: OTP_EXPIRED.message,
    //   }))
    // }


    await partnerModel.updateOne(
      { _id: user._id },
      {
        $set: {
          otpVerified: true
        },
      }
    );

    // user.otpVerified = true;
    // await user.save();

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
      },
    });
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
    next(error);
  }
};

export const createPartnerNePassword = async (body: any, res: any) => {
  try {
    let userRes: any = await partnerModel.findOne({
      email: body.email,
      isDeleted: false,
    });
    if (userRes) {
      // let currentDateTime = moment();
      // if (currentDateTime.diff(userRes.otpExipredAt, "m") > 10) {
      //   throw new HTTP400Error( Utilities.sendResponsData({
      //     code: 400,
      //     message: OTP_EXPIRED.message,
      //   }))
      // }
      const pass: string = await bcrypt.hash(body.password, saltRound);
      userRes.password = pass;
      userRes.save();
      return Utilities.sendResponsData({
        code: 200,
        message: PASSWORD_CHANGED_SUCCESSFULLY.message,
      });
    } else {
      throw new HTTP400Error(Utilities.sendResponsData({
        code: 400,
        message: PARTNER_NOT_EXIST.message,
      }))
    }

  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};


export const getUsersByPartner = async (token: any, req: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);
    const partnerId = decoded.id
    console.log(partnerId, ">>>> partner Id ")
    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      throw new HTTP400Error(Utilities.sendResponsData({
        code: 400,
        message: 'Invalid partnerId',
      }))
    }

    // Step 1: Find distinct customer IDs from orders of this partner
    // find all unique customerIds where partnerId matches.
    const customerIds = await orderModel.distinct('customerId', { partnerId });

    if (!customerIds.length) {
      return Utilities.sendResponsData({
        code: 200,
        message: 'No customers found',
        data: []
      });
    }

    // Step 2: Get user details for those customer IDs
    const customers = await userModel.find(
      { _id: { $in: customerIds } },
      'name email phone countryCode profilePicture gender dob role isBlocked' // Select only necessary fields
    );

    return Utilities.sendResponsData({
      code: 200,
      message: 'Customers fetched successfully',
      data: customers
    });

    // res.status(200).json({ message: 'Customers fetched successfully', data: customers });
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const getUserById = async (userId: string, req: any, res: any) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "Invalid user ID",
        })
      );
    }

    const user = await userModel.findById(userId).select(
      "name email phone countryCode profilePicture gender dob role isBlocked blockedAt"
    );

    if (!user) {
      return Utilities.sendResponsData({
        code: 404,
        message: "User not found",
        data: null,
      });
    }

    return Utilities.sendResponsData({
      code: 200,
      message: "User fetched successfully",
      data: user,
    });
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
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
