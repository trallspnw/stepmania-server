/**
 * Whether anyone can create a player account without an invite. Admins turn
 * it on and off in the admin console's System tab; it's off until set.
 */
import { getSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settingKeys";

export async function isOpenSignUpEnabled() {
  return (await getSetting(SETTING_KEYS.OPEN_SIGN_UP)) === "true";
}
