/**
 * English strings.
 */
export const en = {
  common: {
    loading: "Loading...",
    error: "Something went wrong",
    modal: "Modal",
    goToHome: "Go to home screen",
  },

  auth: {
    welcome: {
      title: "Welcome !",
      subtitle:
        "Please sign up and tell us a bit more about who you are and what services you are looking for",
      user: {
        title: "Customer",
        description: "I am searching for laundry & dry cleaning services.",
      },
      courier: {
        title: "Laundry Person",
        description: "I am providing laundry & dry cleaning services.",
      },
    },
    entryTitle: "Auth",
    entrySubtitle: "Phone login screen (placeholder)",
    phoneTitle: "Phone",
    phoneSubtitle: "Phone number login (placeholder)",
    otpTitle: "Verify OTP",
    otpSubtitle: "OTP verification (placeholder)",
    roleSelectTitle: "Choose role",
    roleSelectSubtitle: "Select how you want to use the app (placeholder)",
    roles: {
      customer: "Customer",
      partner: "Laundry Partner",
    } as const,
  },

  tabs: {
    customer: {
      home: "Home",
      explore: "Explore",
    },
    partner: {
      orders: "Orders",
    },
  },

  customer: {
    home: {
      welcome: "Welcome!",
      subtitle: "Customer home",
    },
    explore: {
      title: "Explore",
      intro: "This app includes example code to help you get started.",
    },
  },

  partner: {
    dashboardTitle: "Partner dashboard",
    dashboardSubtitle: "Incoming orders and earnings (placeholder)",
  },

  modal: {
    title: "This is a modal",
    linkText: "Go to home screen",
  },

  onboarding: {
    skip: "Skip",
    slide1: {
      title: "Find top laundry facilities",
      subtitle:
        "Browse through our listing and select the Laundromat/ Dry Cleaner of your choice.",
      next: "Next",
    },
    slide2: {
      title: "Schedule a pick up",
      subtitle:
        "Easily set a pick up time, track your order, and receive notifications along the way",
      next: "Next",
    },
    slide3: {
      title: "Get on-time delivery",
      subtitle: "Sit back and conveniently receive clean laundry at your door.",
      next: "Get started",
    },
  },
  onboardingLast: {
    getStarted: "Get started",
  },
} as const;
