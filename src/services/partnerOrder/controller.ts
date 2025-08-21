import { categoryModel } from "../../db/Category";
import mongoose = require("mongoose");
import { Utilities } from "../../utils/utilities";
import { SUCCESS } from "../../utils/messages";
import { handleServerError } from "../../utils/ErrorHandler";
import { orderModel } from "../../db/Order";
import { settingsModel } from "../../db/Settings";
import { HTTP400Error, HTTP401Error, HTTP404Error } from "../../utils/httpErrors";
import { NextFunction } from "express";
// import { FirebaseUtilities } from "../../utils/firebase";
import { notificationModel } from "../../db/Notification";
import { userModel } from "../../db/User";
import { NotificationtUtilities } from "../../utils/socketPublish";
import { transactionModel } from "../../db/transaction";
import moment = require("moment");
import { generateAndUploadInvoice } from "../../utils/FileUploadUtilities";
import { SocketUtilities } from "../../utils/Socket";


const generateChartDataNew = async (range: any, match: any) => {
  const now = moment();
  let groupBy, labels, dateFormat;

  // Define how to group data and label the x-axis based on range
  switch (range) {
    case 'week':
      groupBy = { $dayOfWeek: '$createdAt' };
      labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      dateFormat = 'dayOfWeek';
      break;
    case 'month':
      groupBy = {
        $cond: [
          { $lte: [{ $dayOfMonth: '$createdAt' }, 15] },
          '1-15',
          '15-30'
        ]
      };
      labels = ['1-15', '15-30'];
      dateFormat = 'dayRange';
      break;
    case '6-month':
      groupBy = { $month: '$createdAt' };
      labels = moment.monthsShort().slice(now.month() - 5, now.month() + 1);
      dateFormat = 'month';
      break;
    case 'year':
      groupBy = { $month: '$createdAt' };
      labels = moment.monthsShort();
      dateFormat = 'month';
      break;
    case 'all':
      groupBy = { $year: '$createdAt' };
      const years = await transactionModel.distinct('createdAt', match).then((dates: any) =>
        [...new Set(dates.map((d: any) => moment(d).year()))].sort()
      );
      labels = years;
      dateFormat = 'year';
      break;
    default:
      groupBy = { $month: '$createdAt' };
      labels = moment.monthsShort();
      dateFormat = 'month';
  }

  // Aggregate revenue by the defined group
  const chartData = await transactionModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: groupBy,
        revenue: { $sum: '$amount' }
      }
    },
    { $sort: { '_id': 1 } }
  ]);

  // Map the aggregated data to the labels
  const data = labels.map((label: any, index: any) => {
    const entry = chartData.find(d => {
      if (dateFormat === 'dayOfWeek') return d._id === (index + 1);
      if (dateFormat === 'dayRange') return d._id === label;
      if (dateFormat === 'month') return d._id === (index + 1);
      if (dateFormat === 'year') return d._id === label;
      return false;
    });
    return entry ? entry.revenue : 0;
  });

  return { labels, data };
};

// const generateChartData = async (range: string, match: any) => {
//   switch (range) {
//     case 'week':
//       return await transactionModel.aggregate([
//         { $match: match },
//         {
//           $group: {
//             _id: { $dayOfWeek: "$createdAt" }, // 1=Sunday, 2=Monday...
//             count: { $sum: 1 }
//           }
//         }
//       ]).then(result => {
//         const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
//         const chart:any = days.reduce((acc, day) => ({ ...acc, [day]: 0 }), {});
//         result.forEach(item => {
//           const dayName = days[item._id - 1];
//           chart[dayName] = item.count;
//         });
//         return chart;
//       });

//     case 'month':
//       return await transactionModel.aggregate([
//         { $match: match },
//         {
//           $group: {
//             _id: { $dayOfMonth: "$createdAt" },
//             count: { $sum: 1 }
//           }
//         }
//       ]).then(result => {
//         const chart:any = {};
//         for (let i = 1; i <= 31; i++) {
//           chart[`Day ${i}`] = 0;
//         }
//         result.forEach(item => {
//           chart[`Day ${item._id}`] = item.count;
//         });
//         return chart;
//       });

