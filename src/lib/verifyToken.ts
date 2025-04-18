import jwt from "jsonwebtoken";

const { JWT_SECRET } = process.env;

if (JWT_SECRET === undefined) {
  throw new Error("JWT_SECRET is not defined");
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET as string);
  } catch {
    return null;
  }
}
