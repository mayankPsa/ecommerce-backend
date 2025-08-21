import mongoose = require("mongoose");
import { orderModel } from "../../../db/Order";
import { handleServerError } from "../../../utils/ErrorHandler";
import { Utilities } from "../../../utils/utilities";
import { userModel } from "../../../db/User";
import { categoryModel } from "../../../db/Category";
import moment = require("moment");
import { transactionModel } from "../../../db/transaction";
import dayjs from 'dayjs';
export const getAnalytics = async (token: any, queryParams: any, res: any) => {
  try {
    const matchStage: any = { isDeleted: false, status: 'Completed' };

    const pendingStatuses = [
      "Order placed",
      "On the way",
      "In process",
      "Laundry is cleaned"
    ];
    
    const matchOrderBase = {
      isDeleted: false,
      // isExpired: false,
      ...(queryParams.partnerId && { partnerId: new mongoose.Types.ObjectId(queryParams.partnerId) }),
    };

    if (queryParams.partnerId) {
      matchStage.partnerId = new mongoose.Types.ObjectId(queryParams.partnerId);
    }

    // --- Total Customers ---
    const totalCustomers = await userModel.countDocuments({
      role: "User",
      isDeleted: false,
      isBlocked:false
    });

    // --- Total Categories ---
    const totalCategories = await categoryModel.countDocuments({ isDeleted: false});

    // --- All Time Revenue ---
    const totalRevenueData = await transactionModel.aggregate([
      { $match: { isDeleted: false, status: 'Paid' } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalRevenue = totalRevenueData[0]?.total || 0;

    const totalTransportationData = await orderModel.aggregate([
      {
        $lookup: {
          from: "transactions",
          localField: "_id",
          foreignField: "orderId",
          as: "matchedTransaction"
        }
      },
      {
        $match: {
          matchedTransaction: { $ne: [] },
          transportation: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$transportation" }
        }
      }
    ]);
    
    const totalTransportation = totalTransportationData[0]?.total || 0;

    const completedOrders = await orderModel.countDocuments({
      ...matchOrderBase,
      status: "Completed"
    });
    
    const pendingOrders = await orderModel.countDocuments({
      ...matchOrderBase,
      status: { $in: pendingStatuses }
    });

    // --- Current Month Revenue ---
    const currentMonthStart = moment().startOf('month').toDate();
    const currentMonthEnd = moment().endOf('month').toDate();
    const currentMonthRevenueData = await transactionModel.aggregate([
      {
        $match: {
          isDeleted: false, 
          status: 'Paid',
          createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
        },
      },
      {
        $group: { _id: null, total: { $sum: "$amount" } },
      },
    ]);
    const currentMonthRevenue = currentMonthRevenueData[0]?.total || 0;

    // --- Same Month Last Year Revenue ---
    const lastYearStart = moment().subtract(1, 'years').startOf('month').toDate();
    const lastYearEnd = moment().subtract(1, 'years').endOf('month').toDate();
    const lastYearRevenueData = await transactionModel.aggregate([
      {
        $match: {
          isDeleted: false, 
          status: 'Paid',
          createdAt: { $gte: lastYearStart, $lte: lastYearEnd },
        },
      },
      {
        $group: { _id: null, total: { $sum: "$amount" } },
      },
    ]);
    const lastYearRevenue = lastYearRevenueData[0]?.total || 0;

    // === Chart Filter Handling ===
    const range = queryParams.range || 'year'; // Default to 'year'
    let startDate: Date;
    let groupBy: 'day' | 'month' = 'month';

    switch (range) {
      case 'week':
        startDate = moment().subtract(6, 'days').startOf('day').toDate();
        groupBy = 'day';
        break;
      case 'month':
        startDate = moment().subtract(1, 'month').startOf('month').toDate();
        break;
      case '6-month':
        startDate = moment().subtract(6, 'months').startOf('month').toDate();
        break;
      case 'year':
        startDate = moment().subtract(1, 'year').startOf('month').toDate();
        break;
      case 'all':
      default:
        startDate = new Date('2000-01-01');
        break;
    }

    const trendMatchStage = {
      isDeleted: false,
      status: 'Paid',
      createdAt: { $gte: startDate }
    };

    // --- Revenue Chart Grouping ---
    const revenueGroupStage =
      groupBy === 'day'
        ? {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            total: { $sum: '$amount' },
          }
        : {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            total: { $sum: '$amount' },
          };

    const revenueSortStage =
      groupBy === 'day'
        ? { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        : { '_id.year': 1, '_id.month': 1 };

    const monthlyRevenueTrend = await transactionModel.aggregate([
      { $match: trendMatchStage },
      { $group: revenueGroupStage },
      { $sort: revenueSortStage }
    ]);

    const revenueChartData = monthlyRevenueTrend.map(r => {
      const date = groupBy === 'day'
        ? dayjs(`${r._id.year}-${r._id.month}-${r._id.day}`)
        : dayjs(`${r._id.year}-${r._id.month}-01`);
      return {
        label: date.format(groupBy === 'day' ? 'DD MMM YYYY' : 'MMM YYYY'),
        date: date.format("YYYY-MM-DD"),
        value: r.total,
      };
    });

    // --- Transportation Chart Grouping ---
    const transportationGroupStage =
      groupBy === 'day'
        ? {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            total: { $sum: '$transportation' },
          }
        : {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            total: { $sum: '$transportation' },
          };

    const transportationSortStage =
      groupBy === 'day'
        ? { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        : { '_id.year': 1, '_id.month': 1 };

    const transportationRevenueTrend = await transactionModel.aggregate([
      { $match: trendMatchStage },
      { $group: transportationGroupStage },
      { $sort: transportationSortStage }
    ]);

    const transportationChartData = transportationRevenueTrend.map(r => {
      const date = groupBy === 'day'
        ? dayjs(`${r._id.year}-${r._id.month}-${r._id.day}`)
        : dayjs(`${r._id.year}-${r._id.month}-01`);
      return {
        label: date.format(groupBy === 'day' ? 'DD MMM YYYY' : 'MMM YYYY'),
        date: date.format("YYYY-MM-DD"),
        value: r.total,
      };
    });

    return res.status(200).json({
      code: 200,
      message: "Dashboard analytics fetched successfully",
      data: {
        totalCustomers,
        totalCategories,
        totalRevenue,
        currentMonthRevenue,
        lastYearRevenue,
        revenueChartData,
        transportationChartData,
        completedOrders,
        pendingOrders,
        totalTransportation
      },
    });
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};
