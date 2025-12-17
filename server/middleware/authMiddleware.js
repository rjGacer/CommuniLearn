import jwt from "jsonwebtoken";

const JWT_SECRET = "COMMUNILEARN_SECRET_KEY";

export default function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // attach user to request
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
