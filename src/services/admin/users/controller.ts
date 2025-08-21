import mongoose from "mongoose";
import { userModel } from "../../../db/User";
import { handleServerError } from "../../../utils/ErrorHandler";
import { Utilities } from "../../../utils/utilities";
import { HTTP400Error } from "../../../utils/httpErrors";

export const getUserById = async (token: any, userId: string, res: any) => {
  try {
    const objectId = new mongoose.Types.ObjectId(userId);
    const user = await userModel.aggregate([
      { $match: { _id: objectId, isDeleted: false } },
      {
        $project: {
          _id: 1,
          name: 1,
          profilePicture: 1,
          email: 1,
          address: 1,
          location: 1,
          alternateAddress: 1,
          phone: 1,
          alternatePhone: 1,
          dob: 1,
          gender: 1,
          company: 1,
          role: 1,
          otpVerified: 1,
          linkVerified: 1,
          isBlocked: 1,
          appointment: 1,
          device: 1,
          createdAt: 1,
          updatedAt: 1,
          formattedAddress: 1, // <-- add this
        },
      },
    ]);

    if (!user || user.length === 0) {
        throw new HTTP400Error( 
        Utilities.sendResponsData({
            code: 404,
            message: "User not found",
            data: null,
      }));
    }

    return Utilities.sendResponsData({
      code: 200,
      message: "User fetched successfully",
      data: user[0],
    });
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const getUserList = async (token: any, queryParams: any, res: any) => {
    try {
      const page = parseInt(queryParams.page as string) || 1;
      const limit = parseInt(queryParams.limit as string) || 10;
      const skip = (page - 1) * limit;
      const search = queryParams.search;
      const applyPagination = queryParams.pagination !== "false"; // default: true
  
      const matchStage: any = { isDeleted: false, role: "User" };
  
      if (queryParams.role) {
        matchStage.role = queryParams.role;
      }
  
      const pipeline: any[] = [{ $match: matchStage }];
  
      if (search) {
        pipeline.push({
          $match: {
            $or: [
              { name: { $regex: search, $options: "i" } },
              { email: { $regex: search, $options: "i" } },
              { phone: { $regex: search, $options: "i" } },
            ],
          },
        });
      }
  
      // Get total count
      const totalPipeline = [...pipeline, { $count: "total" }];
      const totalResult = await userModel.aggregate(totalPipeline);
      const totalCount = totalResult[0]?.total || 0;
  
      pipeline.push({ $sort: { createdAt: -1 } });
  
  // Lookup customerAddresses without pipeline
      pipeline.push({
      $lookup: {
        from: "customeraddresses",
        localField: "_id",
        foreignField: "customerId",
        as: "addresses",
      }
      });

      // Filter isDeleted and build full addresses after lookup
      pipeline.push({
      $addFields: {
        formattedAddress: {
          $reduce: {
            input: {
              $map: {
                input: {
                  $filter: {
                    input: "$addresses",
                    as: "addr",
                    cond: { $eq: ["$$addr.isDeleted", false] }
                  }
                },
                as: "addr",
                in: {
                  $trim: {
                    input: {
                      $concat: [
                        { $ifNull: ["$$addr.street", ""] },
                        " ",
                        { $ifNull: ["$$addr.city", ""] },
                        " ",
                        { $ifNull: ["$$addr.state", ""] },
                        " ",
                        { $ifNull: ["$$addr.country", ""] }
                      ]
                    }
                  }
                }
              }
            },
            initialValue: "",
            in: {
              $cond: [
                { $eq: ["$$value", ""] },
                "$$this",
                { $concat: ["$$value", ", ", "$$this"] }
              ]
            }
          }
        }
      }
      });


      // if (applyPagination) {
      //   pipeline.push({ $skip: skip });
      //   pipeline.push({ $limit: limit });
      // }
  
      pipeline.push({
        $project: {
          _id: 1,
          name: 1,
          gender: 1,
          profilePicture: 1,
          email: 1,
          address: 1,
          location: 1,
          phone: 1,
          role: 1,
          dob: 1,
          isBlocked: 1,
          appointment: 1,
          createdAt: 1,
          formattedAddress: 1,
        },
      });
  
      const users = await userModel.aggregate(pipeline);
  
      return Utilities.sendResponsData({
        code: 200,
        message: "User list fetched successfully",
        data: users,
        totalRecord: totalCount,
        pagination: applyPagination
          ? {
              totalPages: Math.ceil(totalCount / limit),
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
