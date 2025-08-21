import http from "http";
import express from "express";
import { applyMiddleware, applyRoutes } from "./utils";
import middleware from "./middleware";
import routes from "./services";
import mongoose = require("mongoose");
import path from "path";
import 'dotenv/config';
import { createAdmin } from "./services/auth/controller";
import { DEFAULT_DB, DEFAULT_PORT, MONGO_DEFAULT_PATH } from "./constants";
import dotenv from "dotenv";
import { SocketUtilities } from "./utils/Socket";
import { ChatUtilities } from "./utils/socketPublish";
dotenv.config(); 
import cron from 'node-cron';
import { cronServer } from "./utils/cronJob";

const MONGO_PATH = process.env.MONGO_PATH || MONGO_DEFAULT_PATH;
const MONGO_DATABASE = process.env.MONGO_DATABASE || DEFAULT_DB;
const PORT = process.env.PORT || DEFAULT_PORT;

const router = express();
router.set('views', path.join(__dirname, 'views'));
router.set("view engine", "ejs");
router.use("/temp", express.static(path.join(__dirname, "../temp")));

router.use(express.json({ limit: '50mb' }));
router.use(express.urlencoded({ extended: true, limit: '50mb' }));

applyMiddleware(middleware, router);
applyRoutes(routes, router);

const server = http.createServer(router);
SocketUtilities.socketio.init(server)

createAdmin();

mongoose
  .connect(`${MONGO_PATH}/${MONGO_DATABASE}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    server.listen(PORT);
    console.log(`Server is running http://localhost:${PORT}...`);
  })
  .catch((err) => {
    console.log("inside error block");
    console.log(err);
  });

ChatUtilities.publishIds();

cron.schedule('* * * * * *', () => {
  cronServer.expireOrders()
});