//     case '6-month':
//     case 'year':
//       return await transactionModel.aggregate([
//         { $match: match },
//         {
//           $group: {
//             _id: { $month: "$createdAt" },
//             count: { $sum: 1 }
//           }
//         }
//       ]).then(result => {
//         const months:any = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
//         const chart = months.reduce((acc:any, m:any) => ({ ...acc, [m]: 0 }), {});
//         result.forEach((item:any) => {
//           chart[months[item._id - 1]] = item.count;
//         });

//         // For 6-month: filter only last 6 months
//         if (range === '6-month') {
//           const start = moment().subtract(5, 'months').month();
//           const filteredChart:any = {};
//           for (let i = 0; i < 6; i++) {
//             const monthIndex = (start + i) % 12;
//             filteredChart[months[monthIndex]] = chart[months[monthIndex]];
//           }
//           return filteredChart;
//         }

//         return chart;
//       });

//     case 'all':
//       return await transactionModel.aggregate([
//         { $match: match },
//         {
//           $group: {
//             _id: { $year: "$createdAt" },
//             count: { $sum: 1 }
//           }
//         }
//       ]).then(result => {
//         const chart:any = {};
//         result.forEach(item => {
//           chart[item._id] = item.count;
//         });
//         return chart;
//       });

//     default:
//       return {};
//   }
// };


