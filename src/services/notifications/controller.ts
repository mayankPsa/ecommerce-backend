import mongoose = require("mongoose");
import { Utilities } from "../../utils/utilities";
import { handleServerError } from "../../utils/ErrorHandler";
import { notificationModel } from "../../db/Notification";

export const getNotifications = async (token: any, queryParams: any, res: any) => {
  const decoded: any = await Utilities.getDecoded(token);
  const page = parseInt(queryParams.page as string) || 1;
  const limit = parseInt(queryParams.limit as string) || 10;
  const skip = (page - 1) * limit;

  /** basic filter – only notifications addressed to this user & not deleted */
  const matchStage = {
    isDeleted : false,
    recevierId: new mongoose.Types.ObjectId(decoded.id),
  };

  /** aggregation pipeline */
  const data = await notificationModel.aggregate([
    { $match: matchStage },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },

    /* 1️⃣ sender detail */
    {
      $lookup: {
        from         : 'users',          // collection name
        localField   : 'senderId',
        foreignField : '_id',
        pipeline     : [{ $project: { _id: 1, name: 1 } }],
        as           : 'sender',
      },
    },
    { $unwind: { path: '$sender', preserveNullAndEmptyArrays: true } },

    /* 2️⃣ receiver detail */
    {
      $lookup: {
        from         : 'users',
        localField   : 'recevierId',
        foreignField : '_id',
        pipeline     : [{ $project: { _id: 1, name: 1 } }],
        as           : 'receiver',
      },
    },
    { $unwind: { path: '$receiver', preserveNullAndEmptyArrays: true } },

    /* 3️⃣ reshape to match example output */
    {
      $project: {
        _id        : 1,
        isRead     : 1,
        isDeleted  : 1,
        message    : 1,
        senderType : 1,
        receiverType: 1,
        createdAt  : 1,
        updatedAt  : 1,
        orderId: 1,

        // rename look‑ups to senderId / recevierId objects
        senderId:   { _id: '$sender._id',   name: '$sender.name'   },
        recevierId: { _id: '$receiver._id', name: '$receiver.name' },
      },
    },
  ]);

  /** optional: total count for pagination */
  const totalRecords = await notificationModel.countDocuments(matchStage);

  return {
    data,
    pagination: {
      totalPages  : Math.ceil(totalRecords / limit),
      currentPage : page,
      limit,
      totalRecords,
    },
  };
};

export const getNotificationsOld = async (token: any, queryParams: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);
    const page = parseInt(queryParams.page as string) || 1;
    const limit = parseInt(queryParams.limit as string) || 10;
    const skip = (page - 1) * limit;
    let matchStage: any = { 
      isDeleted: false,
    };

    if(decoded.role === "User"){
      matchStage['recevierId'] = new mongoose.Types.ObjectId(decoded.id)
    }
    
    const totalCount = await notificationModel.countDocuments(matchStage);

    const notifications = await notificationModel.find(matchStage)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('recevierId', 'name') 
      .populate('senderId', 'name') 
      .lean();

    return Utilities.sendResponsData({
      code: 200,
      message: "Notifications fetched successfully",
      data: notifications,
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

export const markNotificationAsRead = async (token: any, body: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);
    const { notificationId } = body;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return Utilities.sendResponsData({
        code: 400,
        message: "Invalid notification ID.",
      });
    }

    const notification = await notificationModel.findOne({
      _id: notificationId,
      isDeleted: false,
      recevierId: decoded.id,
    });

    if (!notification) {
      return Utilities.sendResponsData({
        code: 404,
        message: "Notification not found.",
      });
    }

    if (notification.isRead) {
      return Utilities.sendResponsData({
        code: 200,
        message: "Notification already marked as read.",
      });
    }

    notification.isRead = true;
    notification.isDeleted = true;
    await notification.save();

    return Utilities.sendResponsData({
      code: 200,
      message: "Notification marked as read successfully.",
    });
  } catch (error) {
    handleServerError(error, res);
  }
};
