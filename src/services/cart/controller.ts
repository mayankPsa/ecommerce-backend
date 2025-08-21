import mongoose = require("mongoose");
import { Utilities } from "../../utils/utilities";
import { handleServerError } from "../../utils/ErrorHandler";
import { HTTP400Error } from "../../utils/httpErrors";
import { transactionModel } from "../../db/transaction";
import { cartModel } from "../../db/cart";
import { settingsModel } from "../../db/Settings";

export const addToCart: any = async (token: any, body: any, res: any) => {
  try {
    const { categories } = body;

    // Decode token if exists
    let customerId: any = null;
    let isGuest = false;

    if (token) {
      const decoded: any = await Utilities.getDecoded(token);
      customerId = decoded?.id;
    }

    // If no token, create guestId
    if (!customerId) {
      customerId = new mongoose.Types.ObjectId(); // random guest id
      isGuest = true;
    }

    if (!categories || categories.length === 0) {
      throw new HTTP400Error(
        Utilities.sendResponsData({ code: 400, message: "Please provide categories" })
      );
    }

    const array: any = [];

    const cartItems = await Promise.all(
      categories.map(async (item: any) => {
        if (!mongoose.Types.ObjectId.isValid(item)) {
          throw new HTTP400Error(
            Utilities.sendResponsData({ code: 400, message: "Invalid categoryId" })
          );
        }

        // check if already exists
        const existingItem = await cartModel.findOne({
          customerId,
          categoryId: mongoose.Types.ObjectId(item),
          isDeleted: false,
        });

        if (!existingItem) {
          const cartItem = new cartModel({
            customerId,
            categoryId: item,
            type: "",
            amount: 0,
            isGuest,
          });

          await cartItem.save();
          return cartItem;
        }
        return null;
      })
    );

    array.push(...cartItems.filter((item: any) => item !== null));

    return Utilities.sendResponsData({
      code: 200,
      message: "Item added to cart",
      data: array,
    });
  } catch (error) {
    handleServerError(error, res);
  }
};

export const addToCartOld:any = async (token: any, body: any, res: any) => {
  try {
    console.log('body==add cart',body);
    
    const { categories } = body;
    const decoded: any = await Utilities.getDecoded(token);
    const customerId = decoded.id;

    console.log(categories)
    const array:any = [];

    if (categories && categories.length > 0) {
      const cartItems = await Promise.all(
        categories.map(async (item: any) => {
          if (!mongoose.Types.ObjectId.isValid(item)) {
            throw new HTTP400Error(
              Utilities.sendResponsData({ code: 400, message: "Invalid categoryId" })
            );
          }
    
          const existingItem = await cartModel.findOne({
            customerId,
            categoryId: mongoose.Types.ObjectId(item),
            isDeleted: false
          });

          console.log(existingItem,">>> existingItem")

          if(!existingItem){
            const cartItem = new cartModel({
              customerId,
              categoryId: item,
              type: "",
              amount: 0,
          });
    
          await cartItem.save();
          return cartItem;
        }
        return null
        })
      );
    
      array.push(...cartItems.filter((item: any) => item !== null));
    }
    else {
      throw new HTTP400Error(
        Utilities.sendResponsData({ code: 400, message: "Please provide categories" })
      );
    }
  
    return Utilities.sendResponsData({
      code: 200,
      message: "Item added to cart",
      data: array,
    });
  } catch (error) {
    handleServerError(error, res);
  }
};

