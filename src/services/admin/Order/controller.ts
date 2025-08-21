import mongoose = require("mongoose");
import { orderModel } from "../../../db/Order";
import { handleServerError } from "../../../utils/ErrorHandler";
import { Utilities } from "../../../utils/utilities";
import { HTTP400Error } from "../../../utils/httpErrors";
import { partnerModel } from "../../../db/Partners";
import { FirebaseUtilities } from "../../../utils/firebase";
import { transactionModel } from "../../../db/transaction";
import { generateAndUploadInvoice } from "../../../utils/FileUploadUtilities";
import * as path from "path";
import * as fs from "fs";
import * as ejs from "ejs";
import { MailerUtilities } from "../../../utils/MailerUtilities";
import moment = require("moment");
import { userModel } from "../../../db/User";
import { Chat } from "../../../db/Chat";
import { SocketUtilities } from "../../../utils/Socket";

export const getOrderById = async (token: any, orderId: string, res: any) => {
  try {
    console.log('===getOrderById===');

    const objectId = new mongoose.Types.ObjectId(orderId);
    const order = await orderModel.aggregate([
      {
        $match: {
          _id: objectId,
          isDeleted: false,
          //  isExpired: false
        }
      },

      // Lookup deliveryOptions
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

      // Calculate deliveryDate
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
                      { $ifNull: ["$deliveryOptions.additionalTime", 0] },
                    ],
                  },
                  24 * 60 * 60 * 1000, // Convert days to ms
                ],
              },
            ],
          },
        },
      },

      // Lookup partner
      {
        $lookup: {
          from: "partners",
          localField: "partnerId",
          foreignField: "_id",
          as: "partner",
        },
      },
      {
        $unwind: { path: "$partner", preserveNullAndEmptyArrays: true },
      },

      // Lookup customer
      {
        $lookup: {
          from: "users",
          localField: "customerId",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $unwind: { path: "$customer", preserveNullAndEmptyArrays: true },
      },

      // Lookup customer addresses
      {
        $lookup: {
          from: "customeraddresses",
          localField: "customerAddressId",
          foreignField: "_id",
          as: "customerAddresses",
        },
      },

      // Lookup deliveryAddressId
      {
        $lookup: {
          from: "customeraddresses",
          localField: "deliveryAddressId",
          foreignField: "_id",
          as: "deliveryAddresses",
        },
      },

      // === Unwind services and fetch service name ===
      { $unwind: { path: "$services", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "categories",
          localField: "services.serviceId",
          foreignField: "_id",
          as: "serviceDetails",
        },
      },
      { $unwind: { path: "$serviceDetails", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          "services.serviceName": "$serviceDetails.name",
        },
      },

      // === Group back the services into an array ===
      {
        $group: {
          _id: "$_id",
          orderId: { $first: "$orderId" },
          isExpired: { $first: "$isExpired" },
          pickupTime: { $first: "$pickupTime" },
          deliveryDate: { $first: "$deliveryDate" },
          deliveryTime: { $first: "$deliveryTime" },
          paymentType: { $first: "$paymentType" },
          customerId: { $first: "$customerId" },
          partnerId: { $first: "$customerId" },
          status: { $first: "$status" },
          amount: { $first: "$amount" },
          netAmount: { $first: "$netAmount" },
          transportation: { $first: "$transportation" },
          instructions: { $first: "$instructions" },
          deliveryOptions: { $first: "$deliveryOptions" },
          customerAddresses: { $first: "$customerAddresses" },
          deliveryAddresses: { $first: "$deliveryAddresses" },
          partner: { $first: "$partner" },
          customer: { $first: "$customer" },
          services: {
            $push: {
              type: "$services.type",
              amount: "$services.amount",
              serviceId: "$services.serviceId",
              serviceName: "$services.serviceName",
            },
          },
        },
      },

      // Final projection
      {
        $project: {
          _id: 1,
          pickupTime: 1,
          deliveryTime: 1,
          paymentType: 1,
          status: 1,
          services: 1,
          amount: 1,
          customerId: 1,
          partnerId: 1,
          orderId: 1,
          instructions: 1,
          deliveryDate: 1,
          netAmount: 1,
          transportation: 1,
          deliveryOptions: {
            serviceFee: 1,
            _id: 1,
            deliveryType: 1,
            duration: 1,
          },
          customerAddresses: 1,
          deliveryAddresses: 1,
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
    const page = parseInt(queryParams.page as string) || 1;
    const limit = parseInt(queryParams.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = queryParams.search;

    const matchStage: any = {
      isDeleted: false,
      // isExpired: false 
    };

    if (queryParams.customerId) {
      matchStage.customerId = new mongoose.Types.ObjectId(queryParams.customerId);
    }
    if (queryParams.partnerId) {
      matchStage.partnerId = new mongoose.Types.ObjectId(queryParams.partnerId);
    }

    const aggregationPipelineOld: any[] = [
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
              serviceDetails: "$services.serviceDetails",
              name: "$services.name"
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
      { $unwind: { path: "$deliveryOptions", preserveNullAndEmptyArrays: true } },
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
                      { $ifNull: ["$deliveryOptions.additionalTime", 0] },
                    ],
                  },
                  86_400_000,
                ],
              },
            ],
          },
        },
      },
      { $lookup: { from: "categories", localField: "categoryId", foreignField: "_id", as: "category" } },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },

      { $lookup: { from: "partners", localField: "partnerId", foreignField: "_id", as: "partner" } },
      { $unwind: { path: "$partner", preserveNullAndEmptyArrays: true } },

      { $lookup: { from: "users", localField: "customerId", foreignField: "_id", as: "customer" } },
      { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "customeraddresses",
          localField: "customerAddressId",
          foreignField: "_id",
          as: "customerAddresses",
        },
      },
      { $unwind: { path: "$customerAddresses", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$services", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "categories",
          localField: "services.serviceId",
          foreignField: "_id",
          as: "services.serviceDetails",
        },
      },
      { $unwind: { path: "$services.serviceDetails", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$_id",
          doc: { $first: "$$ROOT" },
          services: {
            $push: {
              type: "$services.type",
              amount: "$services.amount",
              serviceId: "$services.serviceId",
              serviceDetails: "$services.serviceDetails",
              name: "$services.name",
            },
          },
        },
      },
      { $replaceRoot: { newRoot: { $mergeObjects: ["$doc", { services: "$services" }] } } },
      {
        $lookup: {
          from: "chatmessages",
          let: { orderIdStr: { $toString: "$_id" } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: [{ $toString: "$orderId" }, "$$orderIdStr"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isRead", false] },
                  ],
                },
              },
            },
            { $count: "cnt" },
          ],
          as: "unreadArr",
        },
      },
      {
        $addFields: {
          unreadCount: { $ifNull: [{ $arrayElemAt: ["$unreadArr.cnt", 0] }, 0] },
        },
      },
      { $project: { unreadArr: 0 } },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          _id: 1,
          orderId: 1,
          status: 1,
          amount: 1,
          paymentType: 1,
          instructions: 1,
          deliveryDate: 1,
          pickupDate: 1,
          pickupTime: 1,
          deliveryTime: 1,
          isExpired: 1,
          isCancelledByCustomer: 1,
          createdAt: 1,
          unreadCount: 1,
          deliveryOptions: { serviceFee: 1, _id: 1, deliveryType: 1, duration: 1 },
          customerAddresses: 1,
          category: { _id: 1, photo: 1, name: 1 },
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
            serviceDetails: { _id: 1, name: 1, photo: 1, description: 1 },
          },
        },
      },
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

    aggregationPipeline.push({ $sort: { createdAt: -1 } });
    aggregationPipeline.push({
      $project: {
        _id: 1,
        pickupTime: 1,
        deliveryTime: 1,
        paymentType: 1,
        status: 1,
        unreadCount:1,
        amount: 1,
        instructions: 1,
        // services: 1,
        deliveryDate: 1,
        createdAt: 1,
        orderId: 1,
        isExpired: 1,
        pickupDate: 1,
        isCancelledByCustomer:1,
        deliveryOptions: {
          serviceFee: 1,
          _id: 1,
          deliveryType: 1,
          duration: 1,
        },
        customerAddresses: 1,
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

export const updateOrderStatus = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminDetail = await userModel.findOne({ isDeleted: false, role: 'Admin' });
    // Only allow specific status values
    if (!["Order placed","On the way", "Completed"].includes(status)) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "Invalid status. Only 'On the way' or 'Completed' allowed.",
        })
      );
    }

    const matchStage: any = {
      _id: new mongoose.Types.ObjectId(id),
      // isExpired: false
    };

    const aggregationPipeline: any[] = [
      { $match: matchStage },
      { $unwind: "$services" }, // Unwind services array
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
          otherFields: { $first: "$$ROOT" },
          services: {
            $push: "$services"
          }
        }
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$otherFields", { services: "$services" }]
          }
        }
      },
    ];

    const orderdata: any = await orderModel.aggregate(aggregationPipeline);
    let order: any

    if (orderdata.length > 0) {
      order = orderdata[0];
    }

    if (!order) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 404,
          message: "Order not found.",
        })
      );
    }

    // order.status = status;
    // order.updatedBy = req?.user?._id; // assuming `checkAuthenticate` middleware
    await orderModel.findByIdAndUpdate(order._id, {
      status,
      updatedBy: req?.user?._id,
    });

    let partnerDetail = await partnerModel.findOne({ _id: new mongoose.Types.ObjectId(order?.partnerId) })
    let userDetail = await userModel.findOne({ _id: new mongoose.Types.ObjectId(order?.customerId) })

    await Chat.create({
      orderId: order._id,
      partnerId: order.partnerId,
      customerId: order.customerId,
      adminId: adminDetail._id,
      createdBy: adminDetail._id,
      updatedBy: adminDetail._id
    });

    let msg = `Your order status has been updated to ${status}`;
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

    // ******************************************
    if (partnerDetail?.fcmToken && (typeof partnerDetail?.fcmToken === 'string') && partnerDetail?.fcmToken?.trim()) {
      console.log('ENTER==', partnerDetail?.fcmToken);
      let messageRes = await FirebaseUtilities.firebaseSendNotification(
        partnerDetail.fcmToken,
        payload
      );
    }

    if (userDetail?.fcmToken && (typeof userDetail?.fcmToken === 'string') && userDetail?.fcmToken?.trim()) {
      let messageRes = await FirebaseUtilities.firebaseSendNotification(
        userDetail.fcmToken,
        payload
      );
    }

    let serviceName = ''
    const services = order?.services;

    if (services.length > 0) {
      serviceName = services
        .map((item: any) => item.serviceDetails?.name)
        .filter(Boolean)
        .join(', ');
    }

    let data = {
      orderId: order._id,
      partnerId: order.partnerId,
      customerId: order.customerId,
      amount: order.amount,
      netAmount: order.netAmount,
      transportation: order.transportation,
      expressFee: order.expressFee,
      status: 'Paid',
    }


    if (status == "Completed" && order.paymentType == "cash") {
      transactionModel.create(data);
      console.log("TRansaction worked >>>")
    }

    if (status === 'Completed') {
      try {
        let orderInvoiceDetail = await getOrderInvoiceDetail(id);
        const invoiceUrl = await generateAndUploadInvoice(orderInvoiceDetail, serviceName);
        order.invoiceUrl = invoiceUrl;
        let updatedOrder = await orderModel.findByIdAndUpdate(order._id, {
          invoiceUrl
        });
        let obj = {
          recipientName: orderInvoiceDetail?.customer?.name
            ? orderInvoiceDetail?.customer.name?.charAt(0).toUpperCase() + orderInvoiceDetail.customer?.name?.slice(1)
            : '',
          orderId: orderInvoiceDetail?.orderId,
          pickupDate: moment(orderInvoiceDetail?.pickupDate).format("MMMM D, YYYY"),
          deliveryDate: moment(orderInvoiceDetail?.deliveryDate).format("MMMM D, YYYY"),
          itemsProcessed: orderInvoiceDetail?.services?.map((s: any) => `${s.serviceName} (${s.amount} ${s.type})`).join(', '),
          totalAmount: (orderInvoiceDetail?.amount).toFixed(2),
          invoiceUrl: invoiceUrl || '',
        };
        console.log('mail-obj-info-===>>',obj)
        const templatePath = path.join(process.cwd(), 'src/views/completed-order-email.ejs');
        let html;
        try {
          const template = fs.readFileSync(templatePath, "utf-8");
          html = await ejs.render(template, obj);
        } catch (fileError) {
          console.error("Error reading EJS template:", fileError);
          throw new Error("Failed to load email template");
        }
        console.log('>>>>>>>>>>', orderInvoiceDetail?.customer);

        const mailData = {
          recipient_email: [orderInvoiceDetail?.customer?.email], // Send to the user's email
          subject: "Your Laundry Order Has Been Delivered – Thank You!",
          text: "message",
          html,
        };

        await MailerUtilities.sendSendgridMail(mailData);

        console.log(orderdata, ">> data")
      } catch (err) {
        console.error('❌ Failed to generate/upload invoice:', err);
      }
    }

    let notificationData = {
      orderId: order?._id,
      senderType: "admin",
      orderStatus: order?.status,
      notificationType: "updateOrderStatus",
    };
    const io = SocketUtilities.socketio.getIO();
    io.emit('updateOrderStatus', notificationData);

    return Utilities.sendResponsData({
      code: 200,
      message: "Order status updated successfully.",
      data: { id, status },
    });
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

