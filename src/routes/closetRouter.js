import { Router } from "express";
import middleware from "../middleware/closetMiddleware.js";
import connectDB from "../config/dbconfig.js";
import multer from "multer";

const router = Router();
const db = await connectDB();
const storage = multer.memoryStorage(); // Store the file in memory as a buffer
const upload = multer({ storage: storage }); // Middleware to handle file uploads

// Get all clothes
router.get("/", async (req, res) => {
  try {
    // Modify query to only select rows with a non-null image
    const query = `SELECT * from clothes WHERE image IS NOT NULL`;
    const [rows] = await db.execute(query);

    // Convert the image buffer to base64 for each item
    const clothesWithImages = rows.map((item) => {
      if (item.image) {
        // Convert image buffer to base64 string
        item.imageUrl = `data:image/jpeg;base64,${item.image.toString(
          "base64"
        )}`;
      }
      return item;
    });

    res.status(200).json(clothesWithImages);
  } catch (error) {
    console.log("Couldn't get the rows from the db");
    res.status(500).json({ message: "Couldn't get clothes" });
  }
});

// Search clothes with filters
router.get("/search", async (req, res) => {
  const { search, category } = req.query;


  try {
    let query = `SELECT * FROM clothes WHERE 1=1`;
    const params = [];

    if (search) {
      query += ` AND (type LIKE ? OR style LIKE ? OR occasion LIKE ? OR color LIKE ?)`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (category === "style") {
      query += ` AND style = ?`;
      params.push(search);
    }

    const [rows] = await db.execute(query, params);

    // Convert image buffer to Base64
    const result = rows.map((item) => {
      if (item.image) {
        item.image = `data:image/jpeg;base64,${item.image.toString("base64")}`;
      }
      return item;
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching clothes:", error);
    res.status(500).json({ message: "Error fetching clothes" });
  }
});

router.get("/outfits", async (req, res) => {
  try {
    const [results] = await db.execute(`
      SELECT o.id AS outfit_id, o.name, o.description, o.created_at, o.updated_at,
             c.id AS clothes_id, c.type, c.color, c.style, c.occasion, c.image
      FROM outfits o
      LEFT JOIN outfit_items oi ON o.id = oi.outfit_id
      LEFT JOIN clothes c ON oi.clothes_id = c.id
    `);

    
    const groupedOutfits = {};
    results.forEach((row) => {
      if (!groupedOutfits[row.outfit_id]) {
        groupedOutfits[row.outfit_id] = {
          id: row.outfit_id,
          name: row.name || "Unnamed Outfit",
          description: row.description || "No description",
          created_at: row.created_at,
          updated_at: row.updated_at,
          items: [],
        };
      }

      if (row.clothes_id) {
        groupedOutfits[row.outfit_id].items.push({
          id: row.clothes_id || null,
          type: row.type || "Unknown",
          color: row.color || "Unknown",
          style: row.style || "Unknown",
          occasion: row.occasion || "Unknown",
          imageUrl: row.image
            ? `data:image/jpeg;base64,${Buffer.from(row.image).toString("base64")}`
            : null, // Rename image to imageUrl
        });
      }
    });

    const response = Object.values(groupedOutfits);
    
    res.status(200).json(response);
  } catch (error) {
    console.error("[ERROR] Fetching Outfits:", error);
    res.status(500).json({ message: "Failed to fetch outfits" });
  }
});

// Example Node.js/Express route
router.get("/options", async (req, res) => {
  const { category } = req.query;

  if (!category) {
    return res.status(400).json({ message: "Category is required" });
  }

  try {
    const query = `SELECT DISTINCT ${category} FROM clothes`;
    const [rows] = await db.execute(query);

    const options = rows.map((row) => row[category]);
    res.json(options);
  } catch (error) {
    console.error("Error fetching options:", error);
    res.status(500).json({ message: "Failed to fetch options" });
  }
});

router.post(
  "/add",
  upload.single("image"),
  middleware.addQueryMiddleware,
  async (req, res) => {
    const { type, color, style, occasion } = req.body; // Access data from request body
    const image = req.file ? req.file.buffer : null; // Access the image buffer from the file

    // Check if image exists and is valid
    if (!image) {
      return res.status(400).json({ message: "Image is required." });
    }

    const query = `INSERT INTO clothes (type, color, style, occasion, image) VALUES (?, ?, ?, ?, ?)`;

    try {
      const [result] = await db.execute(query, [
        type,
        color,
        style,
        occasion,
        image,
      ]);
      res
        .status(200)
        .json({ message: "Item added successfully", id: result.insertId });
    } catch (error) {
      console.error("Error entering data into the database:", error.message);
      res.status(500).json({ message: "Couldn't add item" });
    }
  }
);

router.post("/outfits", async (req, res) => {
  const { name, description, items } = req.body;

  try {
    // Insert the outfit into the 'outfits' table
    const [result] = await db.execute(
      "INSERT INTO outfits (name, description) VALUES (?, ?)",
      [name, description]
    );
    const outfitId = result.insertId;

    // Check if there are items to insert
    if (items && items.length > 0) {
      // Prepare the values for bulk insertion
      const values = items.map((clothesId) => [outfitId, clothesId]);

      // Use bulk insertion syntax
      await db.query(
        "INSERT INTO outfit_items (outfit_id, clothes_id) VALUES ?",
        [values]
      );
    }

    res.status(201).json({ message: "Outfit created successfully!" });
  } catch (error) {
    console.error("Error saving outfit:", error);
    res.status(500).json({ message: "Failed to save outfit" });
  }
});
// Remove from closet by ID
router.delete("/delete/:id", middleware.deleteMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10);

  // Validate the ID
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  try {
    const query = "DELETE FROM clothes WHERE id = ?";
    const [result] = await db.execute(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    res
      .status(200)
      .json({ message: `Item with id ${id} deleted successfully` });
  } catch (error) {
    console.error("Error deleting item from database:", error.message);
    res.status(500).json({ message: "Failed to delete item" });
  }
});

router.delete("/outfits/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Delete the outfit and associated items from the database
    await db.execute("DELETE FROM outfit_items WHERE outfit_id = ?", [id]);
    await db.execute("DELETE FROM outfits WHERE id = ?", [id]);

    console.log(`[DEBUG] Deleted outfit with id: ${id}`);
    res.status(200).json({ message: "Outfit deleted successfully" });
  } catch (error) {
    console.error(`[ERROR] Failed to delete outfit with id ${id}:`, error);
    res.status(500).json({ message: "Failed to delete outfit" });
  }
});

export default router;
