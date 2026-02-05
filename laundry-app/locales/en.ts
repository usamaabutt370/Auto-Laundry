/**
 * English strings.
 */
export const en = {
  common: {
    loading: 'Loading...',
    error: 'Something went wrong',
    modal: 'Modal',
    goToHome: 'Go to home screen',
  },

  auth: {
    entryTitle: 'Auth',
    entrySubtitle: 'Phone login screen (placeholder)',
    phoneTitle: 'Phone',
    phoneSubtitle: 'Phone number login (placeholder)',
    otpTitle: 'Verify OTP',
    otpSubtitle: 'OTP verification (placeholder)',
    roleSelectTitle: 'Choose role',
    roleSelectSubtitle: 'Select how you want to use the app (placeholder)',
    roles: {
      customer: 'Customer',
      partner: 'Laundry Partner',
    } as const,
  },

  tabs: {
    customer: {
      home: 'Home',
      explore: 'Explore',
    },
    partner: {
      orders: 'Orders',
    },
  },

  customer: {
    home: {
      welcome: 'Welcome!',
      subtitle: 'Customer home',
    },
    explore: {
      title: 'Explore',
      intro: 'This app includes example code to help you get started.',
    },
  },

  partner: {
    dashboardTitle: 'Partner dashboard',
    dashboardSubtitle: 'Incoming orders and earnings (placeholder)',
  },

  modal: {
    title: 'This is a modal',
    linkText: 'Go to home screen',
  },
} as const;