// export const updateOrderStatus = async (req: any, res: any) => {
//   try {
//     const { id } = req.params;
//     const { status } = req.body;

//     // Validate user role
//     // const userRole = req?.user?.role; // Assuming middleware sets req.user with role (e.g., "admin" or "partner")
//     // if (!userRole) {
//     //   throw new HTTP400Error(
//     //     Utilities.sendResponsData({
//     //       code: 401,
//     //       message: "Unauthorized: User role not found.",
//     //     })
//     //   );
//     // }

//     // Fetch order details
//     const matchStage: any = {
//       _id: new mongoose.Types.ObjectId(id),
//     };

//     const aggregationPipeline: any[] = [
//       { $match: matchStage },
//       { $unwind: "$services" },
//       {
//         $lookup: {
//           from: "categories",
//           localField: "services.serviceId",
//           foreignField: "_id",
//           as: "services.serviceDetails"
//         }
//       },
//       {
//         $unwind: {
//           path: "$services.serviceDetails",
//           preserveNullAndEmptyArrays: true
//         }
//       },
//       {
//         $group: {
//           _id: "$_id",
//           otherFields: { $first: "$$ROOT" },
//           services: {
//             $push: "$services"
//           }
//         }
//       },
//       {
//         $replaceRoot: {
//           newRoot: {
//             $mergeObjects: ["$otherFields", { services: "$services" }]
//           }
//         }
//       },
//     ];