const generateChartData = async (range: any, match: any) => {
  const now = moment();
  const [startDate, endDate] = [
    match.createdAt.$gte,
    match.createdAt.$lte
  ];

  let labels = [];
  let data = [];
  let interval;

  // Determine total revenue for scaling Y-axis
  const revenueData = await transactionModel.aggregate([
    { $match: { ...match, isDeleted: false } },
    {
      $group: {
        _id: null,
        total: {
          $sum: {
            $subtract: ["$amount", { $ifNull: ["$transportation", 0] }]
          }
        }
      }
    }
  ]);
  const totalRevenue = revenueData[0]?.total || 0;

  // Y-axis configuration as an array of tick values
  const maxRevenue = totalRevenue > 0 ? totalRevenue : 1; // Avoid division by zero
  let yAxisInterval;
  let yAxisMax;

  if (maxRevenue >= 100000) {
    // If total revenue >= 1 lakh, use 10,000 intervals
    yAxisInterval = 10000;
    yAxisMax = Math.ceil(maxRevenue / yAxisInterval) * yAxisInterval; // Round up to nearest 10,000
  } else {
    // If total revenue < 1 lakh, calculate an interval to have ~5 to 10 ticks
    const targetTicks = 7; // Aim for around 7 ticks for a nice look
    yAxisInterval = Math.ceil(maxRevenue / targetTicks / 1000) * 1000; // Round to nearest 1,000 for clean numbers
    yAxisInterval = yAxisInterval === 0 ? 1000 : yAxisInterval; // Ensure interval is at least 1,000
    yAxisMax = Math.ceil(maxRevenue / yAxisInterval) * yAxisInterval; // Round up to nearest interval
  }

  // Generate Y-axis array: [0, yAxisInterval, 2*yAxisInterval, ..., yAxisMax]
  const yAxis = [];
  for (let tick = 0; tick <= yAxisMax; tick += yAxisInterval) {
    yAxis.push(tick);
  }

  // Handle different ranges for X-axis
  if (range === 'week') {
    // Weekly: Show each day (Sun to Sat)
    labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    data = Array(7).fill(0);
    interval = 'day';

    const transactions = await transactionModel.aggregate([
      { $match: { ...match, isDeleted: false } },
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" }, // 1 = Sunday, 7 = Saturday
          total: {
            $sum: {
              $subtract: ["$amount", { $ifNull: ["$transportation", 0] }]
            }
          }
        }
      }
    ]);

    transactions.forEach(t => {
      const dayIndex = t._id - 1; // Adjust for array indexing (0-6)
      data[dayIndex] = Number(t.total.toFixed(2)); // Round to 2 decimals
    });

  } else if (range === 'month') {
    // Monthly: Generate data for each day, but label only 1st, 15th, and last day
    const daysInMonth = moment(startDate).endOf('month').date();
    labels = ['1', '15', `${daysInMonth}`]; // Labels for frontend to space out
    data = Array(daysInMonth).fill(0); // One entry per day

    const transactions = await transactionModel.aggregate([
      { $match: { ...match, isDeleted: false } },
      {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          total: {
            $sum: {
              $subtract: ["$amount", { $ifNull: ["$transportation", 0] }]
            }
          }
        }
      }
    ]);

    // Assign revenue to the exact day
    transactions.forEach(t => {
      const day = t._id;
      const index = day - 1; // Array index (0-based)
      if (index >= 0 && index < daysInMonth) {
        data[index] = Number(t.total.toFixed(2));
      }
    });

    interval = 'day';

  } else if (range === '6-month') {
    // 6-Month: Show each month
    labels = [];
    data = Array(6).fill(0);
    interval = 'month';

    const startMonth = moment(startDate).startOf('month');
    for (let i = 0; i < 6; i++) {
      labels.push(startMonth.clone().add(i, 'months').format('MMM'));
    }

    const transactions = await transactionModel.aggregate([
      { $match: { ...match, isDeleted: false } },
      {
        $group: {
          _id: { $month: "$createdAt" },
          total: {
            $sum: {
              $subtract: ["$amount", { $ifNull: ["$transportation", 0] }]
            }
          }
        }
      }
    ]);

    transactions.forEach(t => {
      const monthIndex = t._id - moment(startDate).month() - 1;
      if (monthIndex >= 0 && monthIndex < 6) {
        data[monthIndex] = Number(t.total.toFixed(2));
      }
    });

  } else if (range === 'year') {
    // Yearly: Show each month
    labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    data = Array(12).fill(0);
    interval = 'month';

    const transactions = await transactionModel.aggregate([
      { $match: { ...match, isDeleted: false } },
      {
        $group: {
          _id: { $month: "$createdAt" },
          total: {
            $sum: {
              $subtract: ["$amount", { $ifNull: ["$transportation", 0] }]
            }
          }
        }
      }
    ]);

    transactions.forEach(t => {
      const monthIndex = t._id - 1;
      data[monthIndex] = Number(t.total.toFixed(2));
    });

  } else {
    // All time: Group by year
    const startYear = moment(startDate).year();
    const endYear = moment(endDate).year();
    const yearCount = endYear - startYear + 1;
    labels = [];
    data = Array(yearCount).fill(0);
    interval = 'year';

    for (let year = startYear; year <= endYear; year++) {
      labels.push(year.toString());
    }

    const transactions = await transactionModel.aggregate([
      { $match: { ...match, isDeleted: false } },
      {
        $group: {
          _id: { $year: "$createdAt" },
          total: {
            $sum: {
              $subtract: ["$amount", { $ifNull: ["$transportation", 0] }]
            }
          }
        }
      }
    ]);

    transactions.forEach(t => {
      const yearIndex = t._id - startYear;
      data[yearIndex] = Number(t.total.toFixed(2));
    });
  }

  return {
    labels,
    data,
    yAxis,
    interval
  };
};

