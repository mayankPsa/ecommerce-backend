import { categoryModel } from '../../db/Category'
import mongoose = require('mongoose')
import { Utilities } from '../../utils/utilities'
import { CATEGORY_ERROR_MESSAGES, CATEGORY_EXISTS, CATEGORY_SUCCESS_MESSAGES, FETCH_LISTING_SUCCESS, SUCCESS } from '../../utils/messages'
import { handleServerError } from '../../utils/ErrorHandler'
import { subCategoryModel } from '../../db/Subcategory'
import { HTTP400Error } from '../../utils/httpErrors'
import { FileUpload } from '../../utils/FileUploadUtilities'
import { MailerUtilities } from '../../utils/MailerUtilities'
import ejs from "ejs";
import ServiceIconModel from '../../db/ServiceIcon'
import { userModel } from '../../db/User'
import { ADMIN, SERVICE_REQUEST_SUBJECT } from '../../constants'
import * as path from "path";
import * as fs from "fs";
import { SocketUtilities } from '../../utils/Socket'
import { notificationModel } from '../../db/Notification'
import { settingsModel } from '../../db/Settings'

export const addCategory = async (token: any, req: any, res: any) => {
    try {
        const decoded: any = await Utilities.getDecoded(token)
        let bodyData: any = req.body;
        bodyData.partnerId = decoded.id;
        bodyData.name = bodyData.serviceName;
        bodyData.subTitle = (bodyData.subTitle) ? (bodyData.subTitle) : "";
        let filesArr: any = req.files;

        let userRes = await userModel.findOne({
            role: ADMIN
        });

        let isExist: any = await categoryModel.findOne({
            name: bodyData.name, isDeleted: false,
            createdBy: decoded.id
        })

        console.log(isExist,'dsadas')
        bodyData.isActiveByPartner = (bodyData.status != "Active") ? false : true;
 
        if (!isExist) {
            bodyData.createdBy = decoded.id
            bodyData.updatedBy = decoded.id
            bodyData.status = "InActive";
            bodyData.isActiveByAdmin = false
            let result = await categoryModel.create(bodyData)

            const createdDateFormatted = new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
            });

          let messageObj = {
                title: "Service Request",
                body: `${decoded.name} has submitted a request for a new service: ${bodyData?.name}`,
              }

            let notificationData = {
                message: messageObj,
                recevierId: userRes._id,
                receiverType: "user",
                senderId: decoded.id,
                senderType: "partner",
                note: bodyData.note
            };
            const io = SocketUtilities.socketio.getIO();
            io.emit('notification', notificationData);

            await notificationModel.create(notificationData);

            // let messageHtml = await ejs.renderFile(
            //     process.cwd() + "/src/views/serviceRequestToAdmin.ejs",
            //     {
            //         serviceName: bodyData.name,
            //         partnerName: decoded.name,
            //         createdDate: createdDateFormatted
            //     },
            //     { async: true }
            // );
            // let mailResponse = await MailerUtilities.sendSendgridMail({
            //     recipient_email: [userRes.email],
            //     subject: SERVICE_REQUEST_SUBJECT,
            //     text: messageHtml,
            // });

            let obj = {
                serviceName: bodyData?.name
                    ? bodyData.name?.charAt(0).toUpperCase() + bodyData.name.slice(1)
                    : "",
                partnerName: decoded.name
                    ? decoded.name?.charAt(0).toUpperCase() + decoded.name?.slice(1)
                    : "",
                createdDate: createdDateFormatted,
                recipient_Name: userRes?.name
                    ? userRes.name?.charAt(0).toUpperCase() + userRes.name?.slice(1)
                    : ""
            };

            const templatePath = path.join(process.cwd(), 'src/views/serviceRequestToAdmin.ejs');
            let html;
            try {
                const template = fs.readFileSync(templatePath, "utf-8");
                html = await ejs.render(template, obj);
            } catch (fileError) {
                console.error("Error reading EJS template:", fileError);
                throw new Error("Failed to load email template");
            }
            const mailData = {
                recipient_email: [userRes.email],
                subject: SERVICE_REQUEST_SUBJECT,
                text: "message",
                html,
            };
            await MailerUtilities.sendSendgridMail(mailData);

            return Utilities.sendResponsData({
                code: 200,
                message: SUCCESS.message,
                data: result
            });
        } else {
            throw new HTTP400Error(
                Utilities.sendResponsData({
                    code: 400,
                    message: CATEGORY_EXISTS.message,
                }))
        }
    } catch (error) {
        console.log(error, "error")
        const err = error as Error;
        handleServerError(err, res)
    }
}

