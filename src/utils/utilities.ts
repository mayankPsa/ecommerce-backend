import jwt, { JwtPayload } from "jsonwebtoken";
import * as bcrypt from "bcrypt";
import { userModel } from "../db/User";
import { checkEnvVar } from "./helpers";
import 'dotenv/config';
import { partnerModel } from "../db/Partners";
var mongoose = require("mongoose");
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || "10");


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
    // console.log(result,">> result  dfdfdf>>>")

    return result;
  }

  public static cryptPassword = async (password: string) => {    
    return new Promise(function (resolve, reject) {
      return bcrypt.hash(
        password,
        SALT_ROUNDS,
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

  public static generateRandomPassword = async(length: number) => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return password;
  };

  public static createJWTToken = async (payload: any) => {
    return jwt.sign(payload, checkEnvVar('JWT_SECRET_KEY'), {});
  };

  public static verifyToken = async (token: any) => {
    const decoded: any = await Utilities.getDecoded(token);
    // console.log(token,">>> token >>>>>>>")
    // console.log(decoded,">>> decoded >>>>>")
    return new Promise(function (resolve, reject) {
      jwt.verify(
        token,
        checkEnvVar('JWT_SECRET_KEY'),
        async function (error: any, result: any) {
          if (error) {
            console.log(error,">>> error >>> ")
            return reject(error);
          } else {
            let userRes: any = await userModel.findOne({_id: mongoose.Types.ObjectId(decoded.id)});            
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

  public static verifyPartnerToken = async (token: any) => {
    const decoded: any = await Utilities.getDecoded(token);
    return new Promise(function (resolve, reject) {
      jwt.verify(
        token,
        checkEnvVar('JWT_SECRET_KEY'),
        async function (error: any, result: any) {
          if (error) {
            return reject(error);
          } else {
            let userRes: any = await partnerModel.findOne({_id: mongoose.Types.ObjectId(decoded.id)});     
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
}

export const generateToken = (userId: string, email: any, role:string): string => {
  const jwtSecretKey = checkEnvVar('JWT_SECRET_KEY');
  const payload: JwtPayload = {
    userId,
    id: userId,
    email,
    role,
    issuedAt: Math.floor(Date.now() / 1000),
  };

  const secretKey: string = jwtSecretKey;
  const tokenExpiry: string = (86400 * 7).toString(); 

  const token = jwt.sign(payload, secretKey, {
    expiresIn: tokenExpiry,
  } as jwt.SignOptions);

  return token;
};

