import multer from 'multer';
import fs from 'fs';
import path from 'path';
import * as AWS from "aws-sdk";
import { v4 as uuidv4 } from 'uuid';
import puppeteer from 'puppeteer';
// import * as html_to_pdf from 'html-pdf-node';
import { generateInvoiceHTML } from './generateInvoiceHTML'; 

const options: any = {
  secretAccessKey:  process.env.AWS_BUCKET_SECRET,
  accessKeyId:  process.env.AWS_BUCKET_ACCESS_KEY,
  region:  process.env.AWS_BUCKET_REGION,
  endpoint:  process.env.AWS_BUCKET_ENDPOINT
};

// export const generateAndUploadInvoice = async (order: any): Promise<string> => {
//   console.log('===generateAndUploadInvoice===');  
//   const htmlContent = generateInvoiceHTML(order);
//   const file = { content: htmlContent };
//   const options = { format: 'A4' };

//   // ✅ Generate PDF buffer
//   const pdfBuffer:any = await html_to_pdf.generatePdf(file, options);
//   console.log('===>>>>pdfBuffer',pdfBuffer);
  

//   // ✅ Save to temp path
//   const pdfPath = `temp/${order._id}-${Date.now()}.pdf`;
//   fs.writeFileSync(pdfPath, pdfBuffer); // <-- error was probably here

//   // ✅ Prepare fake file object for AWS upload
//   const fakeFileObj = {
//     originalname: `${order._id}-invoice.pdf`,
//     mimetype: 'application/pdf',
//     path: pdfPath,
//   };

//   const s3Key = await FileUpload.uploadFileToAWS(fakeFileObj, 'invoices', null);
//   return `${process.env.AWS_BUCKET_ENDPOINT}/${process.env.AWS_BUCKET_NAME}/${s3Key}`;
// };

export const generateAndUploadInvoice = async (order: any, serviceName: any): Promise<string> => {
  const htmlContent = generateInvoiceHTML(order);
  console.log('++++++',htmlContent);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const pdfPath = `temp/${order._id}-${Date.now()}.pdf`;
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
  });

  await browser.close();

  const fakeFileObj = {
    originalname: `${order._id}-invoice.pdf`,
    mimetype: 'application/pdf',
    path: pdfPath,
  };

  console.log('fakeFileObj===>>****',fakeFileObj);

  const s3Key = await FileUpload.uploadFileToAWS(fakeFileObj, 'invoices', null); // Save under invoices/
  return `${process.env.AWS_BUCKET_ENDPOINT}/${process.env.AWS_BUCKET_NAME}/${s3Key}`;
};


const storage = multer.diskStorage({

  destination: (req, file, cb) => {
    const path = "temp/";
    fs.mkdirSync(path, { recursive: true });
    return cb(null, path);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 5MB
  }
});

export const uploadFile = (fieldName: string, isArray: boolean = false) => {
  return isArray ? upload.array(fieldName) : upload.single(fieldName);
};

export const manageMulteraws = () => {
    const uploadDir = path.join(__dirname, '../temp');

    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    return multer({
        storage: multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, uploadDir);
            },
            filename: (req, file, cb) => {
                let customFileName = Date.now();
                let fileExtension = path.extname(file.originalname).split('.')[1];
                cb(null, customFileName + '.' + fileExtension);
            }
        }),
        limits: {
          fileSize: 20 * 1024 * 1024, // ✅ 5MB file size limit
        },
    });
};

export const uploadFileAWS = async (files: any) => {
  try {
    let images: any = [];
    if (files && files.length) {
      for (let file of files) {
        // let url: any = await FileUpload.uploadFileToAWS(file);
        // images.push(url?.Location);
      }
    }
    return images;
  } catch (error) {
    console.error("❌ Error file upload:", error);
  }
};

export class FileUpload {
  public static uploadFileToAWS = async (file: any, type: string, subfolder: any) => {
    // console.log('34 ==== type', type);
    // console.log('36  === file ', file);

    AWS.config.update(options);
    const s3 = new AWS.S3();
    const fileExt = path.extname(file.originalname);
    const fileRandomName = uuidv4();
    const fileNameWithoutExt = path.basename(file.originalname, fileExt);
    const sanitizedOriginalName = fileNameWithoutExt.replace(/\s+/g, "_").replace(/[^\w\-]/g, "");

    let newName: any;
    let fileContent;
    if (file.mimetype.indexOf('image/') > -1) {
      // newName = `${fileRandomName}`;
      newName = `${fileRandomName}/${sanitizedOriginalName}`;
      // fileContent = fs.createReadStream(`temp/${newName}`);
      fileContent = fs.createReadStream(file.path);
    } else {
      fileContent = fs.createReadStream(file.path);
      newName = `${fileRandomName}/${sanitizedOriginalName}${fileExt}`;
    }
    // fs.unlinkSync(file.path);

    let newFile: any;

    if (type == 'images') {
      newFile = `${type}/${newName}`;
    }
    if (type == 'profile') {
      newFile = `${type}/${newName}`;
    }
    if (type == 'category') {
      newFile = `${type}/${newName}`;
    }
    if (type == 'gymImages') {
      newFile = `${type}/${newName}`;
    }
    if (type == 'classes') {
      newFile = `${type}/${newName}`;
    }
    if (type == 'admin') {
      newFile = `${type}/${newName}`;
    }
    if (type === 'invoices') {
      newFile = `${type}/${newName}`;
    }

    console.log('newFile===>>',newFile);

    const params = {
      // ACL: 'public-read',
      ContentType: file.mimetype,
      Bucket: `${process.env.AWS_BUCKET_NAME}`,
      Body: fileContent,
      Key: `${newFile}`,
    };

    try {
      s3.upload(params, function (err: any, resdata: any) {
        if (err) {
          console.log("aws error ==== ", err);
          return err;
        }
        else {
          if (file.mimetype.indexOf('image/') > -1) {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
            if (fs.existsSync(`temp/${newName}`)) {
              fs.unlinkSync(`temp/${newName}`);
            }
          } else {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          }
        }
      });
    } catch (err) {
      newFile = '';  //if its not uploaded empty the image name
      console.log(`Error uploading file to S3. Details: `, err);
    }
    return newFile;
  }


  public static async delete(type: string, fileName: any) {
    AWS.config.update(options);
    const s3 = new AWS.S3();

    let oldFile: any;
    oldFile = fileName

    const params = {
      Bucket: `${process.env.AWS_BUCKET_NAME}`,
      Key: `${oldFile}`
      // Key: `${type}/${fileName}`
    };

    try {
      await s3.deleteObject(params).promise();
      return true;
    } catch (err) {
      return false;
    }
  }
}