export const getOrderById = async (token: any, orderId: string, res: any) => {
  try {
    const objectId = new mongoose.Types.ObjectId(orderId);
    const order = await orderModel.aggregate([
      {
        $match: {
          _id: objectId,
          isDeleted: false,
          // isExpired: false 
        }
      },
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
      // {
      //   $lookup: {
      //     from: "categories",
      //     localField: "categoryId",
      //     foreignField: "_id",
      //     as: "category",
      //   },
      // },
      // { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
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
          localField: "deliveryAddressId",
          foreignField: "_id",
          as: "deliveryAddress",
        },
      },
      { $unwind: { path: "$deliveryAddress", preserveNullAndEmptyArrays: true } },
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
        $project: {
          _id: 1,
          weight: 1,
          bags: 1,
          pickupTime: 1,
          deliveryTime: 1,
          paymentType: 1,
          status: 1,
          invoiceUrl: 1,
          amount: 1,
          orderId: 1,
          isExpired:1,
          netAmount: 1,
          pickupDate: 1,
          instructions: 1,
          services: 1,
          transportation: 1,
          deliveryDate: 1,
          deliveryAddress: 1,
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
    const filterType = queryParams.filter; // expecting 'active' or 'history'

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const matchStage: any = {
      isDeleted: false,
      // isExpired: false,
      partnerId: new mongoose.Types.ObjectId(decoded.id),
    };

    if (filterType === "active") {
      matchStage.status = { $ne: "Completed" }; // exclude delivery
    } else if (filterType === "history") {
      matchStage.status = "Completed"; // only delivery
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
          from: "partners",
          localField: "partnerId",
          foreignField: "_id",
          as: "partner",
        },
      },
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
          path: "$customerAddresses",
          preserveNullAndEmptyArrays: true,
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

    const totalPipeline = [...aggregationPipeline, { $count: "total" }];
    const totalResult = await orderModel.aggregate(totalPipeline);
    const totalCount = totalResult[0]?.total || 0;

    aggregationPipeline.push({ $sort: { createdAt: -1 } });
    aggregationPipeline.push({ $skip: skip });
    aggregationPipeline.push({ $limit: limit });

    aggregationPipeline.push({
      $project: {
        _id: 1,
        weight: 1,
        bags: 1,
        pickupTime: 1,
        invoiceUrl: 1,
        deliveryTime: 1,
        paymentType: 1,
        status: 1,
        instructions: 1,
        amount: 1,
        deliveryDate: 1,
        services: 1,
        orderId: 1,
        isExpired:1,
        pickupDate: 1,
        transportation:1,
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

export const updateOrderStatus = async (
  token: any,
  orderId: string,
  body: any,
  res: any
) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);

    if (!orderId) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "Order ID is required",
        })
      );
    }


    const { status } = body;

    if (!status) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "Status field is required",
        })
      );
    }

    const validStatuses = [
      "Order placed",
      "On the way",
      "In process",
      "Laundry is cleaned",
      "Completed",
    ];

    if (!validStatuses.includes(status)) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: `Invalid status. Valid statuses are: ${validStatuses.join(
            ", "
          )}`,
        })
      );
    }

    const updatedOrder = await orderModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(orderId),
        isDeleted: false,
        // isExpired: false
      },
      {
        status,
        updatedAt: new Date(),
      },
      { new: true }
    )



    const matchStage: any = {
      _id: new mongoose.Types.ObjectId(updatedOrder._id),
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

    const order = await orderModel.aggregate(aggregationPipeline);

    let serviceName = ''
    // console.log(order,">>> order >>>>")
    const services = order[0]?.services;

    if (services.length > 0) {
      serviceName = services
        .map((item: any) => item.serviceDetails?.name) // get the name
        .filter(Boolean)                        // remove any undefined/null names
        .join(', ');                            // join with comma and space
    }

    // let data = {
    //   orderId: updatedOrder._id,
    //   partnerId: updatedOrder.partnerId,
    //   customerId: updatedOrder.customerId,
    //   amount: updatedOrder.amount,
    //   netAmount: updatedOrder.netAmount,
    //   transportation: updatedOrder.transportation,
    //   expressFee:  updatedOrder.expressFee,
    //   status: 'Paid',
    // }

    // if(status == "Completed" && updatedOrder.paymentType == "cash") transactionModel.create(data);


    // if (status === 'Completed') {    
    //   try {
    //     const invoiceUrl = await generateAndUploadInvoice(updatedOrder, serviceName);
    //     console.log('==invoiceUrl>>>>>>>>',invoiceUrl)
    //     updatedOrder.invoiceUrl = invoiceUrl;
    //     await updatedOrder.save();
    //   } catch (err) {


    //     console.error('❌ Failed to generate/upload invoice:', err);
    //   }
    // }


    const user = await userModel.findOne({ _id: mongoose.Types.ObjectId(updatedOrder.customerId) });
    // console.log(user,">>> user >>>>>")

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

    // ****************************************
    // if (user?.fcmToken && (typeof user?.fcmToken === 'string') && user?.fcmToken.trim()) {
    //   let messageRes = await FirebaseUtilities.firebaseSendNotification(
    //     user.fcmToken,
    //     payload
    //   );
    // }

    let messageObj = {
      title: "Order Status Updated.",
      body: `Order: ${updatedOrder?.orderId} status has been updated to ${status}.`,
    }
    const io = SocketUtilities.socketio.getIO();

    let notificationData = {
      message: messageObj,
      recevierId: updatedOrder.customerId,
      receiverType: "user",
      senderId: updatedOrder.partnerId,
      senderType: "partner",
    };
    io.emit('notification', notificationData);

    let updateOrderData = {
      orderId: updatedOrder?._id,
      senderType: "partner",
      orderStatus: updatedOrder?.status,
      notificationType: "updateOrderStatus",
    };
    
    io.emit('updateOrderStatus', updateOrderData);

    await notificationModel.create(notificationData);

    if (!updatedOrder) {
      throw new HTTP404Error(
        Utilities.sendResponsData({
          code: 404,
          message: "Order not found or not authorized to update",
        })
      );
    }

    return Utilities.sendResponsData({
      code: 200,
      message: "Order status updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    console.log(error, ">>> erro");
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const calculateAmount = async (
  token: any,
  body: any,
  next: NextFunction
) => {
  try {
    const { type, bags = 0, amount = 0 } = body;

    if (!type || (type !== "bag" && type !== "kg")) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: 'Invalid type. Must be either "bag" or "kg".',
        })
      );
    }

    const settings = await settingsModel.findOne({});
    if (!settings) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 404,
          message: "Settings not found.",
        })
      );
    }

    let calculatedTotal = 0;

    if (type === "bag") {
      calculatedTotal = settings.perBagAmount * bags;
    } else if (type === "kg") {
      calculatedTotal = settings.perKgAmount * amount;
      console.log(
        settings.perKgAmount,
        "settings.perKgAmount",
        amount,
        "amount"
      );
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
    console.log("first");
    next(error);
  }
};

