import moment = require('moment');

import { settingsModel } from '../../../db/Settings';
import { Utilities } from '../../../utils/utilities';
import { handleServerError } from '../../../utils/ErrorHandler';
import { HTTP400Error } from '../../../utils/httpErrors';

// export const addSettings = async (req: any, res: any) => {
//   try {
//     const { perBagAmount = 0, perKgAmount = 0, transportationFee = 0, partnerId, serviceId, defaultTransportationFee=0 } = req.body;

//     const updatedSettings = await settingsModel.findOneAndUpdate(
//       {},
//       {
//         perBagAmount,
//         perKgAmount,
//         transportationFee,
//         partnerId: partnerId,
//         serviceId: serviceId,
//         defaultTransportationFee
//       },
//       {
//         new: true, 
//         upsert: true, 
//         setDefaultsOnInsert: true,       
//       }
//     );

//     return res.status(200).send({
//       message: "Settings saved successfully",
//       settings: updatedSettings,
//     });
//   } catch (error) {
//     console.error("Error saving settings:", error);
//     return res.status(500).send({ message: "Internal server error" });
//   }
// };\

export const addSettings = async (req: any, res: any) => {
  try {
    const {
      perBagAmount = 0,
      perKgAmount = 0,
      transportationFee = 0,
      partnerId,
      serviceId,
      defaultTransportationFee = 0,
      type = 'regular',
      isPerKgActive,
      isPerBagActive
    } = req.body;

    let settings;

    if (type === 'default') {
      settings = await settingsModel.findOneAndUpdate(
        { type: 'default', partnerId, serviceId },
        {
          $set: {
            perBagAmount,
            perKgAmount,
            transportationFee,
            defaultTransportationFee,
            isPerKgActive,
            isPerBagActive
          }
        },
        { new: true, upsert: true }
      );
    } else {
      const existingSettings = await settingsModel.findOne({ partnerId, serviceId, type });

      if (existingSettings) {
        return res.status(400).json({
          message: 'Settings for this category already exist. You can only add once.',
        });
      }

      settings = await settingsModel.create({
        perBagAmount,
        perKgAmount,
        transportationFee,
        partnerId,
        serviceId,
        defaultTransportationFee,
        type,
        isPerKgActive,
        isPerBagActive
      });
    }

    console.log('settings>>>>>>>>>>>>', JSON.stringify(settings));

    return Utilities.sendResponsData({
      code: 200,
      message: type === 'default' ? 'Default settings updated successfully' : 'Settings added successfully',
      data: settings,
    });
  } catch (error) {
    handleServerError(error, res);
  }
};


export const addSettingsOld = async (req: any, res: any) => {
  try {
    const {
      perBagAmount = 0,
      perKgAmount = 0,
      transportationFee = 0,
      partnerId,
      serviceId,
      defaultTransportationFee = 0,
      type = 'regular',
    } = req.body;

    let settings;

    if (type === 'default') {
      settings = await settingsModel.findOneAndUpdate(
        { type: 'default', partnerId, serviceId },
        {
          $set: {
            perBagAmount,
            perKgAmount,
            transportationFee,
            defaultTransportationFee,
          }
        },
        { new: true, upsert: true } // `upsert: true` will create if not exists
      );
    } else {
      // Create new settings for type !== 'default'
      settings = await settingsModel.create({
        perBagAmount,
        perKgAmount,
        transportationFee,
        partnerId,
        serviceId,
        defaultTransportationFee,
        type,
      });
    }

    return Utilities.sendResponsData({
      code: 200,
      message: type === 'default' ? 'Default settings updated successfully' : 'Settings added successfully',
      data: settings,
    });

    // return res.status(200).send({
    //   message: type === 'default' ? 'Default settings updated successfully' : 'Settings added successfully',
    //   settings,
    // });
  } catch (error) {
    handleServerError(error, res);
  }
};

