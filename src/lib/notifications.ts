import { NotificationChannel, NotificationDeliveryStatus, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { processPendingNotificationDeliveries } from "@/lib/notification-queue";

type CreateNotificationInput = {
  userId: string;
  type?: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
};

export async function createNotification({
  userId,
  type = NotificationType.SYSTEM,
  title,
  body = null,
  link = null,
}: CreateNotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      link,
      channel: NotificationChannel.IN_APP,
      deliveryStatus: NotificationDeliveryStatus.PENDING,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      notificationSettings: {
        select: {
          emailEnabled: true,
          pushEnabled: true,
        },
      },
      coachProfile: { select: { phone: true } },
      athleteProfile: { select: { phone: true } },
    },
  });

  if (!user) return notification;

  const emailEnabled = user.notificationSettings?.emailEnabled ?? true;
  const pushEnabled = user.notificationSettings?.pushEnabled ?? false;
  const phone = user.coachProfile?.phone ?? user.athleteProfile?.phone ?? null;

  const deliveries = [];

  if (emailEnabled && user.email) {
    deliveries.push({ channel: NotificationChannel.EMAIL });
  }

  if (pushEnabled) {
    deliveries.push({ channel: NotificationChannel.PUSH });
  }

  if (phone && process.env.SMS_ENABLED === "true") {
    deliveries.push({ channel: NotificationChannel.SMS });
  }

  if (deliveries.length > 0) {
    await prisma.notificationDelivery.createMany({
      data: deliveries.map((delivery) => ({
        notificationId: notification.id,
        channel: delivery.channel,
      })),
    });

    // Attempt immediate delivery in the background.
    processPendingNotificationDeliveries().catch((err) => {
      console.error("[notifications] background delivery error", err);
    });
  } else {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { deliveryStatus: NotificationDeliveryStatus.DELIVERED },
    });
  }

  return notification;
}
