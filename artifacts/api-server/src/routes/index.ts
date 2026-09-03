import { Router, type IRouter } from "express";
import healthRouter from "./health";
import showsRouter from "./shows";
import adminRouter from "./admin";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(showsRouter);
router.use(adminRouter);
router.use(storageRouter);

export default router;
