import mongoose = require('mongoose')
import { categoryModel } from '../../../db/Category';
import { Utilities } from '../../../utils/utilities';
import { handleServerError } from '../../../utils/ErrorHandler';
import { FETCH_LISTING_SUCCESS, SUCCESS } from '../../../utils/messages';
import { HTTP400Error } from '../../../utils/httpErrors';
import { SocketUtilities } from '../../../utils/Socket';
import { FileUpload } from '../../../utils/FileUploadUtilities';
import ServiceIconModel from '../../../db/ServiceIcon';
import ejs from "ejs";
import { MailerUtilities } from '../../../utils/MailerUtilities';
import { SERVICE_ACTIVE, SERVICE_ACTIVE_MSG, SERVICE_INACTIVE, SERVICE_INACTIVE_MSG, SERVICE_REQUEST_APPROVED, SERVICE_REQUEST_DIS_APPROVED } from '../../../constants';
import * as path from "path";
import * as fs from "fs";
// import { FirebaseUtilities } from '../../../utils/firebase';

export const getCategoryList = async (token: any, queryParams: any, partnerId: any, res: any) => {
  try {
    let partnerId = queryParams.partnerId;
    let query: any = {
      isDeleted: false
    }
    if (partnerId) {
      query.partnerId = new mongoose.Types.ObjectId(partnerId)
    }
    const categories = await categoryModel.find(query).sort({ createdAt: -1 }).populate('partnerId');;
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


// export const updateCategoryStatus = async (req: any, res: any) => {
//   try {
//     const { id } = req.params;
//     const { status } = req.body;
    
//     if (!['Active', 'InActive'].includes(status)) {
//       throw new HTTP400Error(
//         Utilities.sendResponsData({
//           code: 400,
//           message: "Invalid status. Only 'Active' or 'InActive' allowed.",
//         })
//       );
//     }

//     const category = await categoryModel.findById(id).populate("partnerId");
     
//     if(status === 'Active'){
//       category.isActiveByAdmin = true;
//     }

//     if (!category) {
//       throw new HTTP400Error(
//         Utilities.sendResponsData({
//           code: 404,
//           message: "Category not found.",
//         })
//       );
//     }

//     if(status === 'Active'){
//       category.isActiveByAdmin = true;
//     }
//     category.status = status;

//     let notificationData = {
//       serviceId: id,
//       message: `Service ${category.name} status is changed ${status}`,
//       partnerId: category.partnerId,
//       category:category
//     }

//     const io = SocketUtilities.socketio.getIO();
//     io.emit('service', notificationData);
//     await category.save();
//     if (status === "Active") {

//       const payload = {
//         notification: {
//           title: SERVICE_ACTIVE,
//           body: SERVICE_ACTIVE_MSG,
//         },
//         data: {
//           title: SERVICE_ACTIVE,
//           body: SERVICE_ACTIVE_MSG,
//         },
//       };

//       if (category?.partnerId?.fcmToken) {
//         let messageRes = await FirebaseUtilities.firebaseSendNotification(
//           category?.partnerId?.fcmToken,
//           payload
//         );
//       }

//       if (category?.partnerId?.email) {
//         const payload = {
//           notification: {
//             title: SERVICE_INACTIVE,
//             body: SERVICE_INACTIVE_MSG,
//           },
//           data: {
//             title: "Notification",
//             body: SERVICE_INACTIVE_MSG,
//           },
//         };

//         if (category?.partnerId?.fcmToken) {
//           let messageRes = await FirebaseUtilities.firebaseSendNotification(
//             category?.partnerId?.fcmToken,
//             payload
//           );
//         }

//         let obj = {
//           serviceName: category.name
//             ? category.name.charAt(0).toUpperCase() + category.name.slice(1)
//             : "",
//           status: status,
//           recipient_Name: category?.partnerId?.name
//             ? category.partnerId.name.charAt(0).toUpperCase() + category.partnerId.name.slice(1)
//             : ""
//         };
//         const templatePath = path.join(process.cwd(), 'src/views/serviceStatusActive.ejs');
//         let html;
//         try {
//           const template = fs.readFileSync(templatePath, "utf-8");
//           html = await ejs.render(template, obj);
//         } catch (fileError) {
//           console.error("Error reading EJS template:", fileError);
//           throw new Error("Failed to load email template");
//         }
//         const mailData = {
//           recipient_email: [category?.partnerId?.email],
//           subject: SERVICE_REQUEST_APPROVED,
//           text: "message",
//           html,
//         };
//         await MailerUtilities.sendSendgridMail(mailData);
//       }
//     }

//     if (status === "InActive") {
//       if (category.partnerId.email) {
//         let obj = {
//           serviceName: category.name
//             ? category.name?.charAt(0).toUpperCase() + category?.name?.slice(1)
//             : "",
//           status: status,
//           recipient_Name: category?.partnerId?.name
//             ? category.partnerId.name.charAt(0).toUpperCase() + category.partnerId.name.slice(1)
//             : ""
//         };

//         const templatePath = path.join(process.cwd(), 'src/views/serviceStatusInActive.ejs');
//         let html;
//         try {
//           const template = fs.readFileSync(templatePath, "utf-8");
//           html = await ejs.render(template, obj);
//         } catch (fileError) {
//           console.error("Error reading EJS template:", fileError);
//           throw new Error("Failed to load email template");
//         }
//         const mailData = {
//           recipient_email: [category.partnerId.email],
//           subject: SERVICE_REQUEST_DIS_APPROVED,
//           text: "message",
//           html,
//         };
//         await MailerUtilities.sendSendgridMail(mailData);
//       }
//     }


//     return Utilities.sendResponsData({
//       code: 200,
//       message: "Category status updated successfully.",
//       data: { id, status },
//     });
//   } catch (error) {
//     const err = error as Error;
//     handleServerError(err, res);
//   }
// };


// export const updateCategoryStatus = async (req: any, res: any) => {
//   try {
//     const { id } = req.params;
//     const { status } = req.body;

//     // Validate status
//     if (!['Active', 'InActive'].includes(status)) {
//       throw new HTTP400Error(
//         Utilities.sendResponsData({
//           code: 400,
//           message: "Invalid status. Only 'Active' or 'InActive' allowed.",
//         })
//       );
//     }

//     // Find category and populate partnerId
//     const category = await categoryModel.findById(id).populate("partnerId");
//     if (!category) {
//       throw new HTTP400Error(
//         Utilities.sendResponsData({
//           code: 404,
//           message: "Category not found.",
//         })
//       );
//     }

//     // Update category status
//     category.status = status;
//     category.isActiveByAdmin = status === 'Active';

//     let messageObj = {
//       title: (status === 'Active') ? SERVICE_ACTIVE : SERVICE_INACTIVE,
//       body: `Service ${category.name} status is changed to ${status}.`,
//     }

//     // Emit socket notification
//     const notificationData = {
//       serviceId: id,
//       message: messageObj,
//       partnerId: category.partnerId,
//       category,
//     };
//     const io = SocketUtilities.socketio.getIO();
//     io.emit('notification', notificationData);

//     // Save category changes
//     await category.save();

//     // Prepare notification payload
//     const isActive = status === 'Active';
//     const notificationPayload = {
//       notification: {
//         title: isActive ? SERVICE_ACTIVE : SERVICE_INACTIVE,
//         body: isActive ? SERVICE_ACTIVE_MSG : SERVICE_INACTIVE_MSG,
//       },
//       data: {
//         title: isActive ? SERVICE_ACTIVE : SERVICE_INACTIVE,
//         body: isActive ? SERVICE_ACTIVE_MSG : SERVICE_INACTIVE_MSG,
//       },
//     };

//     console.log(category?.partnerId?.fcmToken,'dsadas')
//     // Send push notification if FCM token exists

//     // ********************************************
//     if (category?.partnerId?.fcmToken && (typeof category?.partnerId?.fcmToken === 'string') && category?.partnerId?.fcmToken.trim()){
//       try {
//         const messageRes = await FirebaseUtilities.firebaseSendNotification(
//           category.partnerId.fcmToken,
//           notificationPayload
//         );
//         console.log('Push notification sent:', messageRes);
//       } catch (fcmError) {
//         console.error('Error sending push notification:', fcmError);
//       }
//     } else {
//       console.warn('No FCM token found for partner:', category?.partnerId?._id);
//     }

//     // Send email notification
//     if (category?.partnerId?.email) {
//       const obj = {
//         serviceName: category.name
//           ? category.name.charAt(0).toUpperCase() + category.name.slice(1)
//           : '',
//         status,
//         recipient_Name: category?.partnerId?.name
//           ? category.partnerId.name.charAt(0).toUpperCase() + category.partnerId.name.slice(1)
//           : '',
//       };

//       const templatePath = path.join(
//         process.cwd(),
//         `src/views/serviceStatus${isActive ? 'Active' : 'InActive'}.ejs`
//       );
//       let html;
//       try {
//         const template = fs.readFileSync(templatePath, 'utf-8');
//         html = await ejs.render(template, obj);
//       } catch (fileError) {
//         console.error('Error reading EJS template:', fileError);
//         throw new Error('Failed to load email template');
//       }

//       const mailData = {
//         recipient_email: [category.partnerId.email],
//         subject: isActive ? SERVICE_REQUEST_APPROVED : SERVICE_REQUEST_DIS_APPROVED,
//         text: 'message',
//         html,
//       };
//       await MailerUtilities.sendSendgridMail(mailData);
//     }

//     return Utilities.sendResponsData({
//       code: 200,
//       message: 'Category status updated successfully.',
//       data: { id, status },
//     });
//   } catch (error) {
//     const err = error as Error;
//     handleServerError(err, res);
//   }
// };

export const addCategoryIcon = async (token: any, req: any, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token)
    let bodyData: any = req.body;
    let filesArr: any = req.files;
    const filePaths = filesArr?.map((file: any) => file.path);
    console.log('filePaths==>', filePaths)
    bodyData.createdBy = decoded.id
    bodyData.updatedBy = decoded.id
    if (filePaths?.length > 0) {
      let url = await FileUpload.uploadFileToAWS(filesArr[0], "category", null);
      bodyData.imageUrl = url
    }
    let result = await ServiceIconModel.create(bodyData)

    return Utilities.sendResponsData({
      code: 200,
      message: SUCCESS.message,
      data: result
    });

  } catch (error) {
    console.log(error, "error")
    const err = error as Error;
    handleServerError(err, res)
  }
}
export const deleteIcon = async (token: any, id: string, res: any) => {
  try {
    const decoded: any = await Utilities.getDecoded(token)
    if (mongoose.Types.ObjectId.isValid(id)) {
      let iconRes: any = await ServiceIconModel.findOne({
        _id: mongoose.Types.ObjectId(id),
        isDeleted: false
      })
      if (iconRes) {
        iconRes.isDeleted = true
        let result = await iconRes.save();
        if (result) {
          await categoryModel.updateMany(
            { icon: id, isDeleted: false },
            {
              $set: {
                icon: null,
                photo: null,
                updatedBy: decoded.id,
              },
            }
          );
        }

        return Utilities.sendResponsData({
          code: 200,
          message: "Icon deleted successfully",
        })
      } else {
        throw new HTTP400Error(
          Utilities.sendResponsData({
            code: 400,
            message: "Icon does not exist.",
          }))
      }
    } else {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "Invalid category ID.",
        }))
    }
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res)
  }
}