// export const getOrderAnalytics = async (token: any, queryParams: any, res: any) => {
//   try {
//     const { range = 'all' } = queryParams;
//     const decoded: any = await Utilities.getDecoded(token);
//     const match: any = { isDeleted: false };
//     const transactionMatch: any = { isDeleted: false };

//     if (decoded.id) {
//       match.partnerId = new mongoose.Types.ObjectId(decoded.id);
//       transactionMatch.partnerId = new mongoose.Types.ObjectId(decoded.id);
//     }

//     const now: any = moment();
//     const dateRanges: Record<string, [Date, Date]> = {
//       week: [now.clone().startOf('week').toDate(), now.clone().endOf('week').toDate()],
//       month: [now.clone().startOf('month').toDate(), now.clone().endOf('month').toDate()],
//       '6-month': [now.clone().subtract(5, 'months').startOf('month').toDate(), now.clone().endOf('month').toDate()],
//       year: [now.clone().startOf('year').toDate(), now.clone().endOf('year').toDate()],
//       all: [new Date(0), now.toDate()],
//     };

//     const [startDate, endDate] = dateRanges[range] || dateRanges['all'];
//     match.createdAt = { $gte: startDate, $lte: endDate };
//     transactionMatch.createdAt = { $gte: startDate, $lte: endDate };

//     const pendingStatuses = [
//       "Order placed",
//       "On the way",
//       "In process",
//       "Laundry is cleaned"
//     ];

//     const [totalOrders, completedOrders, pendingOrders, latestOrders, totalRevenueData, chartAggregation] = await Promise.all([
//       orderModel.countDocuments(match),
//       orderModel.countDocuments({ ...match, status: "Completed" }),
//       orderModel.countDocuments({ ...match, status: { $in: pendingStatuses } }),
//       orderModel.countDocuments({
//         ...match,
//         createdAt: {
//           $gte: moment().subtract(30, 'days').toDate(),
//           $lte: now.toDate()
//         }
//       }),
//       transactionModel.aggregate([
//         { $match: transactionMatch },
//         { $group: { _id: null, total: { $sum: "$amount" } } }
//       ]),
//       generateChartData(range, match) // Aggregation for chart
//     ]);

