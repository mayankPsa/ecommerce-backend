import mongoose = require("mongoose");
import { Utilities } from "../../utils/utilities";
import { handleServerError } from "../../utils/ErrorHandler";
import { HTTP400Error } from "../../utils/httpErrors";
import { transactionModel } from "../../db/transaction";
import { cartModel } from "../../db/cart";
import { settingsModel } from "../../db/Settings";
import { Chat } from "../../db/Chat";
import { ChatMessages } from "../../db/chatMessages";
import { SocketUtilities } from "../../utils/Socket";

export const getChat = async (token: any, query: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);

    const { orderId } = query;

    if (!orderId) {
      return res.status(400).json({
        code: 400,
        message: "orderId is required",
      });
    }
    console.log('decoded.id==>', decoded.id);
    const decodedObjectId = new mongoose.Types.ObjectId(decoded.id);
    const chatData = await Chat.aggregate([
      {
        $match: {
          isDeleted: false,
          $or: [
            { customerId: decodedObjectId },
            { partnerId: decodedObjectId }
          ]
        }
      },
      { $sort: { createdAt: 1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customerDetails'
        }
      },
      {
        $unwind: {
          path: '$customerDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'partners',
          localField: 'partnerId',
          foreignField: '_id',
          as: 'partnerDetails'
        }
      },
      {
        $unwind: {
          path: '$partnerDetails',
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $project: {
          isRead: 1,
          createdAt: 1,
          createdBy: 1,
          updatedBy: 1,
          orderId: 1,
          customerDetails: {
            _id: 1,
            name: 1,
            email: 1,
            profilePicture: 1
          },
          partnerDetails: {
            _id: 1,
            name: 1,
            email: 1,
            profilePicture: 1
          }
        }
      }
    ]);

    return Utilities.sendResponsData({
      code: 200,
      message: "Chat fetched successfully",
      data: {
        messages: chatData,
      },
    });
  } catch (error:any) {
    handleServerError(error, res);
  }
};

export const getChatMessages = async (token: any, query: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);

    const { orderId } = query;

    if (!orderId) {
      return res.status(400).json({
        code: 400,
        message: "orderId is required",
      });
    }

    // const match: any = {
    //   orderId: new mongoose.Types.ObjectId(orderId),
    //   isDeleted: false,
    // };
    console.log('decoded.id==>', decoded.id);

    // if (decoded.id) {
    //   const userId = new mongoose.Types.ObjectId(decoded.id);
    //   match.$or = [
    //     { senderId: userId },
    //     { receiverId: userId }  
    //   ];
    // }    

    const chatMessages = await ChatMessages.aggregate([
      {
        $match: {
          orderId: new mongoose.Types.ObjectId(query.orderId),
          isDeleted: false,
          $or: [
            { senderId: new mongoose.Types.ObjectId(decoded.id) },
            { receiverId: new mongoose.Types.ObjectId(decoded.id) }
          ]
        }
      },
      { $sort: { createdAt: 1 } },

      // Lookup sender from users
      {
        $lookup: {
          from: 'users',
          localField: 'senderId',
          foreignField: '_id',
          as: 'senderUser'
        }
      },
      {
        $unwind: {
          path: '$senderUser',
          preserveNullAndEmptyArrays: true
        }
      },
      // Lookup sender from partners
      {
        $lookup: {
          from: 'partners',
          localField: 'senderId',
          foreignField: '_id',
          as: 'senderPartner'
        }
      },
      {
        $unwind: {
          path: '$senderPartner',
          preserveNullAndEmptyArrays: true
        }
      },

      // Lookup receiver from users
      {
        $lookup: {
          from: 'users',
          localField: 'receiverId',
          foreignField: '_id',
          as: 'receiverUser'
        }
      },
      {
        $unwind: {
          path: '$receiverUser',
          preserveNullAndEmptyArrays: true
        }
      },
      // Lookup receiver from partners
      {
        $lookup: {
          from: 'partners',
          localField: 'receiverId',
          foreignField: '_id',
          as: 'receiverPartner'
        }
      },
      {
        $unwind: {
          path: '$receiverPartner',
          preserveNullAndEmptyArrays: true
        }
      },

      // Combine sender and receiver info
      {
        $addFields: {
          senderDetails: {
            $ifNull: ['$senderUser', '$senderPartner']
          },
          receiverDetails: {
            $ifNull: ['$receiverUser', '$receiverPartner']
          }
        }
      },

      // Optional: project fields to return
      {
        $project: {
          message: 1,
          image: 1,
          document: 1,
          isRead: 1,
          createdAt: 1,
          senderId:1,
          receiverId:1,
          orderId:1,
          senderDetails: {
            name: 1,
            profilePicture: 1,
            email: 1,
            role: 1
          },
          receiverDetails: {
            name: 1,
            profilePicture: 1,
            email: 1,
            role: 1
          }
        }
      }
    ]);

    return Utilities.sendResponsData({
      code: 200,
      message: "Chat fetched successfully",
      data: {
        messages: chatMessages,
      },
    });

  } catch (error:any) {
    handleServerError(error, res);
  }
};


