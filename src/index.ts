import express, { Request, Response } from "express";

const app = express();

app.use(express.json());

const PORT = 6767;

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Servaer is Running Great", success: true });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
