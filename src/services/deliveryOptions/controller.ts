import { Utilities } from '../../utils/utilities'
import { partnerModel } from '../../db/Partners';
import { handleServerError } from '../../utils/ErrorHandler';
import { deliveryOptionsModel } from '../../db/DeliveryOptions';
import { HTTP400Error } from '../../utils/httpErrors';

export const getDeliveryOptionsList = async (token: any, queryParams: any, res: any) => {
  try {
    let query: any = {
      isDeleted: false,
    };

    let optionsRes = await deliveryOptionsModel
      .find(query)

    return Utilities.sendResponsData({
      code: 200,
      data: optionsRes,
      message: 'SUCCESS'
    });
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const createDeliveryOption = async (token: any, req: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);
    let bodyData: any = req.body;
    bodyData.createdBy = decoded.id;
    bodyData.updatedBy = decoded.id;
    const deliveryType = bodyData.deliveryType?.toLowerCase()?.trim();
    const existing = await deliveryOptionsModel.findOne({
      deliveryType,
      isDeleted: false,
    });

    if (existing) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "Delivery type already exists!",
        }))
    }

    let result = await deliveryOptionsModel.create(bodyData);
    return Utilities.sendResponsData({
      code: 200,
      message: "Success",
      data: result,
    });
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const updateDeliveryOption = async (token: any, req: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);
    const { id } = req.params;

    const updateData = {
      ...req.body,
      updatedBy: decoded.id,
    };

    const result = await deliveryOptionsModel.findByIdAndUpdate(id, updateData, { new: true });

    if (!result) {
      return res.status(404).json(Utilities.sendResponsData({
        code: 404,
        message: "Delivery option not found",
        data: {},
      }));
    }
    return Utilities.sendResponsData({
      code: 200,
      message: "Delivery option updated successfully",
      data: result,
    });
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const deleteDeliveryOption = async (token: any, req: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);
    const { id } = req.params;

    const result = await deliveryOptionsModel.findByIdAndUpdate(
      id,
      { isDeleted: true, updatedBy: decoded.id },
      { new: true }
    );

    if (!result) {
      return res.status(404).json(Utilities.sendResponsData({
        code: 404,
        message: "Delivery option not found",
        data: {},
      }));
    }

    return Utilities.sendResponsData({
      code: 200,
      message: "Delivery option deleted successfully",
      data: result,
    });
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};
