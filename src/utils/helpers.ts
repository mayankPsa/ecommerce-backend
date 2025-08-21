import mongoose = require("mongoose");
import { orderModel } from "../db/Order";

export const checkEnvVar = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is not defined in environment variables`);
  }
  return value;
};

export const getOrderInvoiceDetail = async (orderId: any) => {
  const objectId = new mongoose.Types.ObjectId(orderId);
  const order = await orderModel.aggregate([
    { $match: { _id: objectId, isDeleted: false } },

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