export const getSettingsById = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    console.log(id, ">>> id >>>>")

    const setting = await settingsModel.findById(id);

    if (!setting) {
      return res.status(404).send({ message: "Settings not found" });
    }

    return Utilities.sendResponsData({
      code: 200,
      message: "Settings fetched successfully",
      data: setting,
    });

  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const updateSettings = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const {
      perBagAmount,
      perKgAmount,
      transportationFee,
      partnerId,
      serviceId,
      defaultTransportationFee,
      isPerKgActive,
      isPerBagActive
    } = req.body;

    const updatedSettings = await settingsModel.findByIdAndUpdate(
      id,
      {
        perBagAmount,
        perKgAmount,
        transportationFee,
        partnerId,
        serviceId,
        defaultTransportationFee,
        isPerKgActive,
        isPerBagActive
      },
      { new: true }
    );

    if (!updatedSettings) {
      return Utilities.sendResponsData({
        code: 404,
        message: "Settings not found",
      });
    }

    return Utilities.sendResponsData({
      code: 200,
      message: "Settings updated successfully",
      data: updatedSettings,
    });
  } catch (error) {
    const err = error as Error;
    console.log(err, ">> error >>>")
    handleServerError(err, res);
  }
};

export const getSettings = async (queryParams: any, res: any) => {
  try {
    const page = parseInt(queryParams.page as string) || 1;
    const limit = parseInt(queryParams.limit as string) || 10;
    const skip = (page - 1) * limit;

    const matchStage: any = { isDeleted: false };

    const aggregationPipeline: any[] = [
      { $match: matchStage },
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
          from: "categories",
          localField: "serviceId",
          foreignField: "_id",
          as: "service",
        },
      },
      { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
    ];

    aggregationPipeline.push({
      $addFields: {
        isDefault: {
          $cond: [{ $eq: ["$type", "default"] }, 0, 1]
        }
      }
    });

    aggregationPipeline.push({
      $sort: { isDefault: -1, createdAt: -1 }
    });

    // Total count
    const totalPipeline = [...aggregationPipeline, { $count: "total" }];
    const totalResult = await settingsModel.aggregate(totalPipeline);
    const totalCount = totalResult[0]?.total || 0;

    // Pagination
    aggregationPipeline.push({ $sort: { createdAt: -1 } });
    aggregationPipeline.push({ $skip: skip });
    aggregationPipeline.push({ $limit: limit });

    // Final projection
    aggregationPipeline.push({
      $project: {
        _id: 1,
        perBagAmount: 1,
        perKgAmount: 1,
        type: 1,
        transportationFee: 1,
        defaultTransportationFee: 1,
        createdAt: 1,
        updatedAt: 1,
        isPerKgActive: 1,
        isPerBagActive: 1,
        partner: {
          _id: 1,
          name: 1,
          email: 1,
        },
        service: {
          _id: 1,
          name: 1,
        },
      },
    });

    const settingsRes = await settingsModel.aggregate(aggregationPipeline);

    if (settingsRes && settingsRes.length > 0) {
      return Utilities.sendResponsData({
        code: 200,
        message: "SUCCESS",
        data: settingsRes,
        totalRecord: totalCount,
        pagination: {
          totalPages: Math.ceil(totalCount / limit),
          currentPage: page,
          limit,
          totalRecords: totalCount,
        },
      });
    } else {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "No records found",
        })
      );
    }
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const deleteSettingsByIdOld = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const deletedSetting = await settingsModel.findByIdAndDelete(id);

    if (!deletedSetting) {
      return Utilities.sendResponsData({
        code: 404,
        message: "Settings not found",
      });
    }

    return Utilities.sendResponsData({
      code: 200,
      message: "Settings deleted successfully"
    });

  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};


export const deleteSettingsById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const deletedSetting = await settingsModel.findById(id);

    if (!deletedSetting) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "'Settings not found'",
        })
      );
    }

    deletedSetting.isDeleted = true;
    await deletedSetting.save();

    return Utilities.sendResponsData({
      code: 200,
      message: 'Setting deleted successfully'
    });
  } catch (error: any) {
    const err = error as Error;
    handleServerError(err, res);
  }
};
