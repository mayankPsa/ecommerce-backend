import mongoose = require("mongoose");
import { Utilities } from "../../utils/utilities";
import { handleServerError } from "../../utils/ErrorHandler";
import { peakupTimingModel } from "../../db/Timing";
import { HTTP400Error } from "../../utils/httpErrors";
import { policyModel } from "../../db/Policy";

export const upsertPolicy = async (token: any, body: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);
    const { about, privacy, terms } = body;

    let policy = await policyModel.findOne();
    if (!policy) {
      policy = await policyModel.create({
        about,
        privacy,
        terms,
        createdBy: decoded.id,
      });
    } else {
      policy.set({
        about,
        privacy,
        terms,
        updatedBy: decoded.id,
      });
      await policy.save();
    }

    return Utilities.sendResponsData({
      code: 200,
      message: "Policy content saved successfully",
      data: policy,
    });
  } catch (error: any) {
    handleServerError(error, res);
  }
};

export const getPolicy = async (res: any) => {
  try {
    const policy = await policyModel.findOne().sort({ updatedAt: -1 });

    return Utilities.sendResponsData({
      code: 200,
      message: "Policy fetched successfully",
      data: policy,
    });
  } catch (error: any) {
    handleServerError(error, res);
  }
};