//     const orderdata: any = await orderModel.aggregate(aggregationPipeline);
//     let order: any;

//     if (orderdata.length > 0) {
//       order = orderdata[0];
//     }

//     if (!order) {
//       throw new HTTP400Error(
//         Utilities.sendResponsData({
//           code: 404,
//           message: "Order not found.",
//         })
//       );
//     }

//     // Validate status transitions based on role
//     const currentStatus = order.status || "Pending"; // Ensure default to "Pending" if status is undefined
//     const validStatuses = ["Pending", "Order placed", "On the way", "In process", "Laundry is cleaned", "Completed"];

//     if (!validStatuses.includes(status)) {
//       throw new HTTP400Error(
//         Utilities.sendResponsData({
//           code: 400,
//           message: "Invalid status. Allowed statuses are: Pending, Order placed, On the way, In process, Laundry is cleaned, Completed.",
//         })
//       );
//     }

//     // Role-based status transition rules
//     if (userRole === "admin") {
//       if (
//         (currentStatus === "Pending" && status !== "Order placed") ||
//         (currentStatus === "Order placed" && status !== "On the way") ||
//         (currentStatus === "Laundry is cleaned" && status !== "Completed")
//       ) {
//         throw new HTTP400Error(
//           Utilities.sendResponsData({
//             code: 400,
//             message: `Invalid status transition for admin. From ${currentStatus}, allowed status is ${
//               currentStatus === "Pending" ? "Order placed" : currentStatus === "Order placed" ? "On the way" : "Completed"
//             }.`,
//           })
//         );
//       }
//     } else if (userRole === "partner") {
//       if (
//         (currentStatus === "On the way" && status !== "In process") ||
//         (currentStatus === "In process" && status !== "Laundry is cleaned")
//       ) {
//         throw new HTTP400Error(
//           Utilities.sendResponsData({
//             code: 400,
//             message: `Invalid status transition for partner. From ${currentStatus}, allowed status is ${
//               currentStatus === "On the way" ? "In process" : "Laundry is cleaned"
//             }.`,
//           })
//         );
//       }
//     } else {
//       throw new HTTP400Error(
//         Utilities.sendResponsData({
//           code: 403,
//           message: "Forbidden: Only admins or partners can update order status.",
//         })
//       );
//     }

