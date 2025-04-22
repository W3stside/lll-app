import { parse, serialize } from "cookie";
import type { ServerResponse } from "http";
import jwt from "jsonwebtoken";
import type { GetServerSidePropsContext } from "next";

import { NAVLINKS_MAP } from "@/constants/links";
import type { IUser } from "@/types/users";

const ACCESS_COOKIE_NAME = "token";
const REFRESH_COOKIE_NAME = "refreshToken";

const { JWT_SECRET, JWT_REFRESH_SECRET } = process.env;
if (JWT_SECRET === undefined || JWT_REFRESH_SECRET === undefined) {
  throw new Error("JWT environment variables are not defined");
}

export { JWT_REFRESH_SECRET, JWT_SECRET };

export const verifyToken = <T>(
  token: string,
  secret: string,
  refreshSecret?: string,
): jwt.JwtPayload & T => {
  try {
    return jwt.verify(token, secret) as jwt.JwtPayload & T;
  } catch (error) {
    // Try refresh token if access token is invalid/expired
    if (refreshSecret !== undefined) {
      try {
        return jwt.verify(token, refreshSecret) as jwt.JwtPayload & T;
      } catch (err) {
        throw new Error("Invalid token");
      }
    }
    throw error;
  }
};

export const generateAccessToken = (payload: Buffer | object | string) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
};

export const generateRefreshToken = (payload: Buffer | object | string) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "30d" });
};

export const refreshAndSetJwtTokens = (
  payload: Buffer | object | string,
  res: ServerResponse,
) => {
  const newAccessToken = generateRefreshToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  // Set new access token cookie
  res.setHeader("Set-Cookie", [
    serialize(ACCESS_COOKIE_NAME, newAccessToken, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 15, // 15 minutes
    }),
    serialize(REFRESH_COOKIE_NAME, newRefreshToken, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    }),
  ]);
};

export function getUserFromServerSideRequest(ctx: GetServerSidePropsContext) {
  const { req, res } = ctx;
  const cookies = parse(req.headers.cookie ?? "");
  const accessToken = cookies[ACCESS_COOKIE_NAME];
  const refreshToken = cookies[REFRESH_COOKIE_NAME];

  let user: IUser | null = null;

  try {
    if (accessToken === undefined) throw new Error("No access token");
    // Try access token first
    user = verifyToken(accessToken, JWT_SECRET as string);
  } catch (err) {
    // Try refresh token if access token is invalid/expired
    if (refreshToken !== undefined) {
      try {
        const {
          iat: _,
          exp: _exp,
          ...payload
        } = verifyToken<IUser>(refreshToken, JWT_REFRESH_SECRET as string);

        refreshAndSetJwtTokens(payload, res);

        user = payload;
      } catch (refreshErr) {
        // Refresh token invalid — user stays unauthenticated
      }
    }
  }

  if (user === null) {
    return {
      user: null,
      redirect: {
        destination: NAVLINKS_MAP.LOGIN,
        permanent: false,
      },
    };
  }

  return { user };
}
