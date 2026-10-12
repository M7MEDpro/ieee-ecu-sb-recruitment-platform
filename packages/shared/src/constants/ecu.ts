/**
 * @file ecu.ts
 * @brief Official Faculties and Academic Levels for the Egyptian Chinese University (ECU).
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

export const ECU_FACULTIES = [
  { id: 'COMPUTERS_AI', nameEn: 'Faculty of Computers & Information Systems', nameAr: 'كلية الحاسبات ونظم المعلومات' },
  { id: 'ENGINEERING', nameEn: 'Faculty of Engineering & Technology', nameAr: 'كلية الهندسة والتكنولوجيا' },
  { id: 'PHARMACY', nameEn: 'Faculty of Pharmacy & Drug Technology', nameAr: 'كلية الصيدلة وتكنولوجيا الدواء' },
  { id: 'PHYSICAL_THERAPY', nameEn: 'Faculty of Physical Therapy', nameAr: 'كلية العلاج الطبيعي' },
  { id: 'ECONOMICS_TRADE', nameEn: 'Faculty of Economics & International Trade', nameAr: 'كلية الاقتصاد والتجارة الدولية' },
  { id: 'ARTS_DESIGN', nameEn: 'Faculty of Arts & Design', nameAr: 'كلية الفنون والتصميم' },
  { id: 'VETERINARY_MEDICINE', nameEn: 'Faculty of Veterinary Medicine', nameAr: 'كلية الطب البيطري' },
  { id: 'MASS_COMMUNICATION', nameEn: 'Faculty of Mass Communication', nameAr: 'كلية الإعلام والاتصال الجماهيري' },
  { id: 'LITERARY_STUDIES', nameEn: 'Faculty of Literary Studies', nameAr: 'كلية الدراسات الأدبية' },
  { id: 'LAW', nameEn: 'Faculty of Law', nameAr: 'كلية القانون' },
  { id: 'NURSING', nameEn: 'Faculty of Nursing', nameAr: 'كلية التمريض' },
  { id: 'HUMANITIES_GIS', nameEn: 'Faculty of Humanities (GIS & Surveying)', nameAr: 'كلية العلوم الإنسانية (المساحة ونظم المعلومات الجغرافية)' },
] as const;

export const ACADEMIC_LEVELS = [
  { id: 'LEVEL_1', label: 'Level 1' },
  { id: 'LEVEL_2', label: 'Level 2' },
  { id: 'LEVEL_3', label: 'Level 3' },
  { id: 'LEVEL_4', label: 'Level 4' },
  { id: 'LEVEL_5', label: 'Level 5' },
  { id: 'LEVEL_6', label: 'Level 6' },
  { id: 'LEVEL_7', label: 'Level 7' },
] as const;
