import { Inter, Poppins } from "next/font/google";

/** Body copy */
export const fontBody = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/** Headlines (bold weights via utility classes) */
export const fontHeading = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const fontVariables = `${fontBody.variable} ${fontHeading.variable}`;
