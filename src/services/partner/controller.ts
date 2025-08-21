import { Utilities } from '../../utils/utilities'
import { partnerModel } from '../../db/Partners';
import { handleServerError } from '../../utils/ErrorHandler';
import { HTTP400Error } from '../../utils/httpErrors';
import { EMAIL_EXIST, SUCCESS } from '../../utils/messages';

// Get a list of partners
export const getPartnerList = async (token: any, queryParams: any, res: any) => {
  try {
    const page = parseInt(queryParams.page as string) || 1;
    const limit = parseInt(queryParams.limit as string) || 10;
    const skip = (page - 1) * limit;

    let search = queryParams.search;
    let query: any = {
      isDeleted: false, // Only fetch active partners
    };

    if (search) {
      query["$or"] = [
        { laundryName: new RegExp(search, 'i') },
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }

    let totalRecords = await partnerModel.find(query);
    let partnerRes = await partnerModel
      .find(query)
      .sort({ createdAt: -1 })
      .select("_id email laundryName")

    let totalCount = await partnerModel.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    return Utilities.sendResponsData({
      code: 200,
      data: partnerRes,
      totalRecord: totalCount,
      message: 'SUCCESS'
    });
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

// export const editPartnerProfile = async (req: any, res: any) => {
//   try {
//     const partnerId = req.params.id;
//     const {
//       email,
//       laundryName,
//       name,
//       phoneNumber,
//       openingTime,
//       closingTime,
//       street,
//       city,
//       state,
//       address,
//       postalCode,
//     } = req.body;

//     const existingPartner = await partnerModel.findOne({
//       email,
//       _id: { $ne: partnerId },
//     });

//     if (existingPartner) {
//       throw new HTTP400Error(
//         Utilities.sendResponsData({
//           code: 400,
//           message: EMAIL_EXIST.message,
//         })
//       );
//     }

//     let filesArr: any = req.files;
//     const filePaths = filesArr?.map((file: any) => file.path);

//     const updatedData: any = {
//       email,
//       laundryName,
//       name,
//       phone: phoneNumber,
//       openingHours: {
//         start: openingTime,
//         end: closingTime,
//       },
//       street,
//       city,
//       state,
//       address,
//       postalCode,
//     };

//     if (filePaths?.length > 0) {
//       updatedData.profilePicture = filePaths[0];
//     }

//     const updatedPartner = await partnerModel.findByIdAndUpdate(
//       partnerId,
//       updatedData,
//       { new: true }
//     );

//     return Utilities.sendResponsData({
//       code: 200,
//       message: SUCCESS,
//       data: updatedPartner,
//     });
//   } catch (error) {
//     console.log(error)
//     const err = error as Error;
//     handleServerError(err, res);
//   }
// };

export const editPartnerProfile = async (req: any, res: any) => {
  try {
    const partnerId = req.params.id;
    const {
      email,
      laundryName,
      name,
      phoneNumber,
      openingTime,
      closingTime,
      street,
      city,
      state,
      address,
      postalCode,
      status, 
    } = req.body;
    const existingPartner = await partnerModel.findOne({
      email,
      _id: { $ne: partnerId },
    });

    if (existingPartner) {
      throw new HTTP400Error(
        Utilities.sendResponsData({
          code: 400,
          message: EMAIL_EXIST.message,
        })
      );
    }

    let filesArr: any = req.files;
    const filePaths = filesArr?.map((file: any) => file.path);

    const updatedData: any = {
      email,
      laundryName,
      name,
      phone: phoneNumber,
      openingHours: {
        start: openingTime,
        end: closingTime,
      },
      street,
      city,
      state,
      address,
      postalCode,
      ...(status && { status }),
    };

    if (filePaths?.length > 0) {
      updatedData.profilePicture = filePaths[0];
    }

    const updatedPartner = await partnerModel.findByIdAndUpdate(
      partnerId,
      updatedData,
      { new: true }
    );

    return Utilities.sendResponsData({
      code: 200,
      message: SUCCESS,
      data: updatedPartner,
    });
  } catch (error) {
    console.log(error);
    const err = error as Error;
    handleServerError(err, res);
  }
};