export const getCategoryList = async (token: any, queryData: any, partnerId: any, res: any, user: any) => {
    try {
        const decoded: any = await Utilities.getDecoded(token)
        let partnerUser = decoded.id;
        let searchValue: any = queryData.search;
        let query: any = {
            isDeleted: false,
            // partnerId: new mongoose.Types.ObjectId(partnerId)
        }

        if (partnerId) {
            query.partnerId = new mongoose.Types.ObjectId(partnerId);
        }

        if (user === 'customer') {
            query.status = 'Active';
        }


        if ((user == "partner") && (partnerUser)) {
            query.partnerId = new mongoose.Types.ObjectId(partnerUser)
        }

        if (searchValue) {
            query.name = { $regex: searchValue, $options: 'i' };
        }
        const categories = await categoryModel.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: "settings",
                    let: { categoryId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$serviceId", "$$categoryId"] },
                                        { $eq: ["$partnerId", new mongoose.Types.ObjectId(partnerUser)] },
                                        { $eq: ["$isDeleted", false] },
                                    ],
                                },
                            },
                        },
                        { $limit: 1 }
                    ],
                    as: "settings",
                },
            },
            {
                $unwind: {
                    path: "$settings",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $addFields: {
                    isPerBagActive: { $ifNull: ["$settings.isPerBagActive", true] },
                    isPerKgActive: { $ifNull: ["$settings.isPerKgActive", true] },
                    perBagAmount: { $ifNull: ["$settings.perBagAmount", 0] },
                    perKgAmount: { $ifNull: ["$settings.perKgAmount", 0] },
                    transportationFee: { $ifNull: ["$settings.transportationFee", 0] },
                },
            },
            {
                $project: {
                    settings: 0,
                },
            },
            { $sort: { createdAt: -1 } },
        ]);

        // const categories = await categoryModel.find(query).sort({ createdAt: -1 });
        // console.log(categories,">>> cateogries >>>")
        return Utilities.sendResponsData({
            code: 200,
            message: FETCH_LISTING_SUCCESS.message,
            data: categories
        });

    } catch (error) {
        const err = error as Error;
        handleServerError(err, res)
    }
}



export const deleteCategory = async (token: any, id: string, req: any, res: any) => {
    try {
        const decoded: any = await Utilities.getDecoded(token);
        if (mongoose.Types.ObjectId.isValid(id)) {
            let categoryRes: any = await categoryModel.findOne({
                _id: mongoose.Types.ObjectId(id),
                isDeleted: false,
                createdBy: decoded.id
            });
            let userRes = await userModel.findOne({
                role: ADMIN
            });

     
            const { note } = req.body;
            if (!note || !note.trim()) {
                throw new HTTP400Error(
                    Utilities.sendResponsData({
                        code: 400,
                        message: "Note is required",
                    })
                );
            }

            if (categoryRes) {


                
                categoryRes.isDeleted = true;
                let result = await categoryRes.save();

                await subCategoryModel.updateMany(
                    { categoryId: id },
                    { $set: { isDeleted: true } }
                );

                await settingsModel.updateMany(
                    { serviceId: id },
                    { $set: { isDeleted: true } }
                );

                let messageObj = {
                    title: "Service Deleted.",
                    body: `${decoded.name} has deleted the service: ${categoryRes?.name}.`,
                  }
    
                let notificationData = {
                    message: messageObj,
                    recevierId: userRes._id,
                    receiverType: "user",
                    senderId: decoded.id,
                    senderType: "partner",
                    note: note
                };
                const io = SocketUtilities.socketio.getIO();
                io.emit('notification', notificationData);
    
                await notificationModel.create(notificationData);

                return Utilities.sendResponsData({
                    code: 200,
                    message: CATEGORY_SUCCESS_MESSAGES.CATEGORY_DELETED.message,
                });
            } else {
                throw new HTTP400Error(
                    Utilities.sendResponsData({
                        code: 400,
                        message: CATEGORY_ERROR_MESSAGES.CATEGORY_NOT_EXIST.message,
                    })
                );
            }
        } else {
            throw new HTTP400Error(
                Utilities.sendResponsData({
                    code: 400,
                    message: CATEGORY_ERROR_MESSAGES.INVALID_ID.message,
                })
            );
        }
    } catch (error) {
        const err = error as Error;
        handleServerError(err, res);
    }
}

