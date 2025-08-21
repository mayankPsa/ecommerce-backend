import mongoose = require("mongoose");
import { Utilities } from "../../utils/utilities";
import { handleServerError } from "../../utils/ErrorHandler";
import { peakupTimingModel } from "../../db/Timing";
import { HTTP400Error } from "../../utils/httpErrors";

export const createTiming = async (token: any, body: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);
    const { from, to } = body;

    const result = await peakupTimingModel.create({
      from,
      to,
      createdBy: decoded.id
    });

    return Utilities.sendResponsData({
      code: 200,
      message: 'Timing added successfully',
      data: result
    });
  } catch (error: any) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const getTimings = async (token: any, query: any, res: any) => {
  try {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const matchStage = { isDeleted: false, isActive:true };

    const total = await peakupTimingModel.countDocuments(matchStage);
    const data = await peakupTimingModel.find(matchStage)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    return Utilities.sendResponsData({
      code: 200,
      message: 'Timings fetched successfully',
      data,
      pagination: {
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
        totalRecords: total
      }
    });
  } catch (error: any) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const getAllTimings = async (token: any, query: any, res: any) => {
  try {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const matchStage = { isDeleted: false };
console.log('matchStage==>',matchStage);

    const total = await peakupTimingModel.countDocuments(matchStage);
    const data = await peakupTimingModel.find(matchStage)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    return Utilities.sendResponsData({
      code: 200,
      message: 'Timings fetched successfully',
      data,
      pagination: {
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
        totalRecords: total
      }
    });
  } catch (error: any) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const getTimingById = async (token: any, id: any, res: any) => {
  try {
    const timing = await peakupTimingModel.findOne({ _id: id, isDeleted: false }).lean();
    if (!timing) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "'Timing not found'",
        })
      );
    }

    return Utilities.sendResponsData({
      code: 200,
      message: 'Timing details fetched successfully',
      data: timing
    });
  } catch (error: any) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const updateTiming = async (token: any, id: any, body: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);

    const timing = await peakupTimingModel.findById(id);
    if (!timing || timing.isDeleted) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "'Timing not found'",
        })
      );
    }

    timing.from = body.from;
    timing.to = body.to;
    timing.updatedBy = decoded.id;

    const result = await timing.save();

    return Utilities.sendResponsData({
      code: 200,
      message: 'Timing updated successfully',
      data: result
    });
  } catch (error: any) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const deleteTiming = async (token: any, id: any, res: any) => {
  try {
    const timing = await peakupTimingModel.findById(id);
    if (!timing || timing.isDeleted) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "'Timing not found'",
        })
      );
    }

    timing.isDeleted = true;
    await timing.save();

    return Utilities.sendResponsData({
      code: 200,
      message: 'Timing deleted successfully'
    });
  } catch (error: any) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const updateTimingStatus = async (token: any, id: any, bodyData: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);
    console.log('bodyData==>', bodyData);
    const { status } = bodyData;
    const timing = await peakupTimingModel.findById(id);
    if (!timing || timing.isDeleted) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "Timing not found",
        })
      );
    }
    console.log('timing===>', timing)
    timing.isActive = status;
    timing.updatedBy = decoded.id;

    const result = await timing.save();

    return Utilities.sendResponsData({
      code: 200,
      message: `Timing ${status ? 'activated' : 'deactivated'} successfully`,
      data: result,
    });
  } catch (error: any) {
    handleServerError(error, res);
  }
};