//     // Update order status
//     await orderModel.findByIdAndUpdate(order._id, {
//       status,
//       updatedBy: req?.user?._id,
//     });

//     // Fetch partner and customer details
//     let partnerDetail = await partnerModel.findOne({ _id: new mongoose.Types.ObjectId(order?.partnerId) });
//     let userDetail = await userModel.findOne({ _id: new mongoose.Types.ObjectId(order?.customerId) });

//     // Send notifications
//     let msg = `Your order status has been updated to ${status}`;
//     const payload = {
//       notification: {
//         title: "Notification",
//         body: msg,
//       },
//       data: {
//         title: "Notification",
//         body: msg,
//       },
//     };

//     if (partnerDetail?.fcmToken && typeof partnerDetail.fcmToken === 'string' && partnerDetail.fcmToken.trim()) {
//       console.log('ENTER==', partnerDetail.fcmToken);
//       await FirebaseUtilities.firebaseSendNotification(partnerDetail.fcmToken, payload);
//     }

//     if (userDetail?.fcmToken && typeof userDetail.fcmToken === 'string' && userDetail.fcmToken.trim()) {
//       await FirebaseUtilities.firebaseSendNotification(userDetail.fcmToken, payload);
//     }

//     // Process services for invoice
//     let serviceName = '';
//     const services = order?.services;
//     if (services.length > 0) {
//       serviceName = services
//         .map((item: any) => item.serviceDetails?.name)
//         .filter(Boolean)
//         .join(', ');
//     }

