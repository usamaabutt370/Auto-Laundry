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
      partner: "لانڈرر",
      launderer: "لانڈرر",
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
      profile: "پروفائل",
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
    pickupServices: {
      title: "پک اپ سروسز",
      today: "آج",
      chooseServices: "اپنی سروس(ز) منتخب کریں:",
      washAndFold: "دھونا اور تہہ کرنا",
      dryCleaning: "ڈرائی کلیننگ",
      tailoring: "درزی",
      confirm: "تصدیق",
      months:
        "جنوری,فروری,مارچ,اپریل,مئی,جون,جولائی,اگست,ستمبر,اکتوبر,نومبر,دسمبر",
    },
    dryCleanOptions: {
      title: "ڈرائی کلیننگ",
      prompt: "اپنا پسندیدہ اختیار منتخب کریں :",
      sortedByCleaner: "کلینر کے ذریعہ ترتیب دیا گیا",
      itemizedByUser: "صارف کے ذریعہ تفصیلات",
    },
    dryCleanItemize: {
      title: "ڈرائی کلیننگ - آئٹمائز",
      continue: "جاری رکھیں",
    },
    bags: {
      title: "بیگز",
      heading: "واش اینڈ فولڈ کے لیے بیگز کی تعداد درج کریں",
      numberOfBags: "بیگز کی تعداد :",
      hint: "براہ کرم ہر بیگ کے لیے زیادہ سے زیادہ تفصیل دیں۔ حتمی وزن/قیمت کلینر کی طرف سے رسپشن پر اپڈیٹ کی جائے گی۔",
      continue: "جاری رکھیں",
    },
    laundryBagDetail: {
      titlePrefix: "دھونا اور تہہ کرنا - بیگ #",
      weight: "وزن",
      estimatedWeight: "تخمینی وزن :",
      items: "Items",
      numberOfItems: "ایتمز کی تعداد :",
      preferences: "ترجیحات",
      noPreferencesAvailable: "کوئی ترجیحات دستیاب نہیں",
      instructions: "ہدایات",
      instructionsPlaceholder: "اپنی اشیاء کی تفصیلات شامل کریں",
      save: "حفظ",
    },
    schedulePickup: {
      title: "پک اپ شیڈول",
      today: "آج",
      time: "وقت",
      timeSlotPlaceholder: "11am - 12pm",
      tomorrow: "کل",
      instructions: "ہدایات",
      instructionsPlaceholder: "اپنی اشیاء کی تفصیلات شامل کریں",
      confirm: "تصدیق",
    },
    scheduleDelivery: {
      title: "ڈیلیوری شیڈول",
      today: "آج",
      time: "وقت",
      timeSlotPlaceholder: "11am - 12pm",
      tomorrow: "کل",
      instructions: "ہدایات",
      instructionsPlaceholder: "اپنی اشیاء کی تفصیلات شامل کریں",
      confirm: "تصدیق",
    },
    orderSummary: {
      title: "آرڈر خلاصہ",
      service: "سروس",
      orderNumber: "آرڈر نمبر",
      estimatedTotal: "تخمینی کل",
      submitOrder: "آرڈر جمع کرائیں",
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
    contactSupport: {
      title: "سپورٹ سے رابطہ کریں",
      question: "کوئی مسئلہ؟ تجاویز؟",
      support: "سپورٹ",
      feedback: "رائے",
      placeholder: "اپنا مسئلہ یا تجویز بیان کریں۔",
      orEmailUs: "یا ہمیں ای میل کریں :",
      email: "info@getbubblesapp.com",
      send: "بھیجیں",
    },
    faq: {
      title: "عمومی سوالات",
      items: [
        {
          question: "Bubble میں کیسے نیویگیٹ کریں؟",
          answer:
            "Nulla porttitor accumsan tincidunt. Pellentesque in ipsum id orci porta dapibus. Curabitur non nulla sit amet nisl tempus convallis quis ac lectus.",
        },
        {
          question: "کیا میں اپنی ٹیم میں نیا کورئیر شامل کر سکتا ہوں؟",
          answer:
            "Vestibulum ac diam sit amet quam vehicula elementum sed sit amet dui. Donec rutrum congue leo eget malesuada.",
        },
        {
          question: "زبان کہاں تبدیل کریں؟",
          answer:
            "سائیڈبار سے ترتیبات پر جائیں، پھر زبان کے سیکشن میں اپنی پسندیدہ زبان منتخب کریں۔",
        },
        {
          question: "کیا میں اپنی ٹیم میں نیا ممبر شامل کر سکتا ہوں؟",
          answer:
            "آپ اپنے پروفائل یا ترتیبات سے نئے ٹیم ممبرز شامل کر سکتے ہیں۔ ٹیم مینجمنٹ میں مدد کے لیے سپورٹ سے رابطہ کریں۔",
        },
      ],
    },
  },

  partner: {
    dashboardTitle: "لانڈرر ڈیش بورڈ",
    dashboardSubtitle: "آنے والے آرڈرز اور کمائی (پلیس ہولڈر)",
    useAppAsLaunderer: "ایپ بطور لانڈرر استعمال کریں",
    onboarding: {
      step1Title: "کاروباری تفصیلات",
      step1Subtitle: "اپنے لانڈری کاروبار کے بارے میں بتائیں۔",
      step2Title: "سروسز",
      step2Subtitle: "آپ کون سی سروسز پیش کرتے ہیں؟",
      next: "اگلا",
      complete: "مکمل کریں",
      back: "واپس",
    },
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
