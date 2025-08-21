import { Utilities } from '../../utils/utilities'
import { partnerModel } from '../../db/Partners';
import { handleServerError } from '../../utils/ErrorHandler';
import { deliveryOptionsModel } from '../../db/DeliveryOptions';
import { customerAddressModel } from '../../db/CustomerAddress';
import { SUCCESS } from '../../utils/messages';
import { HTTP400Error } from '../../utils/httpErrors';
import mongoose from 'mongoose';

export const addAddress = async (token: any, req: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);
    const bodyData: any = req.body;

    const {
      addressType,
      street,
      city,
      state,
      country,
      zipCode
    } = bodyData;
  
    console.log(req.body,">>> req.body >>>")
    const customerId = decoded.id;

    const addressExists = await customerAddressModel.findOne({
      addressType,
      street,
      city,
      state,
      country,
      zipCode,
      isDeleted: false,
      customerId: new mongoose.Types.ObjectId(customerId)
    });

    // if (addressExists) {
    //   throw new HTTP400Error(
    //     Utilities.sendResponsData({
    //       code: 400,
    //       message: `Address of type '${addressType}' already exists.`,
    //       data: null,
    //   }))
    // }

    bodyData.customerId = customerId;

    // Create new address
    const newAddress = await customerAddressModel.create(bodyData);
    return Utilities.sendResponsData({
      code: 200,
      message: SUCCESS.message,
      data: newAddress,
    });
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const updateAddress = async (token: any, req: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);
    const bodyData: any = req.body;
    const { addressId } = req.params;

    const customerId = decoded.id;

    const address = await customerAddressModel.findOne({
      _id: addressId,
      customerId,
      isDeleted: false,
    });

    if (!address) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "Address not found or already deleted.",
          data: null,
        })
      );
    }

    // Optional: Check if updated data would cause a duplicate
    const {
      addressType,
      street,
      city,
      state,
      country,
      zipCode,
    } = bodyData;

    const duplicateCheck = await customerAddressModel.findOne({
      _id: { $ne: addressId }, // Exclude current address
      customerId,
      addressType,
      street,
      city,
      state,
      country,
      zipCode,
      isDeleted: false,
    });

    if (duplicateCheck) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "Another address with same details already exists.",
          data: null,
        })
      );
    }

    const updated = await customerAddressModel.findByIdAndUpdate(
      addressId,
      { $set: bodyData },
      { new: true }
    );

    return Utilities.sendResponsData({
      code: 200,
      message: "Address updated successfully.",
      data: updated,
    });
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

export const deleteAddress = async (token: any, req: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);
    const { addressId } = req.params;

    const customerId = decoded.id;

    const address = await customerAddressModel.findOne({
      _id: addressId,
      customerId,
      isDeleted: false,
    });

    if (!address) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "Address not found or already deleted.",
          data: null,
        })
      );
    }

    await customerAddressModel.findByIdAndUpdate(addressId, {
      $set: { isDeleted: true },
    });

    return Utilities.sendResponsData({
      code: 200,
      message: "Address deleted successfully.",
      data: null,
    });
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};


export const getAllAddress = async (token: any, queryParams: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);
    let query: any = {
      isDeleted: false,
      customerId: new mongoose.Types.ObjectId(decoded.id)
    };

    let optionsRes = await customerAddressModel
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

export const matchAddress = async (token: any, req: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);
    const { location, street, city, state, country, zipCode, addressType } = req.body;

    if (
      !location ||
      !location.coordinates ||
      !Array.isArray(location.coordinates) ||
      location.coordinates.length !== 2
    ) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "Invalid location coordinates",
          data: null,
        })
      );
    }

    const [ lat, lng ] = location.coordinates;
    const customerId = decoded.id;

    const matchedAddress = await customerAddressModel.findOne({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lat, lng],
          },
          $maxDistance: 100, // meters
        },
      },
      customerId: new mongoose.Types.ObjectId(customerId),
      isDeleted: false,
    });

    if (matchedAddress) {
      return Utilities.sendResponsData({
        code: 200,
        message: "Address matched",
        data: matchedAddress,
      });
    } else {
      return Utilities.sendResponsData({
        code: 200,
        message: "No matching address found. Returning input data.",
        data: req.body,
      });
    }
  } catch (error) {
    console.log(error,">>> error")
    const err = error as Error;
    handleServerError(err, res);
  }
};
