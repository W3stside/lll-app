/* eslint-disable no-console */
import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import client from "@/lib/mongodb";
import { Collection } from "@/types";
import type { IUser } from "@/types/users";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "PATCH" && req.method !== "PUT") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const body = req.body as IUser & { recordPayment?: boolean };
    const {
      _id,
      shame: [shameOne] = [undefined],
      missedPayments: [missedPayment] = [undefined],
      recordPayment = false,
      ...rest
    } = body;

    const db = client.db("LLL");
    const collection = db.collection<IUser>(Collection.USERS);

    const result = await collection.updateOne(
      { _id: new ObjectId(_id) },
      {
        $set: rest,
        ...(!recordPayment
          ? {
              $addToSet: {
                ...(shameOne !== undefined ? { shame: shameOne } : undefined),
                ...(missedPayment !== undefined
                  ? { missedPayments: missedPayment }
                  : undefined),
              },
            }
          : {
              $pull: {
                missedPayments: {
                  _id: missedPayment?._id,
                  date: missedPayment?.date,
                },
              },
            }),
      },
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ message: "Document not found" });
    } else if (result.acknowledged) {
      res.status(200).json(result);
    } else {
      throw new Error("Error updating document");
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating document" });
  }
};
