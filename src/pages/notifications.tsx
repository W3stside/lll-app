import type { GetServerSideProps } from "next";

import {
  type INotificationsInbox,
  NotificationsInbox,
} from "@/components/Notifications/NotificationsInbox";
import { withServerSideProps } from "@/hoc/withServerSideProps";
import { getActiveNotifications, markAllNotificationsRead } from "@/lib/inbox";

export const getServerSideProps: GetServerSideProps = withServerSideProps(
  // Same HOC typing issue as the other pages
  // @ts-expect-error error in the custom HOC - doesn't break.
  async (context) => {
    const {
      parentProps: { user: fullUser },
    } = context;
    const userId = fullUser._id.toString();

    try {
      // Read before marking, so this render can still highlight what was new
      const notifications = await getActiveNotifications(userId);

      if (notifications.some(({ readAt }) => readAt === null)) {
        await markAllNotificationsRead(userId);
      }

      return {
        props: {
          notifications: JSON.parse(JSON.stringify(notifications)) as string,
        },
      };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return { props: { notifications: [] } };
    }
  },
);

export default function Notifications({ notifications }: INotificationsInbox) {
  return <NotificationsInbox notifications={notifications} />;
}
