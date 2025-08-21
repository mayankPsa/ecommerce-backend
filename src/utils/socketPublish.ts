import moment from "moment";
import { SocketUtilities } from "./Socket";
import { Chat } from "../db/Chat";
import mongoose = require("mongoose");
import { ChatMessages } from "../db/chatMessages";
import { userModel } from "../db/User";
import { partnerModel } from "../db/Partners";
// import { FirebaseUtilities } from "./firebase";
import { orderModel } from "../db/Order";
import { notificationModel } from "../db/Notification";

export class ChatUtilities {
  public static publishIds = async () => {
    const io: any = SocketUtilities.socketio.getIO(); // Get the socket instance
    let adminSocketId: any = null;

    io.on("connection", (socket: any) => {
      console.log("User connected:", socket.id);
      socket.on('registerAdmin', () => {
        adminSocketId = socket.id;
        console.log(`Admin registered with socket ID: ${adminSocketId}`);
      });
      // Join room (orderId is used as room ID)
      // socket.on("joinRoom", (data: any) => {
      //   console.log('join room===', data);

      //   const { orderId } = data;
      //   let orderChat = Chat.findOne({ orderId: new mongoose.Types.ObjectId(orderId) });
      //   if (!orderChat) {
      //     socket.emit("error", { message: "Invalid order ID" });
      //   }
      //   socket.join(orderId);
      //   console.log(`User ${socket.id} joined room ${orderId}`);
      // });


      socket.on('joinAdmin', () => {
        socket.join('admin');
        console.log(`User ${socket.id} joined admin room`);
      });

      socket.on('joinRoom', (data: any) => {
        console.log('join room===', data);
        const { orderId } = data;
        let orderChat = Chat.findOne({ orderId: new mongoose.Types.ObjectId(orderId) });
        if (!orderChat) {
          socket.emit('error', { message: 'Invalid order ID' });
        }
        socket.join(orderId);
        console.log(`User ${socket.id} joined room ${orderId}`);
      });


      // Typing indicator
      socket.on("typing", (data: any) => {
        const { orderId, senderId } = data;
        socket.to(orderId).emit("typing", { senderId });
      });

      socket.on("stopTyping", (data: any) => {
        const { orderId, senderId } = data;
        socket.to(orderId).emit("stopTyping", { senderId });
      });

      // Send message
      // socket.on("sendMessage", async (data: any) => {
      //   const { message, orderId, senderId, receiverId, createdBy, image, document } = data;
      //   if (!orderId || !senderId || !receiverId) {
      //     return socket.emit("error", "Missing required fields");
      //   }

      //   const chat = await ChatMessages.create({
      //     message,
      //     image,
      //     document,
      //     orderId: new mongoose.Types.ObjectId(orderId),
      //     senderId: new mongoose.Types.ObjectId(senderId),
      //     receiverId: new mongoose.Types.ObjectId(receiverId),
      //     createdBy: new mongoose.Types.ObjectId(createdBy),
      //     updatedBy: new mongoose.Types.ObjectId(createdBy),
      //   });
      //   console.log('chat==>>', JSON.stringify(chat));

      //   io.to(orderId).emit("newMessage", chat);
      //   let orderDetail = await orderModel.findOne({ _id: new mongoose.Types.ObjectId(orderId) });
      //   // Fetch sender and receiver details
      //   const sender =
      //     (await userModel.findById(senderId).lean()) ||
      //     (await partnerModel.findById(senderId).lean());

      //   const receiver =
      //     (await userModel.findById(receiverId).lean()) ||
      //     (await partnerModel.findById(receiverId).lean());

      //   console.log('sender==>', JSON.stringify(sender));
      //   console.log('receiver==>', JSON.stringify(receiver));
      //   console.log('receiver==>', typeof receiverId);
      //   console.log('senderId==>', typeof senderId);

      //   if (!sender) {
      //     console.warn(`Sender not found for ID: ${senderId}`);
      //   }

      //   if (!receiver) {
      //     console.warn(`Receiver not found for ID: ${receiverId}`);
      //   }

      //   const fcmToken = receiver?.fcmToken;
      //   const senderName = sender?.name || "Someone";
      //   const msg = `${senderName} (Order ${orderDetail?.orderId}): ${(image || document) ? "Sent a file" : message}`;

      //   if (fcmToken && typeof fcmToken === "string" && fcmToken.trim()) {
      //     const payload = {
      //       notification: {
      //         title: "Message",
      //         body: msg,
      //       },
      //       data: {
      //         title: "Message",
      //         body: msg,
      //       },
      //     };

      //     await FirebaseUtilities.firebaseSendNotification(fcmToken, payload);
      //   }
      // });

      socket.on('sendMessage', async (data: any) => {
        const { message, orderId, senderId, receiverId, createdBy, image, document } = data;
        if (!orderId || !senderId || !receiverId) {
          return socket.emit('error', 'Missing required fields');
        }

        try {
          const chat: any = await ChatMessages.create({
            message,
            image,
            document,
            orderId: new mongoose.Types.ObjectId(orderId),
            senderId: new mongoose.Types.ObjectId(senderId),
            receiverId: new mongoose.Types.ObjectId(receiverId),
            createdBy: new mongoose.Types.ObjectId(createdBy),
            updatedBy: new mongoose.Types.ObjectId(createdBy),
          });
          console.log('chat==>>', JSON.stringify(chat));

          io.to(orderId).emit('newMessage', chat);

          const orderDetail = await orderModel.findOne({ _id: new mongoose.Types.ObjectId(orderId) });
          const sender =
            (await userModel.findById(senderId).lean()) ||
            (await partnerModel.findById(senderId).lean());
          const receiver =
            (await userModel.findById(receiverId).lean()) ||
            (await partnerModel.findById(receiverId).lean());



          if (!sender) {
            console.warn(`Sender not found for ID: ${senderId}`);
          }
          if (!receiver) {
            console.warn(`Receiver not found for ID: ${receiverId}`);
          }

          const fcmToken = receiver?.fcmToken;
          const senderName = sender?.name || "Someone";
          const msg = `${senderName} (Order ${orderDetail?.orderId}): ${(image || document) ? "Sent a file" : message}`;
          let msgObj = {
            title: "Chat",
            body: msg
          }
          let notificationData = {
            message: msgObj,
            recevierId: receiver._id,
            receiverType: "admin",
            senderId: sender._id,
            senderType: "user",
            note: "",
            orderId: new mongoose.Types.ObjectId(orderId)
          };
  
          let res = await notificationModel.create(notificationData);

          if (fcmToken && typeof fcmToken === "string" && fcmToken.trim()) {
            const payload = {
              notification: {
                title: "Message",
                body: msg,
              },
              data: {
                title: "Message",
                body: msg,
              },
            };

            // await FirebaseUtilities.firebaseSendNotification(fcmToken, payload);
          }
            const notification = {
              orderId,
              message: `${senderName} (Order ${orderDetail?.orderId}): ${image || document ? 'Sent a file' : message}`,
              chatId: chat._id,
              timestamp: chat.createdAt,
            };

            if (adminSocketId) {
              io.to(adminSocketId).emit('newMessageNotification', notification);
            } else {
              console.warn('Admin is not connected');
            }

          } catch (error) {
            console.error('Error in sendMessage:', error);
            socket.emit('error', { message: 'Failed to send message' });
          }
        });


      socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
      });
    });
  };
}

export class NotificationtUtilities {
  public static publishIds = async (data: any) => {
    const io: any = SocketUtilities.socketio.getIO();
    io.on("connection", (socket: any) => {
      io.emit("test", { data: data });
      console.log(data, ">>> data >>>> socket is working >>>>")
      socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
      });
    });
  };
}
