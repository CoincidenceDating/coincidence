import { Router, type IRouter } from "express";
import healthRouter from "./health";
import venuesRouter from "./venues";

const router: IRouter = Router();

router.use(healthRouter);
router.use(venuesRouter);

export default router;