export const deleteChat = async (token: any, req: any, res: any) => {
  try {
    const chatId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      throw new HTTP400Error(
        Utilities.sendResponsData({ code: 400, message: "Invalid chat ID" })
      );
    }
    console.log('chatId==>>',chatId);

    const result = await ChatMessages.findByIdAndUpdate(
      {_id : new mongoose.Types.ObjectId(chatId)},
      { isDeleted: true },
      { new: true }
    );

    console.log('result==>',JSON.stringify(result));


    if (!result) {
      return Utilities.sendResponsData({
        code: 404,
        message: "Chat message not found",
      });
    }

    let socketObj = {
      receiverId: result?.receiverId,
      senderId: result?.senderId,
      chatId:chatId
    }
    const io: any = SocketUtilities.socketio.getIO();
    const roomId = result.orderId.toString(); // assuming orderId is the room name
    io.emit("chatDeleted", result);
    // io.to(roomId).emit("chatDeleted", { chatId });

    return Utilities.sendResponsData({
      code: 200,
      message: "Chat message deleted successfully",
    });
  } catch (error) {
    console.log('error==>>', error);
    handleServerError(error, res);
  }
};

export const orderChatDetail = async (token: any, req: any, res: any) => {
  try {
    const orderId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new HTTP400Error(
        Utilities.sendResponsData({ code: 400, message: "Invalid chat ID" })
      );
    }

    const result = await Chat.findOne(
      { orderId: new mongoose.Types.ObjectId(orderId) },
      { isDeleted: false }
    );

    if (!result) {
      return Utilities.sendResponsData({
        code: 404,
        message: "Chat not found",
      });
    }

    return Utilities.sendResponsData({
      code: 200,
      message: "Chat Detail successfully",
      data: result
    });
  } catch (error) {
    console.log('error==>>', error);
    handleServerError(error, res);
  }
};


export const updateChatStatus = async (token: any, query: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);

    const { orderId } = query;

    if (!orderId) {
      return res.status(400).json({
        code: 400,
        message: "orderId is required",
      });
    }

    const decodedObjectId = new mongoose.Types.ObjectId(decoded.id);

    const updatedChat = await Chat.updateMany(
      {
        isDeleted: false,
        orderId: new mongoose.Types.ObjectId(orderId),
        $or: [
          { customerId: decodedObjectId },
          { partnerId: decodedObjectId }
        ],
        read_status: 'unread'
      },
      {
        $set: {
          read_status: 'read',
          updatedBy: decodedObjectId
        }
      }
    );

    if (updatedChat.matchedCount === 0) {
      return res.status(404).json({
        code: 404,
        message: "No unread messages found for the given orderId",
      });
    }

    return Utilities.sendResponsData({
      code: 200,
      message: "Chat status updated successfully",
      data: {
        modifiedCount: updatedChat.modifiedCount
      },
    });
  } catch (error: any) {
    handleServerError(error, res);
  }
};

export const readChatMessages = async (token: any, query: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);

    const { orderId } = query;

    if (!orderId) {
      return res.status(400).json({
        code: 400,
        message: "orderId is required",
      });
    }

    const decodedObjectId = new mongoose.Types.ObjectId(decoded.id);
    console.log('decodedObjectI==>',decodedObjectId);
    

    const updatedChat = await ChatMessages.updateMany(
      {
        isDeleted: false,
        orderId: new mongoose.Types.ObjectId(orderId)
      },
      {
        $set: {
          isRead: true,
          updatedBy: decodedObjectId
        }
      }
    );
console.log('updatedChat===>',updatedChat);

    if (updatedChat.matchedCount === 0) {
      return res.status(404).json({
        code: 404,
        message: "No unread messages found for the given orderId",
      });
    }

    return Utilities.sendResponsData({
      code: 200,
      message: "Chat read status updated successfully"
    });
  } catch (error: any) {
    handleServerError(error, res);
  }
};