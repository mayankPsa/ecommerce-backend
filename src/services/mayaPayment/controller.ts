import mongoose = require("mongoose");
import { handleServerError } from "../../utils/ErrorHandler";

import https from 'https';

const options = {
method: 'POST',
  hostname: 'pg-sandbox.paymaya.com',
  port: null,
  path: '/payby/v2/paymaya/link',
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    'Authorization': 'Basic cGstcnB3YjVZUjZFZm5LaU1zbGRacVk0aGdwdkpqdXk4aGh4VzJiVkFBaXoyTjo='
  }
};

const sendRequest = async () => {
  try {
    const req = https.request(options, (res) => {
      let data = '';

      // A chunk of data has been received.
      res.on('data', (chunk) => {
        data += chunk;
      });

      // The whole response has been received.
      res.on('end', () => {
        console.log(JSON.parse(data)); // assuming the response is JSON
      });
    });

    // Handle request errors
    req.on('error', (error) => {
      console.error('Error occurred:', error.message);
    });

    // Write the body of the request (if needed)
    const requestBody = JSON.stringify({
      redirectUrl: {
        success: 'https://api.peakup.com/success',
        failure: 'https://api.peakup.com/failure',
        cancel: 'https://api.peakup.com/cancel'
      },
      metadata: {pf: {smi: '30', smn: '60', mci: '12', mpc: '222', mco: '912'}}
    });

    req.write(requestBody);  // Send the request body
    req.end();  // End the request

  } catch (err) {
    console.error('Error occurred:', err);
  }
};


export const createWallet = async (token: any, req: any, res: any) => {
  try {
    console.log(">>>>>>  >>>>>>>>")
    sendRequest();
  } catch (error) {
    const err = error as Error;
    handleServerError(err, res);
  }
};

