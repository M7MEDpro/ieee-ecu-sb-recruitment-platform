/**
 * @file branding.ts
 * @brief Authoritative Branding, Palettes, and Links for IEEE ECU Student Branch.
 * @details Strictly excludes LinkedIn as explicitly mandated.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

export const IEEE_BRANDING = {
  branchName: 'IEEE ECU Student Branch',
  university: 'Egyptian Chinese University',
  tagline: 'Inspiring Innovation, Empowering Engineers',
  colors: {
    navy: '#023260',
    navyDark: '#011c38',
    navyLight: '#094b8a',
    red: '#D92525',
    redDark: '#b91c1c',
    teal: '#00a1c0',
    tealDark: '#008ba6',
    gold: '#D4AF37',
    slateDark: '#0f172a',
    bgLight: '#f8fafc',
  },
  links: {
    mainWebsite: 'https://ieee-ecu-sb-website.vercel.app/',
    aboutWebsite: 'https://ieee-ecu-sb-website.vercel.app/about',
    facebook: 'https://www.facebook.com/share/14YhX72rVkL/',
    instagram: 'https://www.instagram.com/ieeeecusb?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==',
    contactEmail: 'ieeesb.ecu@gmail.com',
  },
  assets: {
    logoColor: '/assets/logo/Picture2-removebg-preview.png',
    logoWhite: '/assets/logo/unnameddadawdadfxzffbcvxb (4).png',
    logoClean: '/assets/logo/logo_clean.png',
    heroMain: '/assets/logo/Main.png',
  },
} as const;
