import { Response, Request } from "express";
const getProductsHandler = async (req: Request, res: Response) => {
  return res
    .status(200)
    .json({ message: " Here you go all the products served" });
};

export { getProductsHandler };