//     const totalRevenue = totalRevenueData[0]?.total || 0;

//     return Utilities.sendResponsData({
//       code: 200,
//       message: "dashboard analytics fetched successfully",
//       data: {
//         latestOrders,
//         totalOrders,
//         completedOrders,
//         pendingOrders,
//         totalRevenue,
//         chartData: chartAggregation,
//         range
//       },
//     });

//   } catch (error) {
//     const err = error as Error;
//     console.log(err, ">>> error");
//     handleServerError(err, res);
//   }
// };

export const getOrderAnalytics = async (token: any, queryParams: any, res: any) => {
  try {
    const { range = 'all' } = queryParams;
    const decoded: any = await Utilities.getDecoded(token);
    const match: any = {
      isDeleted: false,
      // isExpired: false 
    };
    const transactionMatch: any = { isDeleted: false };

    if (decoded.id) {
      match.partnerId = new mongoose.Types.ObjectId(decoded.id);
      transactionMatch.partnerId = new mongoose.Types.ObjectId(decoded.id);
    }

    const now = moment();
    const dateRanges: any = {
      week: [now.clone().startOf('week').toDate(), now.clone().endOf('week').toDate()],
      month: [now.clone().startOf('month').toDate(), now.clone().endOf('month').toDate()],
      '6-month': [now.clone().subtract(5, 'months').startOf('month').toDate(), now.clone().endOf('month').toDate()],
      year: [now.clone().startOf('year').toDate(), now.clone().endOf('year').toDate()],
      all: [new Date(0), now.toDate()],
    };

    const [startDate, endDate] = dateRanges[range] || dateRanges['all'];
    match.createdAt = { $gte: startDate, $lte: endDate };
    transactionMatch.createdAt = { $gte: startDate, $lte: endDate };

    const pendingStatuses = [
      "Order placed",
      "On the way",
      "In process",
      "Laundry is cleaned"
    ];

    const [totalOrders, completedOrders, pendingOrders, latestOrders, totalRevenueData, chartAggregation] = await Promise.all([
      orderModel.countDocuments(match),
      orderModel.countDocuments({ ...match, status: "Completed" }),
      orderModel.countDocuments({ ...match, status: { $in: pendingStatuses } }),
      orderModel.countDocuments({
        ...match,
        createdAt: {
          $gte: moment().subtract(30, 'days').toDate(),
          $lte: now.toDate()
        }
      }),
      transactionModel.aggregate([
        { $match: transactionMatch },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $subtract: ["$amount", { $ifNull: ["$transportation", 0] }]
              }
            }
          }
        }
      ]),
      generateChartData(range, transactionMatch)
    ]);

    const totalRevenue = totalRevenueData[0]?.total || 0;

    return Utilities.sendResponsData({
      code: 200,
      message: "dashboard analytics fetched successfully",
      data: {
        latestOrders,
        totalOrders,
        completedOrders,
        pendingOrders,
        totalRevenue: Number(totalRevenue.toFixed(2)), // Round to 2 decimals
        chartData: chartAggregation,
        range
      },
    });

  } catch (error) {
    const err = error;
    console.log(err, ">>> error");
    handleServerError(err, res);
  }
};
export const getPartnerRevenue = async (token: any, res: any, query: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);

    if (!decoded?.id) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "Unauthorized",
        })
      );
    }

    console.log(decoded.id, ">>> decoded >>> ")

    const revenueResult = await transactionModel.aggregate([
      {
        $match: {
          partnerId: new mongoose.Types.ObjectId(decoded.id),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $subtract: ["$amount", { $ifNull: ["$transportation", 0] }],
            },
          },
        },
      },
    ]);

    let totalRevenue = revenueResult[0]?.totalRevenue || 0;

    if (query.type == "wallet") {
      totalRevenue = 0;
    }

    return Utilities.sendResponsData({
      code: 200,
      message: "Total revenue fetched successfully",
      data: {
        type: query.type == "cash" ? "cash" : "wallet",
        totalRevenue,
      },
    });
  } catch (error) {
    console.log(error, ">>> revenue error");
    const err = error as Error;
    handleServerError(err, res);
  }
};

