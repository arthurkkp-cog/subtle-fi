import { cookies } from "next/headers";
import { getSession, getUserById } from "@/lib/db";

export async function getCurrentUser() {
  try {
    const sessionToken = cookies().get("session-token");
    if (!sessionToken?.value) {
      return null;
    }

    const session = await getSession(sessionToken.value);
    if (!session) {
      return null;
    }

    const user = await getUserById(session.userId);
    return user;
  } catch (error) {
    console.log(error);
    return null;
  }
}
