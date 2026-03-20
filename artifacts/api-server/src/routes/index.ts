import { Router, type IRouter } from "express";
import healthRouter from "./health";
import streamsRouter from "./streams";
import proxyRouter from "./proxy";
import searchRouter from "./search";

const router: IRouter = Router();

router.use(healthRouter);
router.use(streamsRouter);
router.use(proxyRouter);
router.use(searchRouter);

export default router;