// export const getCustomerOrderListOld = async (token: any, queryParams: any, customerId: any, res: any) => {
//   try {
//     const decoded: any = await Utilities.getDecoded(token);
//     const page = parseInt(queryParams.page as string) || 1;
//     const limit = parseInt(queryParams.limit as string) || 10;
//     const skip = (page - 1) * limit;
//     const search = queryParams.search;
//     const filterType = queryParams.filter;

//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     const matchStage: any = {
//       isDeleted: false,
//       isExpired: false,
//       partnerId: new mongoose.Types.ObjectId(decoded.id),
//       customerId: new mongoose.Types.ObjectId(customerId)
//     };

//     if (filterType === "active") {
//       matchStage.status = { $ne: "Completed" }; // exclude delivery
//     } else if (filterType === "history") {
//       matchStage.status = "Completed"; // only delivery
//     }

//     const aggregationPipeline: any[] = [
//       { $match: matchStage },
//       {
//         $lookup: {
//           from: "deliveryoptions",
//           localField: "deliveryOption",
//           foreignField: "_id",
//           as: "deliveryOptions",
//         },
//       },
//       {
//         $unwind: { path: "$deliveryOptions", preserveNullAndEmptyArrays: true },
//       },
//       {
//         $addFields: {
//           deliveryDate: {
//             $add: [
//               "$pickupDate",
//               {
//                 $multiply: [
//                   {
//                     $add: [
//                       { $ifNull: ["$deliveryOptions.duration", 0] },
//                       { $ifNull: ["$deliveryOptions.additionalTime", 0] }
//                     ]
//                   },
//                   24 * 60 * 60 * 1000 // Convert days to milliseconds
//                 ]
//               }
//             ]
//           }
//         }
//       },
//       {
//         $lookup: {
//           from: "partners",
//           localField: "partnerId",
//           foreignField: "_id",
//           as: "partner",
//         },
//       },
//       { $unwind: "$services" }, // Unwind services array
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
//       { $unwind: { path: "$partner", preserveNullAndEmptyArrays: true } },
//       {
//         $lookup: {
//           from: "users",
//           localField: "customerId",
//           foreignField: "_id",
//           as: "customer",
//         },
//       },
//       { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
//       {
//         $lookup: {
//           from: "customeraddresses",
//           localField: "customerAddressId",
//           foreignField: "_id",
//           as: "customerAddresses",
//         },
//       },
//       {
//         $unwind: {
//           path: "$customerAddresses",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//     ];

//     if (search) {
//       aggregationPipeline.push({
//         $match: {
//           $or: [
//             { "partner.name": { $regex: search, $options: "i" } },
//             { "customer.name": { $regex: search, $options: "i" } },
//             { status: { $regex: search, $options: "i" } },
//           ],
//         },
//       });
//     }

//     const totalPipeline = [...aggregationPipeline, { $count: "total" }];
//     const totalResult = await orderModel.aggregate(totalPipeline);
//     const totalCount = totalResult[0]?.total || 0;

//     aggregationPipeline.push({ $sort: { createdAt: -1 } });
//     aggregationPipeline.push({ $skip: skip });
//     aggregationPipeline.push({ $limit: limit });