export const updateIcon = async (token: any, req: any, res: any) => {
  const decoded: any = await Utilities.getDecoded(token)
  const { id } = req.params;
  let filesArr: any = req.files;
  const { name, description } = req.body;
  const filePaths = filesArr?.map((file: any) => file.path);
  if (mongoose.Types.ObjectId.isValid(id)) {
    let iconRes: any = await ServiceIconModel.findOne({
      _id: mongoose.Types.ObjectId(id),
      isDeleted: false,
    })
    if (iconRes) {
      iconRes.updatedBy = decoded.id
      let newImageUrl: string | null = null;
      if (filePaths?.length > 0) {
        newImageUrl = await FileUpload.uploadFileToAWS(filesArr[0], "category", null);
        iconRes.imageUrl = newImageUrl;
      }

      if (name) iconRes.name = name;
      if (description) iconRes.description = description;

      let result = await iconRes.save();

      if (newImageUrl) {
        await categoryModel.updateMany(
          { icon: id, isDeleted: false },
          {
            $set: {
              photo: newImageUrl,
              icon: id,
              updatedBy: decoded.id,
            },
          }
        );
      }

      return Utilities.sendResponsData({
        code: 200,
        message: SUCCESS,
        data: result
      });
    } else {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: "Icon does not exist.",
        }))
    }
  } else {
    throw new HTTP400Error(
      Utilities.sendResponsData({
        code: 400,
        message: "Invalid category ID.",
      }))
  }
}

export const getIconDetail = async (token: any, iconId: any, res: any) => {
  try {
    let query: any = {
      _id: new mongoose.Types.ObjectId(iconId),
      isDeleted: false,
    }

    const iconDetail = await ServiceIconModel.findOne(query);
    return Utilities.sendResponsData({
      code: 200,
      message: FETCH_LISTING_SUCCESS.message,
      data: iconDetail
    });

  } catch (error) {
    const err = error as Error;
    handleServerError(err, res)
  }
}
export const getIconList = async (token: any, queryParams: any, partnerId: any, res: any) => {
  try {
    let query: any = {
      isDeleted: false,
    }
    const icons = await ServiceIconModel.find(query).sort({ createdAt: -1 });
    return Utilities.sendResponsData({
      code: 200,
      message: FETCH_LISTING_SUCCESS.message,
      data: icons
    });

  } catch (error) {
    const err = error as Error;
    handleServerError(err, res)
  }
}
