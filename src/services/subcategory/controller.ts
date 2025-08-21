import { categoryModel } from '../../db/Category'
import { subCategoryModel } from '../../db/Subcategory'
import mongoose = require('mongoose')
import { HTTP400Error, HTTP404Error } from '../../utils/httpErrors'
import { Utilities } from '../../utils/utilities'
import config from 'config'
import { SUBCATEGORY_ERROR_MESSAGES, SUBCATEGORY_MESSAGES, SUCCESS } from '../../utils/messages'
import { handleServerError } from '../../utils/ErrorHandler'
import { AUTHORIZATION } from '../../constants'

export const addSubCategory = async (token: any, req: any, next: any, res: any) => {
    try {
        const decoded: any = await Utilities.getDecoded(token);
        let bodyData: any = req.body;
        let filesArr: any = req.files;
        const filePaths = filesArr?.map((file: any) => file.path);

        if (!mongoose.Types.ObjectId.isValid(bodyData.categoryId)) {
            throw new HTTP400Error(  
                Utilities.sendResponsData({
                    code: 400,
                    message: SUBCATEGORY_ERROR_MESSAGES.INVALID_CATEGORY_ID.message,
            }))
        }

        let categoryExists = await categoryModel.findOne({
            _id: mongoose.Types.ObjectId(bodyData.categoryId),
            isDeleted: false
        });

        if (!categoryExists) {
            throw new HTTP400Error( Utilities.sendResponsData({
                statusCode: 404,
                message: SUBCATEGORY_ERROR_MESSAGES.CATEGORY_NOT_FOUND.message,
            }))
        }

        let isExist = await subCategoryModel.findOne({
            name: bodyData.name,
            categoryId: bodyData.categoryId,
            isDeleted: false
        });

        if (isExist) {
            return Utilities.sendResponsData({
                statusCode: 400,
                message: SUBCATEGORY_ERROR_MESSAGES.SUBCATEGORY_EXISTS,
            });
        }

        let newSubCategory = new subCategoryModel({
            name: bodyData.name,
            categoryId: bodyData.categoryId,
            image: filePaths?.length > 0 ? filePaths[0] : '',
            createdBy: decoded.id,
            updatedBy: decoded.id
        });

        let result = await newSubCategory.save();

        return Utilities.sendResponsData({
            code: 200,
            message: SUBCATEGORY_MESSAGES.SUBCATEGORY_ADDED,
            data: result
        });
    } catch (error) {
        const err = error as Error;
        handleServerError(err, res);
    }
};

export const getSubCategoryList = async (token: any, req: any, res: any) => {
    try {
        const { categoryId, search, isActive } = req.query;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        let filter: any = { isDeleted: false };

        if (categoryId && mongoose.Types.ObjectId.isValid(categoryId as string)) {
            filter.categoryId = new mongoose.Types.ObjectId(categoryId as string);
        }

        if (search) {
            filter.name = { $regex: search, $options: "i" };
        }

        if (isActive !== undefined) {
            filter.isActive = isActive === "true";
        }

        const totalRecords = await subCategoryModel.countDocuments(filter);
        const subCategories = await subCategoryModel
            .find(filter)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        const totalPages = Math.ceil(totalRecords / limit);
        return Utilities.sendResponsData({
            code: 200,
            data: subCategories,
            totalRecord: totalRecords,
            message: SUCCESS,
            pagination: {
                totalPages,
                currentPage: page,
                limit,
                totalRecords: totalRecords
            },
        });
    } catch (error) {
        const err = error as Error;
        handleServerError(err, res);
    }
};

export const deleteSubCategory = async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const token = req.get(AUTHORIZATION);
        const decoded: any = await Utilities.getDecoded(token);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return Utilities.sendResponsData({
                statusCode: 404,
                message: SUBCATEGORY_ERROR_MESSAGES.INVALID_CATEGORY_ID,
            });
        }

        let subCategory = await subCategoryModel.findOne({
            _id: id,
            isDeleted: false,
            createdBy: decoded.id,
        });

        if (!subCategory) {
            return Utilities.sendResponsData({
                statusCode: 404,
                message: SUBCATEGORY_ERROR_MESSAGES.CATEGORY_NOT_FOUND,
            });
        }

        subCategory.isDeleted = true;
        await subCategory.save();

        return Utilities.sendResponsData({
            code: 200,
            message: SUBCATEGORY_MESSAGES.SUBCATEGORY_DELETED,
        });
    } catch (error) {
        const err = error as Error;
        handleServerError(err, res);
    }
};


export const updateSubCategory = async (token: any, req: any, next: any, res: any) => {
    try {
        const decoded: any = await Utilities.getDecoded(token);
        let { id } = req.params;
        let { name, categoryId } = req.body;
        let filesArr: any = req.files;
        const filePaths = filesArr?.map((file: any) => file.path);
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return Utilities.sendResponsData({
                statusCode: 400,
                message: SUBCATEGORY_ERROR_MESSAGES.INVALID_SUBCATEGORY_ID,
            });
        }

        let subCategory = await subCategoryModel.findOne({
            _id: mongoose.Types.ObjectId(id),
            isDeleted: false
        });

        if (!subCategory) {
            return Utilities.sendResponsData({
                statusCode: 404,
                message: SUBCATEGORY_MESSAGES.SUBCATEGORY_NOT_FOUND,
            });
        }

        if (categoryId && !mongoose.Types.ObjectId.isValid(categoryId)) {
            return Utilities.sendResponsData({
                statusCode: 400,
                message: SUBCATEGORY_ERROR_MESSAGES.INVALID_CATEGORY_ID,
            });
        }

        if (categoryId) {
            let categoryExists = await categoryModel.findOne({
                _id: mongoose.Types.ObjectId(categoryId),
                isDeleted: false
            });

            if (!categoryExists) {
                return Utilities.sendResponsData({
                    statusCode: 404,
                    message: SUBCATEGORY_ERROR_MESSAGES.CATEGORY_NOT_FOUND,
                });
            }

            subCategory.categoryId = categoryId;
        }

        let isExist = await subCategoryModel.findOne({
            name: name,
            categoryId: subCategory.categoryId,
            isDeleted: false,
            _id: { $ne: id }
        });

        if (isExist) {
            return Utilities.sendResponsData({
                statusCode: 400,
                message: SUBCATEGORY_ERROR_MESSAGES.SUBCATEGORY_EXISTS,
            });
        }

        subCategory.name = name || subCategory.name;
        if (filePaths?.length > 0) {
            subCategory.image = filePaths[0];
        }
        subCategory.updatedBy = decoded.id;

        let result = await subCategory.save();

        return Utilities.sendResponsData({
            code: 200,
            message: SUBCATEGORY_MESSAGES.SUBCATEGORY_UPDATED,
            data: result
        });

    } catch (error) {
        const err = error as Error;
        handleServerError(err, res);
    }
};

