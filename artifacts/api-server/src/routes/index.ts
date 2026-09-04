import { Router, type IRouter } from "express";
import healthRouter from "./health";
import showsRouter from "./shows";
import adminRouter from "./admin";
import storageRouter from "./storage";
import seasonsRouter from "./seasons";
import episodesRouter from "./episodes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(showsRouter);
router.use(adminRouter);
router.use(storageRouter);
router.use(seasonsRouter);
router.use(episodesRouter);

export default router;