//     aggregationPipeline.push({
//       $project: {
//         _id: 1,
//         weight: 1,
//         bags: 1,
//         pickupTime: 1,
//         invoiceUrl: 1,
//         deliveryTime: 1,
//         paymentType: 1,
//         status: 1,
//         instructions: 1,
//         amount: 1,
//         deliveryDate: 1,
//         services: 1,
//         orderId: 1,
//         pickupDate: 1,
//         deliveryOptions: {
//           serviceFee: 1,
//           _id: 1,
//           deliveryType: 1,
//           duration: 1,
//         },
//         customerAddresses: 1,
//         category: {
//           _id: 1,
//           photo: 1,
//           name: 1,
//         },
//         partner: {
//           email: "$partner.email",
//           laundryName: "$partner.laundryName",
//           name: "$partner.name",
//         },
//         customer: {
//           location: "$customer.location",
//           name: "$customer.name",
//           profilePicture: "$customer.profilePicture",
//           address: "$customer.address",
//           alternateAddress: "$customer.alternateAddress",
//           phone: "$customer.phone",
//           alternatePhone: "$customer.alternatePhone",
//           dob: "$customer.dob",
//           gender: "$customer.gender",
//           company: "$customer.company",
//           role: "$customer.role",
//           email: "$customer.email",
//         },
//       },
//     });

//     const orders = await orderModel.aggregate(aggregationPipeline);

//     return Utilities.sendResponsData({
//       code: 200,
//       message: "Order list fetched successfully",
//       data: orders,
//       totalRecord: totalCount,
//       pagination: {
//         totalPages: Math.ceil(totalCount / limit),
//         currentPage: page,
//         limit,
//         totalRecords: totalCount,
//       },
//     });
//   } catch (error) {
//     const err = error as Error;
//     handleServerError(err, res);
//   }
// };


export const getCustomerOrderList = async (token: any, queryParams: any, customerId: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);
    const page = parseInt(queryParams.page as string) || 1;
    const limit = parseInt(queryParams.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = queryParams.search;
    const filterType = queryParams.filter;

    const matchStage: any = {
      isDeleted: false,
      partnerId: new mongoose.Types.ObjectId(decoded.id),
      customerId: new mongoose.Types.ObjectId(customerId),
    };
    console.log('matchStage==>>', matchStage);

    if (filterType === "active") {
      matchStage.status = { $ne: "Completed" };
    } else if (filterType === "history") {
      matchStage.status = "Completed";
    }

    const basePipeline: any[] = [
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
                      { $ifNull: ["$deliveryOptions.additionalTime", 0] },
                    ],
                  },
                  24 * 60 * 60 * 1000,
                ],
              },
            ],
          },
        },
      },
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
          path: "$customerAddresses",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Lookup and enrich services with category data
      {
        $lookup: {
          from: "categories",
          let: { serviceList: "$services" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: [
                    "$_id",
                    {
                      $map: {
                        input: "$$serviceList",
                        as: "s",
                        in: "$$s.serviceId",
                      },
                    },
                  ],
                },
              },
            },
          ],
          as: "serviceDetails",
        },
      },
      {
        $addFields: {
          services: {
            $map: {
              input: "$services",
              as: "s",
              in: {
                $mergeObjects: [
                  "$$s",
                  {
                    serviceDetails: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$serviceDetails",
                            as: "d",
                            cond: {
                              $eq: ["$$d._id", "$$s.serviceId"],
                            },
                          },
                        },
                        0,
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },
    ];

    if (search) {
      basePipeline.push({
        $match: {
          $or: [
            { "partner.name": { $regex: search, $options: "i" } },
            { "customer.name": { $regex: search, $options: "i" } },
            { status: { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    const aggregationPipeline = [
      ...basePipeline,
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                weight: 1,
                bags: 1,
                pickupTime: 1,
                invoiceUrl: 1,
                deliveryTime: 1,
                paymentType: 1,
                status: 1,
                instructions: 1,
                amount: 1,
                deliveryDate: 1,
                services: 1,
                orderId: 1,
                pickupDate: 1,
                deliveryOptions: {
                  serviceFee: 1,
                  _id: 1,
                  deliveryType: 1,
                  duration: 1,
                },
                customerAddresses: 1,
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
          ],
        },
      },
      {
        $addFields: {
          total: {
            $ifNull: [{ $arrayElemAt: ["$metadata.total", 0] }, 0],
          },
        },
      },
    ];

    const result = await orderModel.aggregate(aggregationPipeline);
    const orders = result[0]?.data || [];
    const totalCount = result[0]?.total || 0;

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