//     // Create transaction for cash payments when status is "Completed"
//     let data = {
//       orderId: order._id,
//       partnerId: order.partnerId,
//       customerId: order.customerId,
//       amount: order.amount,
//       netAmount: order.netAmount,
//       transportation: order.transportation,
//       expressFee: order.expressFee,
//       status: 'Paid',
//     };

//     if (status === "Completed" && order.paymentType === "cash") {
//       await transactionModel.create(data);
//       console.log("Transaction created >>>");
//     }

//     // Generate and send invoice for "Completed" orders
//     if (status === 'Completed') {
//       try {
//         let orderInvoiceDetail = await getOrderInvoiceDetail(id);
//         const invoiceUrl = await generateAndUploadInvoice(orderInvoiceDetail, serviceName);
//         console.log('==invoiceUrl>>>>>>>>', invoiceUrl);
//         await orderModel.findByIdAndUpdate(order._id, { invoiceUrl });

//         let obj = {
//           recipientName: orderInvoiceDetail?.customer?.name
//             ? orderInvoiceDetail.customer.name.charAt(0).toUpperCase() + orderInvoiceDetail.customer.name.slice(1)
//             : '',
//           orderId: orderInvoiceDetail?.orderId,
//           pickupDate: moment(orderInvoiceDetail?.pickupDate).format("MMMM D, YYYY"),
//           deliveryDate: moment(orderInvoiceDetail?.deliveryDate).format("MMMM D, YYYY"),
//           itemsProcessed: orderInvoiceDetail?.services?.map((s: any) => `${s.serviceName} (${s.amount} ${s.type})`).join(', '),
//           totalAmount: orderInvoiceDetail?.amount,
//           invoiceUrl: invoiceUrl || '',
//         };

//         const templatePath = path.join(process.cwd(), 'src/views/completed-order-email.ejs');
//         let html;
//         try {
//           const template = fs.readFileSync(templatePath, "utf-8");
//           html = await ejs.render(template, obj);
//         } catch (fileError) {
//           console.error("Error reading EJS template:", fileError);
//           throw new Error("Failed to load email template");
//         }

