import { categoryModel } from "../../db/Category";
import mongoose = require("mongoose");
import { Utilities } from "../../utils/utilities";
import { SUCCESS } from "../../utils/messages";
import { handleServerError } from "../../utils/ErrorHandler";
import { orderModel } from "../../db/Order";
import { settingsModel } from "../../db/Settings";
import { HTTP400Error } from "../../utils/httpErrors";
import { NextFunction } from "express";
import { cartModel } from "../../db/cart";
import { FirebaseUtilities } from "../../utils/firebase";
import { partnerModel } from "../../db/Partners";
import moment from "moment";
import { userModel } from "../../db/User";
import * as path from "path";
import * as fs from "fs";
import * as ejs from "ejs";
import { MailerUtilities } from "../../utils/MailerUtilities";
import { getOrderInvoiceDetail } from "../../utils/helpers";
import { Chat } from "../../db/Chat";
import { SocketUtilities } from "../../utils/Socket";
import { notificationModel } from "../../db/Notification";

function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export const createOrder = async (token: any, req: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);
    const customerId = decoded.id;
    let bodyData: any = req.body;
    bodyData.createdBy = decoded.id;
    bodyData.updatedBy = decoded.id;
    let services: any = []
    const cartItems = await cartModel
      .find({ customerId, isDeleted: false })
    const customerDetail = await userModel.findById(decoded.id);
    const adminDetail = await userModel.findOne({ isDeleted: false, role: 'Admin' });
    if (cartItems && cartItems.length > 0) {
      cartItems.forEach((item: any) => {
        let obj = {
          serviceId: item.categoryId,
          amount: item.amount,
          type: item.type
        }
        if (obj.type && obj.type != '') services.push(obj)
      })

      if (services && services.length == 0) {
        throw new HTTP400Error(
          Utilities.sendResponsData({
            code: 400,
            message: 'Cart is empty',
          })
        )
      }
    }
    else {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: 'Cart is empty',
        })
      )
    }

    bodyData.services = services;
    let partnerDetail: any = null;

    let result: any = await orderModel.create(bodyData);

    if (cartItems && cartItems.length > 0) {
      cartItems?.forEach(async (item: any) => {
        const result = await cartModel.findByIdAndUpdate(
          item._id,
          { isDeleted: true },
          { new: true }
        );
      });
    }

    if (bodyData.partnerId && result) {
      partnerDetail = await partnerModel.findOne({ _id: new mongoose.Types.ObjectId(bodyData.partnerId) })

      let msg = `New order placed: Order ID ${result?.orderId} by ${customerDetail?.name}. Please review and process.`;
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
      console.log('partnerDetail?.fcmToken===>>', partnerDetail?.fcmToken);
      if (partnerDetail?.fcmToken && (typeof partnerDetail?.fcmToken === 'string') && partnerDetail?.fcmToken?.trim()) {
        console.log('ENTER==', partnerDetail?.fcmToken);
        let messageRes = await FirebaseUtilities.firebaseSendNotification(
          partnerDetail.fcmToken,
          payload
        );
      }
    }

    if (result) {
      console.log('ENTER RESULT');
      let messageObj = {
        title: "New order placed.",
        body: `New order placed: Order ID ${result?.orderId} by ${customerDetail?.name}. Please review and process.`,
      }

      let notificationData = {
        message: messageObj,
        recevierId: adminDetail._id,
        receiverType: "user",
        senderId: decoded.id,
        senderType: "partner",
      };

      const io = SocketUtilities.socketio.getIO();
      io.emit('notification', notificationData);
      await notificationModel.create(notificationData);

      console.log('enter in order create mail');
      let orderInvoiceDetail = await getOrderInvoiceDetail(result?._id);
      let obj = {
        recipientName: customerDetail?.name
          ? customerDetail?.name?.charAt(0).toUpperCase() + customerDetail?.name?.slice(1)
          : '',
        laundryName: partnerDetail?.laundryName
          ? partnerDetail?.laundryName?.charAt(0).toUpperCase() + partnerDetail?.laundryName?.slice(1)
          : '',
        orderId: orderInvoiceDetail?.orderId,
        pickupDate: moment(orderInvoiceDetail?.pickupDate).format("MMMM D, YYYY"),
        serviceType: (orderInvoiceDetail?.services?.length > 0) ? orderInvoiceDetail?.services?.map((s: any) => `${s.serviceName}`).join(', ') : '',
        numberOfItems: orderInvoiceDetail?.services?.length || 0,
        totalAmount: (orderInvoiceDetail?.amount).toFixed(2),
      };
      const templatePath = path.join(process.cwd(), 'src/views/orderPlaced.ejs');
      let html;
      try {
        const template = fs.readFileSync(templatePath, "utf-8");
        html = await ejs.render(template, obj);
      } catch (fileError) {
        console.error("Error reading EJS template:", fileError);
        throw new Error("Failed to load email template");
      }
     console.log('email==>',customerDetail?.email)
      const mailData = {
        recipient_email: [customerDetail?.email],
        subject: "Your Order Has Been Placed Successfully!",
        text: "message",
        html,
      };
      await MailerUtilities.sendSendgridMail(mailData);
    }

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

