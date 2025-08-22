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

export const editCustomer = async (req: any, res: any) => {
  try {
    const customerId = req.params.id;

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
      location,
      addressId
    } = req.body;

    // check for duplicate email
    const existingCustomer = await userModel.findOne({
      email,
      _id: { $ne: customerId },
    });

    if (existingCustomer) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: EMAIL_EXIST.message,
        })
      );
    }

    // handle profile picture upload
    let profileUrl: string | undefined;
    if (req.files && req.files.length > 0) {
      const fileName = req.files[0].filename;
      profileUrl = `${req.protocol}://${req.get("host")}/temp/${fileName}`;
    }

    const updatedCustomerData: any = {
      email,
      firstName,
      lastName,
      phone,
      dob,
      gender,
    };

    if (profileUrl) {
      updatedCustomerData.profile = profileUrl;
    }

    // update user
    const updatedCustomer = await userModel.findByIdAndUpdate(
      customerId,
      updatedCustomerData,
      { new: true }
    );

    // update or create address
    let updatedAddress;
    if (addressId) {
      updatedAddress = await customerAddressModel.findByIdAndUpdate(
        addressId,
        {
          location,
          street,
          city,
          state,
          country,
          zipCode,
          addressType,
        },
        { new: true }
      );
    } else {
      updatedAddress = new customerAddressModel({
        customerId: customerId,
        location,
        street,
        city,
        state,
        country,
        zipCode,
        addressType,
      });
      await updatedAddress.save();
    }

    return Utilities.sendResponsData({
      code: 200,
      message: SUCCESS.message,
      data: {
        customer: updatedCustomer,
        address: updatedAddress,
      },
    });
  } catch (error) {
    console.log(error);
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

