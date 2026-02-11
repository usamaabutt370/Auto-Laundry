/**
 * Urdu strings (Urdu script – right-to-left).
 */
export const ur = {
  common: {
    loading: "لوڈ ہو رہا ہے...",
    error: "کچھ غلط ہو گیا",
    modal: "موڈل",
    goToHome: "ہوم اسکرین پر جائیں",
  },

  auth: {
    welcome: {
      title: "خوش آمدید!",
      subtitle:
        "براہ کرم سائن اپ کریں اور ہمیں بتائیں کہ آپ کون ہیں اور آپ کو کون سی سروسز چاہیے۔",
      user: {
        title: "گاہک",
        description: "میں لانڈری اور ڈرائی کلیننگ سروسز تلاش کر رہا/رہی ہوں۔",
      },
      courier: {
        title: "لانڈری سروس فراہم کرنے والا",
        description: "میں لانڈری اور ڈرائی کلیننگ سروسز فراہم کرتا/کرتی ہوں۔",
      },
    },
    entryTitle: "لاگ ان",
    entrySubtitle: "فون لاگ ان اسکرین (پلیس ہولڈر)",
    signIn: "سائن ان",
    login: {
      title: "لانڈری کو ایک نئے انداز میں دیکھیں",
      subtitle: "اپنے اکاؤنٹ میں سائن ان کریں",
      mobileNumber: "موبائل نمبر",
      password: "پاس ورڈ",
      forgotPassword: "پاس ورڈ بھول گئے؟",
      signInButton: "سائن ان",
      orSignInWithSocial: "یا سوشل سے سائن ان کریں",
      noAccount: "اکاؤنٹ نہیں ہے؟",
      signUp: "سائن اپ",
    },
    signUpScreen: {
      title: "سائن اپ",
      subtitle: "2-step verification کے لیے اپنا موبائل نمبر ضرور درج کریں۔",
      firstName: "پہلا نام",
      lastName: "آخری نام",
      mobileNumber: "موبائل نمبر",
      email: "ای میل",
      password: "پاس ورڈ",
      continue: "جاری رکھیں",
      orSignUpWithSocial: "یا سوشل سے سائن اپ کریں",
      haveAccount: "پہلے سے اکاؤنٹ ہے؟",
      signIn: "سائن ان",
    },
    phoneTitle: "فون",
    phoneSubtitle: "فون نمبر لاگ ان (پلیس ہولڈر)",
    otpTitle: "او ٹی پی کی تصدیق کریں",
    otpSubtitle: "او ٹی پی تصدیق (پلیس ہولڈر)",
    otp: {
      title: "تصدیق",
      subtitle: "ہم نے آپ کے فون نمبر کی تصدیق کے لیے ایک کوڈ بھیجا ہے۔",
      continue: "جاری رکھیں",
      didntReceiveCode: "کوڈ موصول نہیں ہوا؟",
      resend: "دوبارہ بھیجیں",
    },
    resetPassword: {
      title: "پاس ورڈ ری سیٹ کریں",
      subtitle:
        "پاس ورڈ ری سیٹ کرنے کے بعد اکاؤنٹ کی تصدیق کے لیے آپ کے موبائل نمبر پر ایک کوڈ بھیجا جائے گا۔",
      newPassword: "نیا پاس ورڈ",
      confirmPassword: "پاس ورڈ کی تصدیق کریں",
      continue: "جاری رکھیں",
      errorPasswordMismatch: "پاس ورڈ مماثل نہیں ہیں",
      errorPasswordTooShort: "پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے",
      successMessage:
        "پاس ورڈ اپڈیٹ ہو گیا۔ جلد ہی آپ کو تصدیقی کوڈ موصول ہوگا۔",
    },
    roleSelectTitle: "کردار منتخب کریں",
    roleSelectSubtitle:
      "انتخاب کریں کہ آپ ایپ کیسے استعمال کریں گے (پلیس ہولڈر)",
    roles: {
      customer: "گاہک",
      partner: "لانڈری پارٹنر",
    } as const,
  },

  tabs: {
    customer: {
      home: "ہوم",
      order: "آرڈر",
      profile: "پروفائل",
      explore: "دریافت",
    },
    partner: {
      orders: "آرڈرز",
    },
  },

  sidebar: {
    recurringOptions: "دہرائی کے اختیارات",
    preferences: "ترجیحات",
    settings: "ترتیبات",
    contactSupport: "سپورٹ سے رابطہ کریں",
    faq: "عمومی سوالات",
    signOut: "سائن آؤٹ",
  },

  customer: {
    home: {
      welcome: "خوش آمدید!",
      subtitle: "گاہک ہوم",
      addressPlaceholder: "1465 5th Avenue APt 5C",
      chooseService: "اپنی سروس منتخب کریں",
      dropOff: "ڈراپ آف",
      pickUpDelivery: "پک اپ / ڈیلیوری",
    },
    explore: {
      title: "دریافت",
      intro: "شروع کرنے کے لیے اس ایپ میں مثال کوڈ شامل ہے۔",
    },
    recurring: {
      title: "دہرائی کے اختیارات",
      weekly: "ہفتہ وار",
      biWeekly: "دو ہفتہ وار",
      threeWeeks: "3 ہفتے",
      monthly: "ماہانہ",
      active: "فعال",
    },
    settings: {
      title: "ترتیبات",
      language: "زبان",
      english: "انگریزی",
      urdu: "اردو",
      notifications: "نوٹیفکیشنز",
      recurringReminder: "دہرائی کے اختیارات کی یاد دہانی",
      reminder6h: "6 گھنٹے",
      reminder12h: "12 گھنٹے",
      reminder24h: "24 گھنٹے",
      mileRadius: "میل رداس",
      mapSearchRadius: "نقشہ تلاش کا رداس",
      mile: "میل",
    },
  },

  partner: {
    dashboardTitle: "پارٹنر ڈیش بورڈ",
    dashboardSubtitle: "آنے والے آرڈرز اور کمائی (پلیس ہولڈر)",
  },

  modal: {
    title: "یہ ایک موڈل ہے",
    linkText: "ہوم اسکرین پر جائیں",
  },

  onboarding: {
    skip: "چھوڑیں",
    slide1: {
      title: "بہترین لانڈری سہولیات تلاش کریں",
      subtitle:
        "ہماری فہرست میں براؤز کریں اور اپنی پسند کا لانڈرومیٹ/ڈرائی کلینر منتخب کریں۔",
      next: "اگلا",
    },
    slide2: {
      title: "پک اپ شیڈول کریں",
      subtitle:
        "آسانی سے پک اپ کا وقت طے کریں، اپنا آرڈر ٹریک کریں، اور راستے میں نوٹیفکیشنز وصول کریں۔",
      next: "اگلا",
    },
    slide3: {
      title: "بروقت ڈیلیوری حاصل کریں",
      subtitle: "آرام سے بیٹھیں اور صاف لانڈری اپنے دروازے پر وصول کریں۔",
      next: "شروع کریں",
    },
  },
  onboardingLast: {
    getStarted: "شروع کریں",
  },
} as const;
