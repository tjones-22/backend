import dotenv from "dotenv";
import closetRouter from "./routes/closetRouter.js";
import setupTables from "./config/setUpTables.js";
import express from "express";
import cors from 'cors';

dotenv.config();
const app = express();
setupTables();

const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());
// Apply router with a base path
app.use("/closet", closetRouter);

// Debug unmatched routes (404 handler)
app.use((req, res) => {
  console.log(`[DEBUG] Unmatched Route: ${req.method} ${req.path}`);
  res.status(404).json({ message: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
