const methods = [
	{ id: 'Algerian', name: 'Algerian Ministry of Religous Affairs', params: { fajr: 18, isha: 17 }, methodOffsets: {} },
	{ id: 'Egypt', name: 'Egyptian General Authority of Survey', params: { fajr: 19.5, isha: 17.5 }, methodOffsets: {} },
	{ id: 'FranceAngle18', name: 'France - 18° Angle', params: { fajr: 18, isha: 18 }, methodOffsets: {} },
	{ id: 'FranceUOIFAngle12', name: 'France UOIF - 12° Angle', params: { fajr: 12, isha: 12 }, methodOffsets: {} },
	{ id: 'ISNA', name: 'Islamic Society of North America (ISNA)', params: { fajr: 15, isha: 15 }, methodOffsets: {} },
	{ id: 'JAKIM', name: 'Jabatan Kemajuan Islam Malaysia', params: { fajr: 20, isha: 18 }, methodOffsets: {} },
	{ id: 'KEMENAG', name: 'Kementrian Agama Indonesia', params: { fajr: 20, isha: 18 }, methodOffsets: {} },
	{ id: 'Kuwait', name: 'Kuwait', params: { fajr: 18, isha: 17.5 }, methodOffsets: {} },
	{ id: 'UIPTL', name: 'London Unified Islamic Prayer Timetable', params: { fajr: 12, isha: 12 }, methodOffsets: {} },
	{ id: 'MUIS', name: 'Majlis Ugama Islam Singapura', params: { fajr: 20, isha: 18 }, methodOffsets: {} },
	{ id: 'MoonSightingCommittee', name: 'Moon Sighting Committee', params: { fajr: 18, isha: 18 }, methodOffsets: { dhuhr: 5, maghrib: 3 } },
	{ id: 'MWL', name: 'Muslim World League', params: { fajr: 18, isha: 17 }, methodOffsets: {} },
	{ id: 'Qatar', name: 'Qatar', params: { fajr: 18, isha: '90 min' }, methodOffsets: {} },
	{ id: 'Karachi', name: 'University of Islamic Sciences, Karachi', params: { fajr: 18, isha: 18 }, methodOffsets: {} },
	{ id: 'Makkah', name: 'Umm Al-Qura University, Makkah', params: { fajr: 18.5, isha: '90 min' }, methodOffsets: {} },
	{ id: 'Dubai', name: 'UAE / Dubai', params: { fajr: 18.2, isha: 18.2 }, methodOffsets: {} },
	{ id: 'Tunusian', name: 'Tunisian Ministry of Religous Affairs', params: { fajr: 18, isha: 18 }, methodOffsets: {} },
	{ id: 'TurkiyeDiyanet', name: 'Türkiye Diyanet İşleri Baskanlığı', params: { fajr: 18, isha: 17 }, methodOffsets: { sunrise: -7, fajr: -1, dhuhr: 5, asr: 5, maghrib: 8, isha: 1 } },
	{ id: 'EUDiyanet', name: 'Turkish Diyanet Offsets with 15° Angles', params: { fajr: 15, isha: 15 }, methodOffsets: { imsak: -1, sunrise: -9, dhuhr: 5, asr: 5, maghrib: 7, isha: -1 } },
	{ id: 'Tehran', name: 'University of Tehran', params: { fajr: 17.7, isha: 14, maghrib: 5.5, midnight: 'Jafari' }, methodOffsets: {} }
];

const calculationMethods = methods.reduce((acc, method) => {
	acc[method.id] = {
		name: method.name,
		params: method.params,
		methodOffsets: method.methodOffsets
	};
	return acc;
}, {});

const adhanAudios = [
	{ id: 1, name: 'Bosnian Style by Eldin Huseinbegovic (3:05)', isFajrAdhan: false, isAdhan: true },
	{ id: 2, name: 'Dubai Style by Abdulrahman Al-Hindi (2:25)', isFajrAdhan: false, isAdhan: true },
	{ id: 3, name: 'Egyptian Style (3:25)', isFajrAdhan: false, isAdhan: true },
	{ id: 5, name: 'Makkah Al-Mukarramah Style (3:44)', isFajrAdhan: false, isAdhan: true },
	{ id: 6, name: 'Masjid Al-Aqsa Style (4:07)', isFajrAdhan: false, isAdhan: true },
	{ id: 7, name: 'Mishary Al-Afasy (4:17)', isFajrAdhan: false, isAdhan: true },
	{ id: 8, name: 'Ottoman Style by Shaykh Nazım (2:38)', isFajrAdhan: false, isAdhan: true },
	{ id: 9, name: 'Turkish Style by Remzi Er (4:08)', isFajrAdhan: false, isAdhan: true },
	{ id: 11, name: 'Mishary Al-Afasy (3:24)', isFajrAdhan: true, isAdhan: false },
	{ id: 12, name: 'Shaykh Surayhi (4:54)', isFajrAdhan: true, isAdhan: false },
	{ id: 13, name: 'Shaykh Ali Ahmed Mullah (4:35)', isFajrAdhan: true, isAdhan: false },
	{ id: 14, name: 'Madinah Style by Muhammad Marwan Qassas (4:10)', isFajrAdhan: false, isAdhan: true },
	{ id: 15, name: 'Madinah Style by Muhammad Marwan Qassas (5:03)', isFajrAdhan: true, isAdhan: false },
	{ id: 101, name: 'Bismillahirrahmanirrahim (0:05)', isFajrAdhan: true, isAdhan: true },
	{ id: 102, name: 'Soft Beep Sound (0:01)', isFajrAdhan: true, isAdhan: true },
];

const languages = [
	{ code: 'ar', name: 'العربية' },
	{ code: 'id', name: 'Bahasa Indonesia' },
	{ code: 'ms', name: 'Bahasa Melayu' },
	{ code: 'de', name: 'Deutsch' },
	{ code: 'en', name: 'English' },
	{ code: 'es', name: 'español' },
	{ code: 'fr', name: 'Français' },
	{ code: 'nl', name: 'Nederlands' },
	{ code: 'it', name: 'italiano' },
	{ code: 'pl', name: 'polski' },
	{ code: 'pt', name: 'Portuguese' },
	{ code: 'sv', name: 'svenska' },
	{ code: 'ru', name: 'русский' },
	{ code: 'vi', name: 'Tiếng Việt' },
	{ code: 'tr', name: 'Türkçe' },
	{ code: 'uk', name: 'українська' },
	{ code: 'fa', name: 'فارسی' },
	{ code: 'hi', name: 'हिन्दी' },
	{ code: 'bn', name: 'বাংলা' },
	{ code: 'ta', name: 'தமிழ்' },
	{ code: 'th', name: 'ไทย' },
	{ code: 'ko', name: '한국어' },
	{ code: 'ja', name: '日本' }
]


const imsakDefaultOffset = -10;
const duhaDefaultOffset = 15;
const duhaendDefaultOffset = -10; 