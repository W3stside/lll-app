import type { IGame } from "@/types/signups";

export const MAX_SIGNUPS = 16;
export const MAX_RESERVES = 6;
export const PHONE_MIN_LENGTH = 9;
export const AVAILABLE_GAMES: Record<string, IGame[]> = {
  WEDNESDAY: [
    {
      id: 1,
      time: "19:00",
      location: "Playarena Alcantara",
      address: "R. Jau 11, 1300-002 Lisboa",
      mapUrl: "https://g.co/kgs/PLtnUyA",
      speed: "faster",
    },
    {
      id: 2,
      time: "20:00",
      location: "Playarena Alcantara",
      address: "R. Jau 11, 1300-002 Lisboa",
      mapUrl: "https://g.co/kgs/PLtnUyA",
      speed: "slower",
    },
  ],
  FRIDAY: [
    {
      id: 3,
      time: "20:00",
      location: "Playarena Alcantara",
      address: "R. Jau 11, 1300-002 Lisboa",
      mapUrl: "https://g.co/kgs/PLtnUyA",
      speed: "mixed",
    },
  ],
  SUNDAY: [
    {
      id: 4,
      time: "11:00",
      location: "Tecnico Rugby Olaias",
      address: "Av. Eng. Arantes e Oliveira 8, 1900-222 Lisboa",
      mapUrl: "https://g.co/kgs/R44Eak8",
      speed: "faster",
    },
    {
      id: 5,
      time: "12:00",
      location: "Tecnico Rugby Olaias",
      address: "Av. Eng. Arantes e Oliveira 8, 1900-222 Lisboa",
      mapUrl: "https://g.co/kgs/R44Eak8",
      speed: "slower",
    },
  ],
};
