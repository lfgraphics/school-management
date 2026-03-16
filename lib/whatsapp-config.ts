export const whatsappConfig = {
  enabled: process.env.NEXT_PUBLIC_ENABLE_WHATSAPP_INTEGRATION === 'true',
  schoolName: process.env.NEXT_PUBLIC_SCHOOL_NAME || 'Modern Nursery School',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  
  worker: {
    url: process.env.FEEEASE_WORKER_URL || 'http://localhost:4000',
    webhookSecret: process.env.WORKER_WEBHOOK_SECRET || 'replace_with_a_strong_random_secret'
  },

  templates: {
    universal_text: process.env.WHATSAPP_TEMPLATE_UNIVERSAL_TEXT || 'boradcast_text',
    universal_image: process.env.WHATSAPP_TEMPLATE_UNIVERSAL_IMAGE || 'broadcast_image',
    receipt: process.env.WHATSAPP_TEMPLATE_RECEIPT || 'fee_receipt_v1',
    reminder_hindi: process.env.WHATSAPP_TEMPLATE_REMINDER_HINDI || 'reminder_hindi',
    reminder_english: process.env.WHATSAPP_TEMPLATE_REMINDER_ENGLISH || 'reminder_english',
    reminder_urdu: process.env.WHATSAPP_TEMPLATE_REMINDER_URDU || 'reminder_urdu'
  }
};