export const updateCategory = async (token: any, req: any, res: any) => {
    const decoded: any = await Utilities.getDecoded(token)
    const { id } = req.params;
    let bodyData: any = req.body;
    console.log(bodyData,'status')
    let filesArr: any = req.files;
    const filePaths = filesArr?.map((file: any) => file.path);
    let userRes = await userModel.findOne({
        role: ADMIN
    });

    if (mongoose.Types.ObjectId.isValid(id)) {
        let categoryRes: any = await categoryModel.findOne({
            _id: mongoose.Types.ObjectId(id),
            isDeleted: false,
        })
        if (categoryRes) {
            categoryRes.updatedBy = decoded.id
            if (bodyData.serviceName) categoryRes.name = bodyData.serviceName;
            if (bodyData.subTitle) categoryRes.subTitle = bodyData.subTitle;
            if (bodyData.description) categoryRes.description = bodyData.description;
            if (bodyData.status) {
                categoryRes.isActiveByPartner = (bodyData.status != "Active") ? false : true;
            }
            if (filePaths?.length > 0) {
                let url = await FileUpload.uploadFileToAWS(filesArr[0], "category", null);
                categoryRes.photo = url
            }
            console.log(bodyData.note,'note')
            if (categoryRes.status != bodyData.status) {
                let messageObj = {
                    title: "Service Status Updated.",
                    body: `${decoded.name} has changed status of service : ${bodyData?.serviceName}.`,
                  }
                let notificationData = {
                    message: messageObj,
                    recevierId: userRes._id,
                    receiverType: "user",
                    senderId: decoded.id,
                    senderType: "partner",
                    note: bodyData.note
                };
                const io = SocketUtilities.socketio.getIO();
                io.emit('notification', notificationData);

                await notificationModel.create(notificationData);
            }
            categoryRes.status = bodyData.status;
            let result = await categoryRes.save()
            return Utilities.sendResponsData({
                code: 200,
                message: SUCCESS,
                data: result
            });
        } else {
            throw new HTTP400Error(
                Utilities.sendResponsData({
                    code: 400,
                    message: CATEGORY_ERROR_MESSAGES.CATEGORY_NOT_EXIST.message,
                }))
        }
    } else {
        throw new HTTP400Error(
            Utilities.sendResponsData({
                code: 400,
                message: CATEGORY_ERROR_MESSAGES.INVALID_ID.message,
            }))
    }
}

export const getCategoryDetailById = async (token: any, id: string, res: any) => {
    try {
        const decoded: any = await Utilities.getDecoded(token)
        if (mongoose.Types.ObjectId.isValid(id)) {
            let categoryRes: any = await categoryModel.findOne({
                _id: mongoose.Types.ObjectId(id),
                isDeleted: false,
                createdBy: decoded.id
            })
            if (categoryRes) {
                return Utilities.sendResponsData({
                    code: 200,
                    message: "Category fetched successfully",
                    data: categoryRes,
                });
            } else {
                throw new HTTP400Error(
                    Utilities.sendResponsData({
                        code: 400,
                        message: CATEGORY_ERROR_MESSAGES.CATEGORY_NOT_EXIST.message,
                    }))
            }
        } else {
            throw new HTTP400Error(
                Utilities.sendResponsData({
                    code: 400,
                    message: CATEGORY_ERROR_MESSAGES.INVALID_ID.message,
                }))
        }
    } catch (error) {
        const err = error as Error;
        handleServerError(err, res)
    }
}
