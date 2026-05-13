import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import stripeRouter from "./stripe.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stripeRouter);

export default router;
