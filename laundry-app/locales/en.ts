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
    signIn: "Sign in",
    login: {
      heading: "Sign In",
      title: "Experience Laundry, Differently",
      subtitle: "Sign in to your account",
      mobileNumber: "Mobile Number",
      password: "Password",
      forgotPassword: "Forgot Password?",
      signInButton: "Sign In",
      orSignInWithSocial: "Or, Sign in with social",
      noAccount: "Don't have an account?",
      signUp: "SIGN UP",
    },
    signUpScreen: {
      title: "Sign Up",
      subtitle:
        "Make sure to enter your mobile number to enable 2-step verification.",
      firstName: "First Name",
      lastName: "Last Name",
      mobileNumber: "Mobile Number",
      email: "Email",
      password: "Password",
      continue: "Continue",
      orSignUpWithSocial: "Or, Sign up with social",
      haveAccount: "Have an account?",
      signIn: "SIGN IN",
    },
    phoneTitle: "Phone",
    phoneSubtitle: "Phone number login (placeholder)",
    otpTitle: "Verify OTP",
    otpSubtitle: "OTP verification (placeholder)",
    otp: {
      title: "Verification",
      subtitle: "We've texted you with a code to verify your phone number",
      continue: "Continue",
      didntReceiveCode: "Didn't receive a code?",
      resend: "RESEND",
    },
    resetPassword: {
      title: "Reset Password",
      subtitle:
        "After you've reset your password you will receive a code on your mobile number to confirm the account",
      newPassword: "New Password",
      confirmPassword: "Confirm Password",
      continue: "Continue",
      errorPasswordMismatch: "Passwords do not match",
      errorPasswordTooShort: "Password must be at least 6 characters",
      successMessage:
        "Password updated. You will receive a verification code shortly.",
    },
    roleSelectTitle: "Choose role",
    roleSelectSubtitle: "Select how you want to use the app (placeholder)",
    roles: {
      customer: "Customer",
      partner: "Launderer",
      launderer: "Launderer",
    } as const,
  },

  tabs: {
    customer: {
      home: "Home",
      order: "Order",
      profile: "Profile",
      explore: "Explore",
    },
    partner: {
      orders: "Orders",
      profile: "Profile",
    },
  },

  sidebar: {
    recurringOptions: "Recurring options",
    preferences: "Preferences",
    settings: "Settings",
    contactSupport: "Contact support",
    faq: "FAQ",
    signOut: "Sign Out",
  },

  customer: {
    home: {
      welcome: "Welcome!",
      subtitle: "Customer home",
      addressPlaceholder: "1465 5th Avenue APt 5C",
      chooseService: "Choose your service",
      dropOff: "Drop off",
      pickUpDelivery: "Pick up / Delivery",
    },
    pickupServices: {
      title: "Pickup Services",
      today: "Today",
      chooseServices: "Choose your Service(s):",
      washAndFold: "Wash & Fold",
      dryCleaning: "Dry Cleaning",
      tailoring: "Tailoring",
      confirm: "Confirm",
      months: "January,February,March,April,May,June,July,August,September,October,November,December",
    },
    dryCleanOptions: {
      title: "Dry Cleaning",
      prompt: "Choose your preferred option :",
      sortedByCleaner: "Sorted by cleaner",
      itemizedByUser: "Itemized by User",
    },
    bags: {
      title: "Bags",
      heading: "Enter number of bags to Wash & Fold",
      numberOfBags: "Number of bags :",
      hint: "Please provide as much detail as possible for each bag. The final weight/price will be updated by the cleaner at reception.",
      continue: "Continue",
    },
    laundryBagDetail: {
      titlePrefix: "Wash & Fold - Bag #",
      weight: "Weight",
      estimatedWeight: "Estimated weight :",
      items: "Items",
      numberOfItems: "Number of Items :",
      preferences: "Preferences",
      noPreferencesAvailable: "No Preferences Available",
      instructions: "Instructions",
      instructionsPlaceholder: "Add Specific details on your items",
      save: "Save",
    },
    schedulePickup: {
      title: "Pick up Schedule",
      today: "Today",
      time: "Time",
      timeSlotPlaceholder: "11am - 12pm",
      tomorrow: "Tomorrow",
      instructions: "Instructions",
      instructionsPlaceholder: "Add Specific details on your items",
      confirm: "Confirm",
    },
    explore: {
      title: "Explore",
      intro: "This app includes example code to help you get started.",
    },
    recurring: {
      title: "Recurring Options",
      weekly: "Weekly",
      biWeekly: "Bi - Weekly",
      threeWeeks: "3 Weeks",
      monthly: "Monthly",
      active: "Active",
    },
    settings: {
      title: "Settings",
      language: "Language",
      english: "English",
      urdu: "Urdu",
      notifications: "Notifications",
      recurringReminder: "Recurring Options Reminder",
      reminder6h: "6 Hours",
      reminder12h: "12 Hours",
      reminder24h: "24 Hours",
      mileRadius: "Mile Radius",
      mapSearchRadius: "Map Search Radius",
      mile: "mi",
    },
    contactSupport: {
      title: "Contact Support",
      question: "Any Issue? Suggestions?",
      support: "Support",
      feedback: "Feedback",
      placeholder: "Describe your problem or suggestion.",
      orEmailUs: "Or email us at :",
      email: "info@getbubblesapp.com",
      send: "Send",
    },
    faq: {
      title: "FAQ",
      items: [
        {
          question: "How to Navigate in Bubble?",
          answer:
            "Nulla porttitor accumsan tincidunt. Pellentesque in ipsum id orci porta dapibus. Curabitur non nulla sit amet nisl tempus convallis quis ac lectus. Mauris blandit aliquet elit, eget tincidunt nibh pulvinar a. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.",
        },
        {
          question: "Can I add a new Courier to my team?",
          answer:
            "Vestibulum ac diam sit amet quam vehicula elementum sed sit amet dui. Donec rutrum congue leo eget malesuada. Cras ultricies ligula sed magna dictum porta.",
        },
        {
          question: "Where to change the language?",
          answer:
            "Go to Settings from the sidebar, then select your preferred language under the Language section.",
        },
        {
          question: "Can I add a new member to my team?",
          answer:
            "You can add new team members from your profile or settings. Contact support if you need assistance with team management.",
        },
      ],
    },
  },

  partner: {
    dashboardTitle: "Launderer dashboard",
    dashboardSubtitle: "Incoming orders and earnings (placeholder)",
    useAppAsLaunderer: "Use app as launderer",
    onboarding: {
      step1Title: "Business details",
      step1Subtitle: "Tell us about your laundry business.",
      step2Title: "Services",
      step2Subtitle: "What services do you offer?",
      next: "Next",
      complete: "Complete",
      back: "Back",
    },
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
