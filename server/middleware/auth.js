import jwt from "jsonwebtoken";

const auth = (req, res, next) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user payload (including userId and role) to the request
    next();
  } catch (error) {
    res.status(401).send({
      success: false,
      message: "Authentication failed",
      error: error.message,
    });
  }
};

export default auth;
