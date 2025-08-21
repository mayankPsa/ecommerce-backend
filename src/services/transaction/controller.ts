import { categoryModel } from "../../db/Category";
import mongoose = require("mongoose");
import { Utilities } from "../../utils/utilities";
import { handleServerError } from "../../utils/ErrorHandler";
import { orderModel } from "../../db/Order";
import { transactionModel } from "../../db/transaction";
import { HTTP400Error } from "../../utils/httpErrors";

export const createPayment = async (token: any, req: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);
    const bodyData: any = req.body;

    bodyData.createdBy = decoded.id;
    bodyData.updatedBy = decoded.id;
    bodyData.customerId = decoded.id;

    const result = await transactionModel.create(bodyData);

    return Utilities.sendResponsData({
      code: 200,
      message: 'SUCCESS',
      data: result,
    });
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const getTransactionById = async (token: any, transactionId: string, res: any) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(transactionId)) {
      throw new HTTP400Error( 
        Utilities.sendResponsData({
        code: 400,
        message: "Invalid transaction ID",
        data: null,
      }))
    }

    const matchStage = {
      _id: new mongoose.Types.ObjectId(transactionId),
      isDeleted: false,
    };

    const aggregationPipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: "users",
          localField: "customerId",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "partners",
          localField: "partnerId",
          foreignField: "_id",
          as: "partner",
        },
      },
      { $unwind: { path: "$partner", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          amount: 1,
          createdAt: 1,
          updatedAt: 1,
          partner: {
            _id: "$partner._id",
            name: "$partner.name",
            email: "$partner.email",
          },
          customer: {
            location: "$customer.location",
            name: "$customer.name",
            profilePicture: "$customer.profilePicture",
            address: "$customer.address",
            alternateAddress: "$customer.alternateAddress",
            phone: "$customer.phone",
            alternatePhone: "$customer.alternatePhone",
            dob: "$customer.dob",
            gender: "$customer.gender",
            company: "$customer.company",
            role: "$customer.role",
            email: "$customer.email",
          },
        },
      },
    ];

    const result = await transactionModel.aggregate(aggregationPipeline);

    if (!result.length) {
      return Utilities.sendResponsData({
        code: 404,
        message: "Transaction not found",
        data: null,
      });
    }

    return Utilities.sendResponsData({
      code: 200,
      message: "Transaction fetched successfully",
      data: result[0],
    });
  } catch (error) {
    const err = error as Error;
    console.log(err,">>> erro")
    handleServerError(err, res);
  }
};

export const getAllTransactions = async (token: any, queryParams: any, res: any) => {
  try {
    const page = parseInt(queryParams.page as string) || 1;
    const limit = parseInt(queryParams.limit as string) || 10;
    const skip = (page - 1) * limit;

    const { customerId, partnerId } = queryParams;

    const matchStage: any = { isDeleted: false };

    // Add filters if provided
    if (customerId) {
      matchStage.customerId = new mongoose.Types.ObjectId(customerId);
    }

    if (partnerId) {
      matchStage.partnerId = new mongoose.Types.ObjectId(partnerId);
    }

    const aggregationPipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: "users",
          localField: "customerId",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "partners",
          localField: "partnerId",
          foreignField: "_id",
          as: "partner",
        },
      },
      { $unwind: { path: "$partner", preserveNullAndEmptyArrays: true } },
    ];

    // Count total
    const totalPipeline = [...aggregationPipeline, { $count: "total" }];
    const totalResult = await transactionModel.aggregate(totalPipeline);
    const totalCount = totalResult[0]?.total || 0;

    // Add pagination
    aggregationPipeline.push({ $sort: { createdAt: -1 } });
    aggregationPipeline.push({ $skip: skip });
    aggregationPipeline.push({ $limit: limit });

    // Project final fields
    aggregationPipeline.push({
      $project: {
        _id: 1,
        amount: 1,
        createdAt: 1,
        updatedAt: 1,
        partner: {
          _id: "$partner._id",
          name: "$partner.name",
          email: "$partner.email",
        },
        customer: {
          location: "$customer.location",
          name: "$customer.name",
          profilePicture: "$customer.profilePicture",
          address: "$customer.address",
          alternateAddress: "$customer.alternateAddress",
          phone: "$customer.phone",
          alternatePhone: "$customer.alternatePhone",
          dob: "$customer.dob",
          gender: "$customer.gender",
          company: "$customer.company",
          role: "$customer.role",
          email: "$customer.email",
        },
      },
    });

    const transactions = await transactionModel.aggregate(aggregationPipeline);

    return Utilities.sendResponsData({
      code: 200,
      message: "Transaction list fetched successfully",
      data: transactions,
      totalRecord: totalCount,
      pagination: {
        totalPages: Math.ceil(totalCount / limit),
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
