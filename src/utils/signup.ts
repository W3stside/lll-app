import { PHONE_MIN_LENGTH } from "@/constants/signups";
import type { Signup } from "@/types/signups";

export function isValidPlayer(player: Partial<Signup>): player is Signup {
  return (
    player.first_name !== undefined &&
    player.last_name !== undefined &&
    player.phone_number !== undefined &&
    player.phone_number.length >= PHONE_MIN_LENGTH &&
    player.game_id !== undefined
  );
}
