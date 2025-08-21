import jwt from "jsonwebtoken";
import config from "config";
import * as bcrypt from "bcrypt";
import { userModel } from "../db/User";
// import Users from "../db/Users";
export const checkEnvVar = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is not defined in environment variables`);
  }
  return value;
};

export class Utilities {

  public static sendResponsData(response: any) {
    let result: any = {
      responseCode: response.code,
      responseMessage: response.message,
    };
    
    if (response.data) {
      result.data = response.data;
    }
    if (response.totalRecord) {
      result.totalRecord = response.totalRecord;
    }
    if(response.pagination){
      result.pagination = response.pagination
    }

    return result;
  }

  public static cryptPassword = async (password: string) => {
    return new Promise(function (resolve, reject) {
      return bcrypt.hash(
        password,
        10,
        (err: any, hash: any) => {
          if (err) {
            return reject(err);
          } else {
            return resolve(hash);
          }
        }
      );
    });
  };


  public static VerifyPassword = async (password: string, hash: string) => {
    return new Promise(function (resolve, reject) {
      return bcrypt.compare(password, hash, (error: any, result: any) => {
        if (error) {
          return reject(error);
        } else {
          return resolve(result);
        }
      });
    });
  };

  public static createJWTToken = async (payload: any) => {
    const secretKey = checkEnvVar('JWT_SECRET_KEY');
    if (typeof secretKey !== 'string') {
      throw new Error('JWT_SECRET_KEY is not defined or not a string');
    }

    return jwt.sign(payload, secretKey, {});
  };

  public static verifyToken = async (token: any) => {
    return new Promise(function (resolve, reject) {
      jwt.verify(
        token,
        checkEnvVar('JWT_SECRET_KEY'),
        async function (error: any, result: any) {
          if (error) {
            return reject(error);
          } else {
            let userRes: any = await userModel.findOne({ accessToken: token });
            
            if (userRes) {
              return resolve(result);
            } else {
              return reject({ message: "Invalid Token" });
            }
          }
        }
      );
    })
    
  };

  public static getDecoded = async (token: any) => {
    return jwt.decode(token);
  };

  public static isAdmin = async (token: any) => {
    const decoded: any = await Utilities.getDecoded(token);

    if (
      decoded.user_type === "Super-Admin" ||
      decoded.user_type === "Sub-Admin"
    )
      return true;
    return false;
  };

  public static genAlphaNumericCode(length: number) {
    var result = "";
    var characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  public static genNumericCode(length: number) {
    let min = Math.pow(10, length - 1);
    let max = (Math.pow(10, length) - Math.pow(10, length - 1) - 1);
    return Math.floor(min + Math.random() * max)
  }

  public static adminVerifyToken = async (token: any) => {
    return new Promise(function (resolve, reject) {
      jwt.verify(
        token,
        checkEnvVar('JWT_SECRET_KEY'),
        async function (error: any, result: any) {
          if (error) {
            return reject(error);
          } else {
            let userRes: any = await userModel.findOne({ accessToken: token });
            
            if (userRes && userRes.role == 'admin') {
              return resolve(result);
            } else {
              return reject({ message: "Invalid Token" });
            }
          }
        }
      );
    })
  };
}