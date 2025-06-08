import { v4 } from "uuid";

import { sendBotNotification } from "@/lib/bot/sendBotMessage";
import type { IGame, IUserSafe } from "@/types";

if (process.env.WHATSAPP_BOT_CHANNEL_ID === undefined) {
  throw new Error("Missing WhatsApp Bot Channel ID");
}

export const sendBumpedMessage = async (user: IUserSafe, game: IGame) =>
  await sendBotNotification({
    id: v4(),
    channel: "NOTIFICATION_CHANNEL_WHATSAPP",
    recipients: [process.env.WHATSAPP_BOT_CHANNEL_ID as string],
    whatsapp_payload: {
      text: `
    Hi 👋 ${user.first_name} ${user.last_name} [@${user.phone_number}] 
    
    Sorry but you were bumped from the ladies game ${game.game_id} - remember that ladies get priority in these games.
    
    When: ${game.day} @ ${game.time} 
    Where: ${game.location}
    Address: ${game.address}`,
      mentions: [user.phone_number],
    },
  });

export const sendQueueChangeMessage = async (
  user: IUserSafe,
  cancelledUser: IUserSafe,
  game: IGame,
) =>
  await sendBotNotification({
    id: v4(),
    channel: "NOTIFICATION_CHANNEL_WHATSAPP",
    recipients: [process.env.WHATSAPP_BOT_CHANNEL_ID as string],
    whatsapp_payload: {
      text: `
Hi 👋 ${user.first_name} ${user.last_name} [@${user.phone_number}] 

You are confirmed for game ${game.game_id}!

When: ${game.day} @ ${game.time} 
Where: ${game.location}
Address: ${game.address}

Player who cancelled: ${cancelledUser.first_name} ${cancelledUser.last_name} [@${cancelledUser.phone_number}]

Have fun! 🎉`,
      mentions: [user.phone_number, cancelledUser.phone_number],
    },
  });

export const sendGameCancelledMessage = async (
  userData: Record<string, string>,
  result: IGame,
) =>
  await sendBotNotification({
    id: v4(),
    channel: "NOTIFICATION_CHANNEL_WHATSAPP",
    recipients: [process.env.WHATSAPP_BOT_CHANNEL_ID as string],
    whatsapp_payload: {
      text: `
Hi 👋
${Object.entries(userData)
  .map(
    ([name, phone]) => `
${name} [@${phone}]`,
  )
  .join("\r\n")}
      
Unfortunately, the game scheduled for ${result.day} at ${result.time} has been cancelled Please reach out to an admin in the group for more info.

When: ${result.day} @ ${result.time} 
Where: ${result.location}
Address: ${result.address}

See you next time!`,
      mentions: Object.values(userData),
    },
  });