//         const mailData = {
//           recipient_email: [orderInvoiceDetail?.customer?.email],
//           subject: "Your Laundry Order Has Been Delivered – Thank You!",
//           text: "message",
//           html,
//         };

//         await MailerUtilities.sendSendgridMail(mailData);
//         console.log(orderdata, ">> nhiệm vụ");
//       } catch (err) {
//         console.error('❌ Failed to generate/upload invoice:', err);
//       }
//     }

//     return Utilities.sendResponsData({
//       code: 200,
//       message: "Order status updated successfully.",
//       data: { id, status },
//     });
//   } catch (error) {
//     const err = error as Error;
//     handleServerError(err, res);
//   }
// };

export const getOrderInvoiceDetail = async (orderId: any) => {
  const objectId = new mongoose.Types.ObjectId(orderId);
  const order = await orderModel.aggregate([
    {
      $match: {
        _id: objectId,
        isDeleted: false,
        // isExpired: false 
      }
    },

    // Lookup deliveryOptions
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

    // Calculate deliveryDate
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
                    { $ifNull: ["$deliveryOptions.additionalTime", 0] },
                  ],
                },
                24 * 60 * 60 * 1000, // Convert days to ms
              ],
            },
          ],
        },
      },
    },

    // Lookup partner
    {
      $lookup: {
        from: "partners",
        localField: "partnerId",
        foreignField: "_id",
        as: "partner",
      },
    },
    {
      $unwind: { path: "$partner", preserveNullAndEmptyArrays: true },
    },

    // Lookup customer
    {
      $lookup: {
        from: "users",
        localField: "customerId",
        foreignField: "_id",
        as: "customer",
      },
    },
    {
      $unwind: { path: "$customer", preserveNullAndEmptyArrays: true },
    },

    // Lookup customer addresses
    {
      $lookup: {
        from: "customeraddresses",
        localField: "customerAddressId",
        foreignField: "_id",
        as: "customerAddresses",
      },
    },

    // Lookup deliveryAddressId
    {
      $lookup: {
        from: "customeraddresses",
        localField: "deliveryAddressId",
        foreignField: "_id",
        as: "deliveryAddresses",
      },
    },

    // === Unwind services and fetch service name ===
    { $unwind: { path: "$services", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "categories",
        localField: "services.serviceId",
        foreignField: "_id",
        as: "serviceDetails",
      },
    },
    { $unwind: { path: "$serviceDetails", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        "services.serviceName": "$serviceDetails.name",
      },
    },

    // === Group back the services into an array ===
    {
      $group: {
        _id: "$_id",
        orderId: { $first: "$orderId" },
        isExpired: { $first: "$isExpired" },
        pickupTime: { $first: "$pickupTime" },
        deliveryDate: { $first: "$deliveryDate" },
        deliveryTime: { $first: "$deliveryTime" },
        paymentType: { $first: "$paymentType" },
        status: { $first: "$status" },
        amount: { $first: "$amount" },
        netAmount: { $first: "$netAmount" },
        transportation: { $first: "$transportation" },
        instructions: { $first: "$instructions" },
        deliveryOptions: { $first: "$deliveryOptions" },
        customerAddresses: { $first: "$customerAddresses" },
        deliveryAddresses: { $first: "$deliveryAddresses" },
        partner: { $first: "$partner" },
        customer: { $first: "$customer" },
        services: {
          $push: {
            type: "$services.type",
            amount: "$services.amount",
            serviceId: "$services.serviceId",
            serviceName: "$services.serviceName",
          },
        },
      },
    },

    // Final projection
    {
      $project: {
        _id: 1,
        pickupTime: 1,
        deliveryTime: 1,
        paymentType: 1,
        status: 1,
        services: 1,
        amount: 1,
        orderId: 1,
        isExpired:1,
        instructions: 1,
        deliveryDate: 1,
        netAmount: 1,
        transportation: 1,
        deliveryOptions: {
          serviceFee: 1,
          _id: 1,
          deliveryType: 1,
          duration: 1,
        },
        customerAddresses: 1,
        deliveryAddresses: 1,
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
      },
    },
  ]);
  if (order?.length > 0) {
    return order[0];
  } else {
    { }
  }
}