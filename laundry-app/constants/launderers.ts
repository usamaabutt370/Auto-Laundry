/**
 * Global constant data for launderers (laundromats).
 * Used by the Pick Up & Delivery list and Laundromat Detailed screens.
 */

export type LaundererServiceType = "washAndFold" | "dryCleaning" | "tailoring";

export interface Launderer {
  id: string;
  name: string;
  rating: number;
  /** Image key for list card thumbnail (resolved in app from assets) */
  imageKey: "slide1" | "slide2" | "slide3";
  /** Image key for detail hero (can reuse or use same as list) */
  heroImageKey: "slide1" | "slide2" | "slide3";
  phoneNumber: string;
  /** Short hours for list card, e.g. "9am-9pm" */
  openingHours: string;
  /** Full hours for detail page, e.g. "Monday to Friday : 9am-10pm" */
  openingHoursDetail: string;
  /** Display string, e.g. "10 Miles" */
  distance: string;
  address: string;
  /** Price per pound for wash & fold, e.g. 1.45 */
  pricePerPound: number;
  servicesOffered: LaundererServiceType[];
}

export const LAUNDERERS: Launderer[] = [
  {
    id: "1",
    name: "Thiam's Laundramat",
    rating: 4.5,
    imageKey: "slide1",
    heroImageKey: "slide2",
    phoneNumber: "646-879-09876",
    openingHours: "9am-9pm",
    openingHoursDetail: "Monday to Friday : 9am-10pm",
    distance: "10 Miles",
    address: "1465 5th Avenue, New York, 10035, NY",
    pricePerPound: 1.45,
    servicesOffered: ["washAndFold", "dryCleaning", "tailoring"],
  },
  {
    id: "2",
    name: "Thiam's Laundramat",
    rating: 4.5,
    imageKey: "slide2",
    heroImageKey: "slide3",
    phoneNumber: "646-879-09876",
    openingHours: "9am-9pm",
    openingHoursDetail: "Monday to Friday : 9am-10pm",
    distance: "10 Miles",
    address: "1465 5th Avenue, New York, 10035, NY",
    pricePerPound: 1.45,
    servicesOffered: ["washAndFold", "dryCleaning", "tailoring"],
  },
  {
    id: "3",
    name: "Thiam's Laundramat",
    rating: 4.5,
    imageKey: "slide3",
    heroImageKey: "slide1",
    phoneNumber: "646-879-09876",
    openingHours: "9am-9pm",
    openingHoursDetail: "Monday to Friday : 9am-10pm",
    distance: "10 Miles",
    address: "1465 5th Avenue, New York, 10035, NY",
    pricePerPound: 1.45,
    servicesOffered: ["washAndFold", "dryCleaning", "tailoring"],
  },
];

/** Get launderer by id; returns undefined if not found */
export function getLaundererById(id: string): Launderer | undefined {
  return LAUNDERERS.find((l) => l.id === id);
}
