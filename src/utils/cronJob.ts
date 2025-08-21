import moment from "moment";
import { FirebaseUtilities, sendFirebaseNotification } from "./firebase";
import { orderModel } from "../db/Order";
import { userModel } from "../db/User";
import { MailerUtilities } from "./MailerUtilities";
import * as path from "path";
import * as fs from "fs";
import * as ejs from "ejs";
import { getOrderInvoiceDetail } from "./helpers";
import { SocketUtilities } from "./Socket";

export class cronServer {
  public static expireOrders = async () => {
    try {
      const now = new Date();
      // const fifteenMinutesAgo = new Date(now.getTime() - 1 * 60 * 1000);
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

      const expiredOrders = await orderModel.find({
        isDeleted: false,
        status: "Pending", 
        isExpired: false,
        createdAt: { $lte: fifteenMinutesAgo },
      });

      // console.log("Checking for orders to expire at:", fifteenMinutesAgo);
      // console.log("Found expired orders:", expiredOrders.map((o: any) => o._id));

      for (const order of expiredOrders) {
        await orderModel.updateOne(
          { _id: order._id },
          { $set: { isExpired: true } }
        );

        const customer = await userModel.findById(order.customerId);

        if (!customer) {
          console.warn(`Customer not found for order ${order._id}`);
          continue;
        }

        const msg = `It seems we weren’t able to catch your booking in time. We’d be happy to reschedule when it suits you. (Order ID: #${order.orderId})`;
        const payload = {
          notification: {
            title: "Order Expired",
            body: msg,
          },
          data: {
            title: "Order Expired",
            body: msg,
          },
        };

        if (
          customer.fcmToken &&
          typeof customer.fcmToken === "string" &&
          customer.fcmToken.trim()
        ) {
          try {
            await FirebaseUtilities.firebaseSendNotification(customer.fcmToken, payload);
            console.log(`Notification sent to user ${customer._id} for expired order ${order._id}`);
          } catch (err) {
            console.error(`Failed to send notification to user ${customer._id}:`, err);
          }
        } else {
          console.warn(`User ${customer._id} has no valid FCM token`);
        }

        let orderInvoiceDetail = await getOrderInvoiceDetail(order?._id);

        let notificationData = {
          orderId: order._id,
          receiverType: "admin",
          senderType: "customer",
          notificationType: "expireOrder",
        };
        const io = SocketUtilities.socketio.getIO();
        io.emit('expireOrder', notificationData);


        let obj = {
          recipientName: customer?.name
            ? customer?.name?.charAt(0).toUpperCase() + customer?.name?.slice(1)
            : '',
          orderId: orderInvoiceDetail?.orderId,
          pickupDate: moment(orderInvoiceDetail?.pickupDate).format("MMMM D, YYYY"),
          serviceType: (orderInvoiceDetail?.services?.length > 0) ? orderInvoiceDetail?.services?.map((s: any) => `${s.serviceName}`).join(', ') : '',
          numberOfItems: orderInvoiceDetail?.services?.length || 0,
          totalAmount: orderInvoiceDetail?.amount,
        };
        const templatePath = path.join(process.cwd(), 'src/views/orderExpired.ejs');
        let html;
        try {
          const template = fs.readFileSync(templatePath, "utf-8");
          html = await ejs.render(template, obj);
        } catch (fileError) {
          console.error("Error reading EJS template:", fileError);
          throw new Error("Failed to load email template");
        }
        console.log('email==>', customer?.email)
        const mailData = {
          recipient_email: [customer?.email],
          subject: "We missed your booking — let's reschedule!",
          text: "It seems we weren’t able to catch your booking in time...",
          html,
        };
        await MailerUtilities.sendSendgridMail(mailData);
      }
    } catch (error) {
      console.error("Error in expireOrders cron:", error);
    }
  };
}
