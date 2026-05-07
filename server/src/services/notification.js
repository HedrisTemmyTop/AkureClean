let Expo;
let expo;

const getExpo = async () => {
  if (!expo) {
    const expoModule = await import("expo-server-sdk");
    Expo = expoModule.Expo;
    expo = new Expo();
  }
  return { Expo, expo };
};

exports.sendPushNotification = async (expoPushToken, title, body) => {
  const { Expo, expo } = await getExpo();

  if (!Expo.isExpoPushToken(expoPushToken)) {
    console.error(`Push token ${expoPushToken} is not a valid Expo push token`);
    return;
  }

  const messages = [
    {
      to: expoPushToken,
      sound: "default",
      title,
      body,
      data: { withSome: "data" },
    },
  ];

  try {
    const ticketChunk = await expo.sendPushNotificationsAsync(messages);
    return ticketChunk;
  } catch (error) {
    console.error(error);
  }
};

exports.sendBulkNotification = async (tokens, title, body) => {
  const { Expo, expo } = await getExpo();

  const validTokens = tokens.filter((token) => Expo.isExpoPushToken(token));

  const messages = validTokens.map((token) => ({
    to: token,
    sound: "default",
    title,
    body,
  }));

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (let chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error(error);
    }
  }

  return tickets;
};
