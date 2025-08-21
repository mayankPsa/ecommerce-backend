import { Utilities } from "./AuthUtilities";
import { HTTP400Error, HTTP403Error } from "./httpErrors";
import { INTERNAL_SERVER_ERROR } from "./messages";

export const invalidTokenError = () => {
  throw new HTTP403Error({responseCode:403,responseMessage:"Invalid Token", data:{}});
}

export const errorMessageHander =  (data:any) => {
  let errorArr:any = [];
  Object.keys(data).forEach(function(key) {
      errorArr.push(data[key].message);
  });
  return errorArr;
};

export const handleServerError = (error: any, res:any) => {

  // console.log(error,'>>> handleServererror >>>', res,"res")

  let errorMessage: any = error?.message ||  INTERNAL_SERVER_ERROR;

  errorMessage = JSON.parse(errorMessage);
  let statusCode = 500;

  if(errorMessage?.responseCode){
    statusCode = errorMessage?.responseCode
  }
  console.log(errorMessage, "error Messages")

  res
    .status(statusCode)
    .json(
      Utilities.sendResponsData({
      code: statusCode,
      message: errorMessage?.responseMessage,
  }));
};