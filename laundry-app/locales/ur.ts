/**
 * Urdu strings (Urdu script – right-to-left).
 */
export const ur = {
  common: {
    loading: 'لوڈ ہو رہا ہے...',
    error: 'کچھ غلط ہو گیا',
    modal: 'موڈل',
    goToHome: 'ہوم اسکرین پر جائیں',
  },

  auth: {
    welcome: {
      title: 'اپنا تجربہ منتخب کریں:',
      subtitle: 'براہ کرم ہمیں اپنے بارے میں تھوڑا بتائیں کہ آپ کون ہیں۔',
      user: { title: 'صارف', description: 'مجھے لانڈری اور ڈرائی کلیننگ سروس چاہیے۔' },
      courier: { title: 'کورئیر', description: 'میں گاہکوں کو لانڈری اٹھانا اور پہنچانا چاہتا/چاہتی ہوں۔' },
    },
    entryTitle: 'لاگ ان',
    entrySubtitle: 'فون لاگ ان اسکرین (پلیس ہولڈر)',
    phoneTitle: 'فون',
    phoneSubtitle: 'فون نمبر لاگ ان (پلیس ہولڈر)',
    otpTitle: 'او ٹی پی کی تصدیق کریں',
    otpSubtitle: 'او ٹی پی تصدیق (پلیس ہولڈر)',
    roleSelectTitle: 'کردار منتخب کریں',
    roleSelectSubtitle: 'انتخاب کریں کہ آپ ایپ کیسے استعمال کریں گے (پلیس ہولڈر)',
    roles: {
      customer: 'گاہک',
      partner: 'لانڈری پارٹنر',
    } as const,
  },

  tabs: {
    customer: {
      home: 'ہوم',
      explore: 'دریافت',
    },
    partner: {
      orders: 'آرڈرز',
    },
  },

  customer: {
    home: {
      welcome: 'خوش آمدید!',
      subtitle: 'گاہک ہوم',
    },
    explore: {
      title: 'دریافت',
      intro: 'شروع کرنے کے لیے اس ایپ میں مثال کوڈ شامل ہے۔',
    },
  },

  partner: {
    dashboardTitle: 'پارٹنر ڈیش بورڈ',
    dashboardSubtitle: 'آنے والے آرڈرز اور کمائی (پلیس ہولڈر)',
  },

  modal: {
    title: 'یہ ایک موڈل ہے',
    linkText: 'ہوم اسکرین پر جائیں',
  },

  onboarding: {
    slide1: {
      title: 'آٹو لانڈری میں خوش آمدید',
      subtitle: 'ہم لانڈری آسان بناتے ہیں۔ چند مراحل میں شروع کریں۔',
      next: 'اگلا',
    },
  },
  onboardingLast: {
    getStarted: 'شروع کریں',
  },
} as const;
