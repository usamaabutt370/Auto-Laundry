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
    phoneTitle: "فون",
    phoneSubtitle: "فون نمبر لاگ ان (پلیس ہولڈر)",
    otpTitle: "او ٹی پی کی تصدیق کریں",
    otpSubtitle: "او ٹی پی تصدیق (پلیس ہولڈر)",
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
      explore: "دریافت",
    },
    partner: {
      orders: "آرڈرز",
    },
  },

  customer: {
    home: {
      welcome: "خوش آمدید!",
      subtitle: "گاہک ہوم",
    },
    explore: {
      title: "دریافت",
      intro: "شروع کرنے کے لیے اس ایپ میں مثال کوڈ شامل ہے۔",
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
