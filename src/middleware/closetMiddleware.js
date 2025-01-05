const addQueryMiddleware = (req, res, next) => {
  const { type, color, style, occasion } = req.body;

  // Check if any required parameter is missing
  if (!type || !color || !style || !occasion) {
    console.log("Invalid query detected: Missing required parameters.");
    return res
      .status(400)
      .json({ message: "Invalid query: Missing required parameters." });
  }

  // We don't need to check for the image here, multer will handle that
  console.log("Valid query. Proceeding to next middleware.");
  next();
};
const deleteMiddleware = (req, res, next) => {
    const id = parseInt(req.params.id);

    if(isNaN(id)){
        res.status(400).json({message:"ID must be a number"});
        
    }
    else next();
};

export default {addQueryMiddleware, deleteMiddleware};