export const updateCart: any = async (cartId: string, body: any, res: any) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(cartId)) {
      throw new HTTP400Error(
        Utilities.sendResponsData({ code: 400, message: "Invalid cart ID" })
      );
    }

    const { type, amount, categoryId } = body;

    const validTypes = ["kg", "bag"];
    if (!validTypes.includes(type)) {
      throw new HTTP400Error(
        Utilities.sendResponsData({ code: 400, message: "Invalid type. Must be 'kg' or 'bag'" })
      );
    }

    const updateData: any = {};
    if (type !== undefined) updateData.type = type;
    if (amount !== undefined) updateData.amount = amount;
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      updateData.categoryId = categoryId;
    }

    const updatedCart = await cartModel.findByIdAndUpdate(
      cartId,
      { $set: updateData },
      { new: true }
    );

    if (!updatedCart) {
      throw new HTTP400Error(
        Utilities.sendResponsData({ code: 400, message: "Cart item not found" })
      );
    }

    return Utilities.sendResponsData({
      code: 200,
      message: "Cart item updated successfully",
      data: updatedCart,
    });
  } catch (error) {
    handleServerError(error, res);
  }
};

export const deleteCart = async (token: any, cartItemId: string, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);
    const customerId = decoded.id;
    if (!mongoose.Types.ObjectId.isValid(cartItemId)) {
      throw new HTTP400Error(
        Utilities.sendResponsData({ code: 400, message: "Invalid cart item ID" })
      );
    }

    const result = await cartModel.findByIdAndUpdate(
      cartItemId,
      { isDeleted: true },
      { new: true }
    );

    if (!result) {
      return Utilities.sendResponsData({
        code: 404,
        message: "Cart item not found",
      });
    }

    return Utilities.sendResponsData({
      code: 200,
      message: "Cart item deleted successfully",
    });
  } catch (error) {
    handleServerError(error, res);
  }
};

export const getCart = async (token: any, query: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token);
    const customerId = decoded.id;
    const partnerId = query.partnerId;
    const modifiedCartItems = [];

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      throw new HTTP400Error(
        Utilities.sendResponsData({ code: 400, message: "Invalid customerId" })
      );
    }

    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      throw new HTTP400Error(
        Utilities.sendResponsData({ code: 400, message: "Invalid partnerId" })
      );
    }

    const cartItems = await cartModel
      .find({ customerId, isDeleted: false })
      .populate("categoryId");

    const defaultSettings = await settingsModel.findOne({type: 'default'});
    if (!defaultSettings) {
      return Utilities.sendResponsData({
        code: 404,
        message: "Default Settings not found.",
      });
    }

    let cartTotal = 0;

    let totalTransportationFee = 0;

    for (const item of cartItems) {
      if (item.categoryId?._id) {
        const settings = await settingsModel.findOne({
          serviceId: item.categoryId._id,
          partnerId: partnerId,
          isDeleted:false
        });
    
        let perBagAmount = 1;
        let perKgAmount = 1;
        let transportationFee = 0;
    
        let isPerBagActive = settings?.isPerBagActive ?? defaultSettings.isPerBagActive;
        let isPerKgActive = settings?.isPerKgActive ?? defaultSettings.isPerKgActive;
    
        if (settings) {
          perBagAmount = settings.perBagAmount;
          perKgAmount = settings.perKgAmount;
          transportationFee = settings.transportationFee;
        } else {
          perBagAmount = defaultSettings.perBagAmount;
          perKgAmount = defaultSettings.perKgAmount;
          transportationFee = defaultSettings.transportationFee;
        }
    
        if (item.type === "bag") {
          cartTotal += item.amount * perBagAmount;
          totalTransportationFee += transportationFee;
        } else if (item.type === "kg") {
          cartTotal += item.amount * perKgAmount;
          totalTransportationFee += transportationFee;
        }
    
        // 🔥 Convert to plain JS object and add custom fields
        const plainItem = item.toObject();
        plainItem.isPerBagActive = isPerBagActive;
        plainItem.isPerKgActive = isPerKgActive;
    
        modifiedCartItems.push(plainItem);
      }
    }

    return Utilities.sendResponsData({
      code: 200,
      message: "Cart fetched successfully",
      data: {
        cartItems:modifiedCartItems,
        cartTotal,
        transportationFee: totalTransportationFee,
      },
    });
  } catch (error) {
    handleServerError(error, res);
  }
};