export const getOrderById = async (token: any, orderId: string, res: any) => {
  try {
    const objectId = new mongoose.Types.ObjectId(orderId);
    const order = await orderModel.aggregate([
      { $match: { 
          _id: objectId,
          isDeleted: false,
          // isExpired: false 
      } },
      {
        $lookup: {
          from: "deliveryoptions",
          localField: "deliveryOption",
          foreignField: "_id",
          as: "deliveryOptions",
        },
      },
      {
        $unwind: { path: "$deliveryOptions", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
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
          from: "customeraddresses",
          localField: "customerAddressId",
          foreignField: "_id",
          as: "customerAddresses",
        },
      },
      {
        $unwind: { path: "$customerAddress", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "customeraddresses",
          localField: "deliveryAddressId",
          foreignField: "_id",
          as: "deliveryAddresses",
        },
      },
      {
        $unwind: {
          path: "$deliveryAddresses",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          deliveryDate: {
            $add: [
              "$pickupDate",
              {
                $multiply: [
                  {
                    $add: [
                      { $ifNull: ["$deliveryOptions.duration", 0] },
                      { $ifNull: ["$deliveryOptions.additionalTime", 0] }
                    ]
                  },
                  24 * 60 * 60 * 1000 // Convert days to milliseconds
                ]
              }
            ]
          }
        }
      },
      {
        $unwind: {
          path: "$services",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "categories",
          localField: "services.serviceId",
          foreignField: "_id",
          as: "services.serviceDetails"
        }
      },
      {
        $unwind: {
          path: "$services.serviceDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: "$_id",
          doc: { $first: "$$ROOT" },
          services: {
            $push: {
              type: "$services.type",
              amount: "$services.amount",
              serviceId: "$services.serviceId",
              serviceDetails: "$services.serviceDetails"
            }
          }
        }
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$doc", { services: "$services" }]
          }
        }
      },
      {
        $project: {
          _id: 1,
          // weight: 1,
          // bags: 1,
          pickupTime: 1,
          pickupDate: 1,
          deliveryTime: 1,
          paymentType: 1,
          status: 1,
          amount: 1,
          deliveryDate: 1,
          transportation: 1,
          expressFee: 1,
          netAmount: 1,
          orderId: 1,
          isExpired:1,
          instructions: 1,
          // services: 1,
          deliveryOptions: {
            serviceFee: 1,
            _id: 1,
            deliveryType: 1,
            duration: 1,
          },
          customerAddresses: 1,
          deliveryAddresses: 1,
          category: {
            _id: 1,
            photo: 1,
            name: 1,
          },
          partner: {
            email: "$partner.email",
            laundryName: "$partner.laundryName",
            name: "$partner.name",
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
          services: {
            type: 1,
            amount: 1,
            serviceId: 1,
            serviceDetails: {
              _id: 1,
              name: 1,
              photo: 1,
              description: 1
            }
          },
        },
      },
    ]);

    if (!order || order.length === 0) {
      return Utilities.sendResponsData({
        code: 404,
        message: "Order not found",
        data: null,
      });
    }

    return Utilities.sendResponsData({
      code: 200,
      message: "Order fetched successfully",
      data: order[0],
    });
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const getOrderList = async (token: any, queryParams: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);
    const page = parseInt(queryParams.page as string) || 1;
    const limit = parseInt(queryParams.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = queryParams.search;
    const statusType = queryParams.statusType;

    const matchStage: any = {
      isDeleted: false,
      customerId: new mongoose.Types.ObjectId(decoded.id),
      // isExpired: false
    };

    const activeStatuses = [
      "Order placed",
      "On the way",
      "In process",
      "Laundry is cleaned",
      "Pending"
    ];
    const completedStatuses = ["Completed"];

    if (statusType === "active") {
      matchStage.status = { $in: activeStatuses };
    } else if (statusType === "completed") {
      matchStage.status = { $in: completedStatuses };
    }

    const aggregationPipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: "deliveryoptions",
          localField: "deliveryOption",
          foreignField: "_id",
          as: "deliveryOptions",
        },
      },
      {
        $unwind: { path: "$deliveryOptions", preserveNullAndEmptyArrays: true },
      },
      {
        $addFields: {
          deliveryDate: {
            $add: [
              "$pickupDate",
              {
                $multiply: [
                  {
                    $add: [
                      { $ifNull: ["$deliveryOptions.duration", 0] },
                      { $ifNull: ["$deliveryOptions.additionalTime", 0] }
                    ]
                  },
                  24 * 60 * 60 * 1000 // Convert days to milliseconds
                ]
              }
            ]
          }
        }
      },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
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
        $lookup: {
          from: "users",
          localField: "customerId",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
      // {
      //   $lookup: {
      //     from: "categories",
      //     localField: "categoryId",
      //     foreignField: "_id",
      //     as: "category",
      //   },
      // },
      // { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "customeraddresses",
          localField: "customerAddressId",
          foreignField: "_id",
          as: "customerAddresses",
        },
      },
      {
        $unwind: {
          path: "$customeraddresses",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "customeraddresses",
          localField: "deliveryAddressId",
          foreignField: "_id",
          as: "deliveryAddresses",
        },
      },
      {
        $unwind: {
          path: "$deliveryAddresses",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$services",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "categories",
          localField: "services.serviceId",
          foreignField: "_id",
          as: "services.serviceDetails"
        }
      },
      {
        $unwind: {
          path: "$services.serviceDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: "$_id",
          doc: { $first: "$$ROOT" },
          services: {
            $push: {
              type: "$services.type",
              amount: "$services.amount",
              serviceId: "$services.serviceId",
              serviceDetails: "$services.serviceDetails"
            }
          }
        }
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$doc", { services: "$services" }]
          }
        }
      }
    ];
    if (search) {
      aggregationPipeline.push({
        $match: {
          $or: [
            { "partner.name": { $regex: search, $options: "i" } },
            { "customer.name": { $regex: search, $options: "i" } },
            { status: { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    // Total count
    const totalPipeline = [...aggregationPipeline, { $count: "total" }];
    const totalResult = await orderModel.aggregate(totalPipeline);
    const totalCount = totalResult[0]?.total || 0;

    // Paginated result
    aggregationPipeline.push({ $sort: { createdAt: -1 } });
    aggregationPipeline.push({ $skip: skip });
    aggregationPipeline.push({ $limit: limit });

    aggregationPipeline.push({
      $project: {
        _id: 1,
        // weight: 1,
        // bags: 1,
        pickupTime: 1,
        pickupDate: 1,
        deliveryTime: 1,
        transportation: 1,
        expressFee: 1,
        netAmount: 1,
        paymentType: 1,
        instructions: 1,
        status: 1,
        amount: 1,
        isCancelledByCustomer:1,
        createdAt: 1,
        deliveryDate: 1,
        // services: 1,
        orderId: 1,
        isExpired:1,
        deliveryOptions: {
          serviceFee: 1,
          _id: 1,
          deliveryType: 1,
          duration: 1,
        },
        customerAddresses: 1,
        deliveryAddresses: 1,
        category: {
          _id: 1,
          photo: 1,
          name: 1,
        },
        partner: {
          email: "$partner.email",
          laundryName: "$partner.laundryName",
          name: "$partner.name",
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
        services: {
          type: 1,
          amount: 1,
          serviceId: 1,
          serviceDetails: {
            _id: 1,
            name: 1,
            photo: 1,
            description: 1
          }
        },
      },
    });

    const orders = await orderModel.aggregate(aggregationPipeline);

    return Utilities.sendResponsData({
      code: 200,
      message: "Order list fetched successfully",
      data: orders,
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

export const calculateAmount = async (token: any, body: any, next: NextFunction, res: any) => {
  try {
    const { type, bags = 0, amount = 0 } = body;

    if (!type || (type !== "bag" && type !== "kg")) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: 'Invalid type. Must be either "bag" or "kg".',
        })
      )
    }

    const settings = await settingsModel.findOne({});
    if (!settings) {
      return Utilities.sendResponsData({
        code: 404,
        message: "Settings not found.",
      });
    }

    let calculatedTotal = 0;

    if (type === "bag") {
      calculatedTotal = settings.perBagAmount * bags;
    } else if (type === "kg") {
      calculatedTotal = settings.perKgAmount * amount;
      console.log(settings.perKgAmount, "settings.perKgAmount", amount, "amount")
    }

    return Utilities.sendResponsData({
      code: 200,
      message: "Calculation successful",
      data: {
        type,
        total: calculatedTotal,
        perUnitPrice:
          type === "bag" ? settings.perBagAmount : settings.perKgAmount,
        input: type === "bag" ? bags : amount,
        transportationFee: settings.transportationFee,
      },
    });
  } catch (error) {
    console.log("first")
    handleServerError(error, res);
  }
};


export const calculateTransportationFee = async (token: any, body: any, next: NextFunction, res: any, req: any) => {
  try {
    const { pickupAddress, deliveryAddress } = body;
    const decoded: any = await Utilities.getDecoded(token);
    const partnerId = req.query.partnerId

    let partner = await partnerModel.findOne({ _id: new mongoose.Types.ObjectId(partnerId) })

    const customerId = decoded.id;
    if (
      !pickupAddress?.location?.coordinates
    ) {
      return Utilities.sendResponsData({
        code: 400,
        message: "Pickup coordinates are required.",
      });
    }

    if (!partner?.location?.coordinates) {
      return Utilities.sendResponsData({
        code: 400,
        message: "Partner location details are missing. Please update them in the admin panel.",
      });
    }

    const cartItems = await cartModel
      .find({ customerId, isDeleted: false })
      .populate("categoryId");

    const [pickupLat, pickupLng] = pickupAddress.location.coordinates;
    const [partnerLng, partnerLat] = partner?.location?.coordinates

    console.log(pickupAddress.location.coordinates, ">>>  pickupAddress.location.coordinates")
    console.log(partner?.location?.coordinates, ">>> partner?.location?.coordinates")

    let totalTransportationFee = 0;
    const distance = getDistanceInKm(pickupLat, pickupLng, partnerLat, partnerLng);

    console.log(distance, ">>> calculated distance is ::::")
    const totalDistance = distance * 2; // as per your request

    const defaultSettings = await settingsModel.findOne({ type: 'default' });
    if (!defaultSettings) {
      return Utilities.sendResponsData({
        code: 404,
        message: "Default Settings not found.",
      });
    }

    for (const item of cartItems) {
      // console.log(cartItems,">>> cartItems >>>>")
      let fee = Number(defaultSettings.transportationFee);

      if (item.categoryId) {
        const settings = await settingsModel.findOne({
          serviceId: item.categoryId._id,
          partnerId: partnerId,
          isDeleted: false
        });

        console.log(item.categoryId._id, partnerId, "categoryId", "partnerId")

        if (settings && !isNaN(Number(settings.transportationFee))) {

          console.log("Regular >>>>>>>>>>>>>>>>>>>>>>")
          // console.log(settings,">>> settings >>>")

          fee = Number(settings.transportationFee);
        }
        else {
          console.log("Default >>>>>>>>>>>>>>>>>>>>>>")
        }
      }

      if (!isNaN(fee) && item.categoryId) {
        totalTransportationFee += fee;
      }
    }

    console.log(totalTransportationFee, ">> totalTransportation Feee")
    console.log(distance, ">>> distance")
    return Utilities.sendResponsData({
      code: 200,
      message: "Transportation fee calculated successfully.",
      data: {
        distanceInKm: distance,
        transactionFee: typeof totalDistance === 'number' && typeof totalTransportationFee === 'number'
          ? parseFloat((totalDistance * totalTransportationFee).toFixed(2))
          : totalDistance * totalTransportationFee,
        cartItems: cartItems,
        partnerId: partnerId
      },
    });
  } catch (error) {
    console.log(error, ">> eror")
    handleServerError(error, res);
  }
};

export const cancelOrder = async (
  token: any,
  orderId: string,
  body: any,
  res: any
) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);

    if (!orderId) {
      return Utilities.sendResponsData({
        code: 400,
        message: "Order ID is required.",
      });
    }

    const order = await orderModel.findOne({
      _id: new mongoose.Types.ObjectId(orderId),
      isDeleted: false,
      isExpired: false,
    });

    if (!order) {
      return Utilities.sendResponsData({
        code: 404,
        message: "Order not found.",
      });
    }

    if (order.customerId.toString() !== decoded.id) {
      return Utilities.sendResponsData({
        code: 403,
        message: "You are not authorized to cancel this order.",
      });
    }

    // ⏱ Check if order is within 6 minutes of creation
    const createdAt = new Date(order.createdAt).getTime();
    const now = Date.now();
    const diffInMinutes = (now - createdAt) / (1000 * 60);

    if (diffInMinutes > 6) {
      return Utilities.sendResponsData({
        code: 404,
        message: "Order can only be cancelled within 6 minutes of creation"
      });
    }

    // ✅ Proceed with cancellation
    order.isCancelledByCustomer = true;
    order.updatedAt = new Date();
    order.updatedBy = new mongoose.Types.ObjectId(decoded.id);

    await order.save();

    let notificationData = {
      orderId: order._id,
      receiverType: "admin",
      senderId: decoded.id,
      senderType: "customer",
      notificationType: "cancelOrder",
    };
    const io = SocketUtilities.socketio.getIO();
    io.emit('cancelOrder', notificationData);

    return Utilities.sendResponsData({
      code: 200,
      message: "Order cancelled successfully",
      data: order,
    });
  } catch (error) {
    console.error("Cancel Order Error:", error);
    handleServerError(error as Error, res);
  }
};
