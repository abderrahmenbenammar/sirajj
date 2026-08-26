export interface Course {
  id: string;
  title: string;
  titleEn: string;
  instructor: string;
  instructorEn: string;
  description: string;
  descriptionEn: string;
  image: string;
  level: string;
  levelEn: string;
  duration: string;
  lessons: number;
  category: string;
  categoryEn: string;
  curriculum: CurriculumItem[];
  objectives: string[];
  objectivesEn: string[];
  references: string[];
  progress?: number;
  completed?: boolean;
}

export interface CurriculumItem {
  id: string;
  title: string;
  titleEn: string;
  duration: string;
  type: "video" | "reading" | "quiz";
  videoUrl?: string;
}

export interface Book {
  id: string;
  title: string;
  titleEn: string;
  author: string;
  authorEn: string;
  cover: string;
  category: string;
  categoryEn: string;
  description: string;
  descriptionEn: string;
  pages: number;
  content: string;
  contentEn: string;
}

export interface Article {
  id: string;
  title: string;
  titleEn: string;
  author: string;
  authorEn: string;
  category: string;
  categoryEn: string;
  date: string;
  readTime: string;
  excerpt: string;
  excerptEn: string;
  content: string;
  contentEn: string;
}

export interface Research {
  id: string;
  title: string;
  titleEn: string;
  author: string;
  authorEn: string;
  field: string;
  fieldEn: string;
  date: string;
  abstract: string;
  abstractEn: string;
  content: string;
  contentEn: string;
}

export interface Lecture {
  id: string;
  title: string;
  titleEn: string;
  speaker: string;
  speakerEn: string;
  date: string;
  duration: string;
  category: string;
  categoryEn: string;
  description: string;
  descriptionEn: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  questionEn: string;
  options: string[];
  optionsEn: string[];
  correctIndex: number;
  explanation: string;
  explanationEn: string;
}

export interface Certificate {
  id: string;
  courseTitle: string;
  courseTitleEn: string;
  studentName: string;
  instructor: string;
  instructorEn: string;
  completionDate: string;
}

export const courses: Course[] = [
  {
    id: "aqeedah-101",
    title: "شرح الأصول الثلاثة",
    titleEn: "Explanation of The Three Fundamental Principles",
    instructor: "الشيخ سليمان الرحيلي",
    instructorEn: "Sheikh Sulaiman Al-Ruhayli",
    description: "شرح تأصيلي لرسالة الأصول الثلاثة، يتناول معرفة الله ودين الإسلام ونبيه محمد صلى الله عليه وسلم بالأدلة من الكتاب والسنة.",
    descriptionEn: "A foundational explanation of The Three Fundamental Principles, covering knowledge of Allah, Islam, and Prophet Muhammad through evidence from the Quran and Sunnah.",
    image: "/courses/aqeedah.jpg",
    level: "مبتدئ",
    levelEn: "Beginner",
    duration: "8 أسابيع",
    lessons: 24,
    category: "العقيدة",
    categoryEn: "Creed",
    progress: 65,
    curriculum: [
      { id: "c1", title: "الأصل الأول: معرفة الله", titleEn: "The First Principle: Knowing Allah", duration: "45 دقيقة", type: "video", videoUrl: "https://www.youtube.com/embed/0MxQD-0kJcY?rel=0" },
      { id: "c2", title: "الأصل الثاني: معرفة دين الإسلام", titleEn: "The Second Principle: Knowing Islam", duration: "50 دقيقة", type: "video" },
      { id: "c3", title: "مراتب الدين", titleEn: "The Levels of Religion", duration: "55 دقيقة", type: "video" },
      { id: "c4", title: "الأصل الثالث: معرفة النبي صلى الله عليه وسلم", titleEn: "The Third Principle: Knowing the Prophet", duration: "40 دقيقة", type: "reading" },
      { id: "c5", title: "اختبار الوحدة الأولى", titleEn: "Unit 1 Assessment", duration: "20 دقيقة", type: "quiz" },
      { id: "c6", title: " أنواع الكفر", titleEn: "Types of Disbelief", duration: "50 دقيقة", type: "video" },
      { id: "c7", title: "الشرك وأقسامه", titleEn: "Shirk and its Categories", duration: "55 دقيقة", type: "video" },
      { id: "c8", title: "اختبار الوحدة الثانية", titleEn: "Unit 2 Assessment", duration: "20 دقيقة", type: "quiz" },
    ],
    objectives: [
      "معرفة الأصول الثلاثة بالأدلة الشرعية",
      "فهم مراتب الدين وأركان الإسلام والإيمان",
      "تطبيق ما تضمنته الرسالة من العلم والعمل والدعوة",
    ],
    objectivesEn: [
      "Learn the three fundamental principles with their proofs",
      "Understand the levels of religion and the pillars of Islam and faith",
      "Apply the message's guidance through knowledge, action, and da'wah",
    ],
    references: ["كتاب التوحيد للشيخ محمد بن عبد الوهاب", "العقيدة الواسطية لشيخ الإسلام ابن تيمية", "شرح العقيدة الطحاوية"],
  },
  {
    id: "usool-fiqh-101",
    title: "أصول الفقه للمبتدئين",
    titleEn: "Principles of Islamic Jurisprudence",
    instructor: "د. محمد بن سعيد البوسعيدي",
    instructorEn: "Dr. Mohammed Al-Busaidi",
    description: "مقدمة في أصول الفقه تتناول الأدلة الشرعية والقواعد الأصولية بشكل مبسط ومنهجي.",
    descriptionEn: "An introduction to Usul al-Fiqh covering legal evidences and juristic principles in a simplified and methodical manner.",
    image: "/courses/usool.jpg",
    level: "مبتدئ",
    levelEn: "Beginner",
    duration: "10 أسابيع",
    lessons: 30,
    category: "الفقه",
    categoryEn: "Jurisprudence",
    progress: 30,
    curriculum: [
      { id: "c1", title: "تعريف أصول الفقه وأهميته", titleEn: "Definition and Importance of Usul al-Fiqh", duration: "40 دقيقة", type: "video" },
      { id: "c2", title: "الدليل الشرعي الأول: الكتاب", titleEn: "The First Evidence: The Quran", duration: "50 دقيقة", type: "video" },
      { id: "c3", title: "الدليل الشرعي الثاني: السنة", titleEn: "The Second Evidence: The Sunnah", duration: "45 دقيقة", type: "video" },
      { id: "c4", title: "الإجماع والقياس", titleEn: "Consensus and Analogy", duration: "50 دقيقة", type: "reading" },
      { id: "c5", title: "اختبار الوحدة الأولى", titleEn: "Unit 1 Assessment", duration: "20 دقيقة", type: "quiz" },
    ],
    objectives: [
      "فهم تعريف أصول الفقه وفروعه",
      "معرفة الأدلة الشرعية وأحكامها",
      "التمييز بين القواعد الأصولية",
    ],
    objectivesEn: [
      "Understand the definition and branches of Usul al-Fiqh",
      "Know the legal evidences and their rulings",
      "Distinguish between juristic principles",
    ],
    references: ["الموافقات للشاطبي", "الإرشاد للجويني", "شرح الكوكب المنير لابن النجار"],
  },
  {
    id: "ulum-hadith-101",
    title: "مدخل إلى علوم الحديث",
    titleEn: "Introduction to Hadith Sciences",
    instructor: "د. يوسف بن خالد النملي",
    instructorEn: "Dr. Yusuf Al-Namli",
    description: "دورة في علوم الحديث النبوي الشريف تشمل أنواع الحديث وandro它的 مصطلحات وطرق transmission.",
    descriptionEn: "A course in the sciences of Prophetic Hadith covering types, terminology, and methods of transmission.",
    image: "/courses/hadith.jpg",
    level: "متوسط",
    levelEn: "Intermediate",
    duration: "12 أسابيع",
    lessons: 36,
    category: "الحديث",
    categoryEn: "Hadith Sciences",
    progress: 0,
    curriculum: [
      { id: "c1", title: "تعريف الحديث وأهميته", titleEn: "Definition and Importance of Hadith", duration: "40 دقيقة", type: "video" },
      { id: "c2", title: "طرق نقل الحديث", titleEn: "Methods of Hadith Transmission", duration: "50 دقيقة", type: "video" },
      { id: "c3", title: "تصنيف الحديث من حيث الصحة", titleEn: "Classification by Authenticity", duration: "55 دقيقة", type: "video" },
      { id: "c4", title: "الصحيح والحسن والضعيف", titleEn: "Sahih, Hasan, and Da'if", duration: "45 دقيقة", type: "reading" },
    ],
    objectives: [
      "فهم أهمية الحديث النبوي في التشريع",
      "معرفة أنواع الحديث وأقسامه",
      "القدرة على تقييم صحة الحديث",
    ],
    objectivesEn: [
      "Understand the importance of Hadith in legislation",
      "Know the types and categories of Hadith",
      "Evaluate hadith authenticity",
    ],
    references: ["فتح الباري شرح صحيح البخاري", "تقريب التهذيب لابن حجر", "علوم الحديث لابن الصلاح"],
  },
  {
    id: "tafseer-101",
    title: "منهج المفسرين",
    titleEn: "Methodology of Quranic Exegesis",
    instructor: "د. أحمد بن عمر الحازمي",
    instructorEn: "Dr. Ahmed Al-Hazmi",
    description: "دراسة منهجية لمدارس التفسير الرئيسية وأساليب المفسرين في فهم القرآن الكريم.",
    descriptionEn: "A systematic study of major schools of Quranic exegesis and exegetes' methods in understanding the Quran.",
    image: "/courses/tafseer.jpg",
    level: "متوسط",
    levelEn: "Intermediate",
    duration: "14 أسابيع",
    lessons: 42,
    category: "التفسير",
    categoryEn: "Quranic Studies",
    progress: 0,
    curriculum: [
      { id: "c1", title: "أهمية التفسير وشروط المفسر", titleEn: "Importance of Exegesis and Conditions of the Exegete", duration: "45 دقيقة", type: "video" },
      { id: "c2", title: "التفسير بالمأثور", titleEn: "Tafsir bi'l-Ma'thur", duration: "50 دقيقة", type: "video" },
      { id: "c3", title: "التفسير بالرأي", titleEn: "Tafsir bi'l-Ra'y", duration: "55 دقيقة", type: "video" },
    ],
    objectives: [
      "فهم أهمية التفسير وشروط المفسر",
      "معرفة المدارس التفسيرية الكبرى",
      "التمييز بين التفسير بالمأثور والتأويل",
    ],
    objectivesEn: [
      "Understand the importance of exegesis",
      "Know the major schools of exegesis",
      "Distinguish between transmitted and interpretive exegesis",
    ],
    references: ["مقدمات في التفسير الميسر", "البرهان في علوم القرآن للزركشي", "إرشاد العقل السليم للإيجي"],
  },
  {
    id: "sira-101",
    title: "السيرة النبوية: دراسة تحليلية",
    titleEn: "Prophetic Biography: Analytical Study",
    instructor: "د. فيصل بن عبدالعزيز المطيري",
    instructorEn: "Dr. Faisal Al-Mutairi",
    description: "دورة تحليلية للسيرة النبوية الشريفة تركز على الدروس والدلالات المستفادة من أحداث السيرة.",
    descriptionEn: "An analytical course on the Prophetic biography focusing on lessons derived from Sira events.",
    image: "/courses/sira.jpg",
    level: "مبتدئ",
    levelEn: "Beginner",
    duration: "10 أسابيع",
    lessons: 30,
    category: "السيرة",
    categoryEn: "Prophetic Studies",
    progress: 0,
    curriculum: [
      { id: "c1", title: "جاهليت العرب والسيرة المكية", titleEn: "Arab Jahiliyyah and Meccan Sira", duration: "50 دقيقة", type: "video" },
      { id: "c2", title: "البعثة النبوية", titleEn: "The Prophetic Mission", duration: "45 دقيقة", type: "video" },
      { id: "c3", title: "الهجرة النبوية", titleEn: "The Prophetic Migration", duration: "55 دقيقة", type: "video" },
    ],
    objectives: [
      "فهم مراحل السيرة النبوية",
      "استخلاص الدروس والعبر من الأحداث",
      "تطبيق أحكام السيرة في حياتنا المعاصرة",
    ],
    objectivesEn: [
      "Understand the phases of Prophetic biography",
      "Extract lessons from historical events",
      "Apply Sira lessons in contemporary life",
    ],
    references: ["الرحيق المختوم للصافي", "سيرة ابن هشام", "البداية والنهاية لابن كثير"],
  },
  {
    id: "fiqh-101",
    title: "القواعد الفقهية الكبرى",
    titleEn: "Major Fiqh Maxims",
    instructor: "د. عبدالرحمن بن سعود الشبل",
    instructorEn: "Dr. Abdulrahman Al-Shabal",
    description: "دورة متقدمة في القواعد الفقهية الكبرى وأثرها في استنباط الأحكام الشرعية.",
    descriptionEn: "An advanced course on major Fiqh maxims and their impact on legal derivation.",
    image: "/courses/fiqh.jpg",
    level: "متقدم",
    levelEn: "Advanced",
    duration: "8 أسابيع",
    lessons: 24,
    category: "الفقه",
    categoryEn: "Jurisprudence",
    progress: 0,
    curriculum: [
      { id: "c1", title: "تقديم على القواعد الفقهية", titleEn: "Introduction to Fiqh Maxims", duration: "40 دقيقة", type: "video" },
      { id: "c2", title: "قاعدة لا ضرر ولا ضرار", titleEn: "No Harm or Reciprocal Harm", duration: "50 دقيقة", type: "video" },
      { id: "c3", title: "قاعدة اليقين لا يزول بالشك", titleEn: "Certainty is Not Overridden by Doubt", duration: "45 دقيقة", type: "video" },
    ],
    objectives: [
      "فهم القواعد الفقهية الكبرى",
      "تطبيق القواعد على مسائل فقهية",
      "فهم العلاقة بين القواعد والضوابط",
    ],
    objectivesEn: [
      "Understand major Fiqh maxims",
      "Apply maxims to jurisprudential issues",
      "Understand the relationship between maxims and conditions",
    ],
    references: ["القواعد الفقهية للسادة الخاطري", "القواعد لابن رجب", "الإيضاح لابن عثيمين"],
  },
  {
    id: "arabic-101",
    title: "نحو اللغة العربية للمبتدئين",
    titleEn: "Arabic Grammar for Beginners",
    instructor: "د. خالد بن عبدالله الجبري",
    instructorEn: "Dr. Khalid Al-Jabri",
    description: "دورة في قواعد اللغة العربية والإعراب لفهم النصوص الشرعية فهمًا صحيحًا.",
    descriptionEn: "A course in Arabic grammar and parsing for correct understanding of religious texts.",
    image: "/courses/arabic.jpg",
    level: "مبتدئ",
    levelEn: "Beginner",
    duration: "16 أسابيع",
    lessons: 48,
    category: "اللغة العربية",
    categoryEn: "Arabic Language",
    progress: 0,
    curriculum: [
      { id: "c1", title: "الجملة الاسمية والفعلية", titleEn: "Nominal and Verbal Sentences", duration: "45 دقيقة", type: "video" },
      { id: "c2", title: "المعرب والمبني", titleEn: "Inflected and Uninflected", duration: "50 دقيقة", type: "video" },
      { id: "c3", title: "الإعراب والحكم عليه", titleEn: "Parsing and Judgment", duration: "55 دقيقة", type: "reading" },
    ],
    objectives: [
      "فهم قواعد اللغة العربية الأساسية",
      "القدرة على إعراب الجمل العربية",
      "قراءة النصوص الشرعية بفهم",
    ],
    objectivesEn: [
      "Understand basic Arabic grammar rules",
      "Parse Arabic sentences correctly",
      "Read religious texts with comprehension",
    ],
    references: ["الآجرومية لابن آجروم", "أوضح المسالك لابن هشام", "لسان العرب لابن منظور"],
  },
  {
    id: "tazkiyah-101",
    title: "التزكية والرقية الشرعية",
    titleEn: "Purification and Prophetic Healing",
    instructor: "د. سعيد بن مسفر القحطاني",
    instructorEn: "Dr. Saeed Al-Qahtani",
    description: "دورة في آداب التزكية والرقية الشرعية المستندة إلى الكتاب والسنة.",
    descriptionEn: "A course on the etiquette of self-purification and Prophetic healing based on Quran and Sunnah.",
    image: "/courses/tazkiyah.jpg",
    level: "مبتدئ",
    levelEn: "Beginner",
    duration: "6 أسابيع",
    lessons: 18,
    category: "التزكية",
    categoryEn: "Spiritual Purification",
    progress: 0,
    curriculum: [
      { id: "c1", title: "تعريف التزكية وأهميتها", titleEn: "Definition and Importance of Tazkiyah", duration: "40 دقيقة", type: "video" },
      { id: "c2", title: "أسباب التزكية", titleEn: "Causes of Spiritual Illness", duration: "45 دقيقة", type: "video" },
      { id: "c3", title: "الرقية الشرعية", titleEn: "Prophetic Healing (Ruqyah)", duration: "50 دقيقة", type: "video" },
    ],
    objectives: [
      "فهم حقيقة التزكية الشرعية",
      "معرفة أسباب الأمراض القلبية",
      "تطبيق الرقية الشرعية بشكل صحيح",
    ],
    objectivesEn: [
      "Understand the reality of spiritual purification",
      "Know the causes of spiritual illnesses",
      "Apply Prophetic healing correctly",
    ],
    references: ["مدارج السالكين لابن قيم الجوزية", "الروح لابن قيم الجوزية", "الجواب الكافي للدويش"],
  },
  {
    id: "seerah-advanced",
    title: "دراسة مستفادة من السيرة النبوية",
    titleEn: "Lessons from Prophetic Biography",
    instructor: "د. ناصر بن محمد العمري",
    instructorEn: "Dr. Nasser Al-Omari",
    description: "تحليل متقدم لأحداث السيرة النبوية واستخلاص الدروس العملية منها.",
    descriptionEn: "Advanced analysis of Prophetic biography events and extracting practical lessons.",
    image: "/courses/seerah-adv.jpg",
    level: "متقدم",
    levelEn: "Advanced",
    duration: "12 أسابيع",
    lessons: 36,
    category: "السيرة",
    categoryEn: "Prophetic Studies",
    progress: 0,
    curriculum: [
      { id: "c1", title: "أسرار البيعة", titleEn: "Secrets of the Pledge", duration: "50 دقيقة", type: "video" },
      { id: "c2", title: "الأهداف الاستراتيجية للهجرة", titleEn: "Strategic Goals of Migration", duration: "55 دقيقة", type: "video" },
    ],
    objectives: [
      "فهم الأبعاد الاستراتيجية للسيرة",
      "استخلاص الدروس العملية من الأحداث",
      "تحليل مواقف النبي صلى الله عليه وسلم",
    ],
    objectivesEn: [
      "Understand the strategic dimensions of Sira",
      "Extract practical lessons from events",
      "Analyze Prophetic decisions and strategies",
    ],
    references: ["السيرة النبوية لابن هشام", "محمد رسول الله لشنكي", "الundred في السيرة ل暾في"],
  },
  {
    id: "lughah-advanced",
    title: "نحو النصوص الشرعية",
    titleEn: "Grammar of Religious Texts",
    instructor: "د. عبدالملك بن عبدالله الدوسري",
    instructorEn: "Dr. Abdulmalik Al-Dosari",
    description: "تطبيق متقدم للنحو العربي على نصوص القرآن الكريم والحديث النبوي.",
    descriptionEn: "Advanced Arabic grammar application to Quranic and Hadith texts.",
    image: "/courses/lughah-adv.jpg",
    level: "متقدم",
    levelEn: "Advanced",
    duration: "14 أسابيع",
    lessons: 42,
    category: "اللغة العربية",
    categoryEn: "Arabic Language",
    progress: 0,
    curriculum: [
      { id: "c1", title: "ال Parsing from Quran", titleEn: "Parsing from Quranic Texts", duration: "55 دقيقة", type: "video" },
      { id: "c2", title: " Parsing from Hadith", titleEn: "Parsing from Hadith Texts", duration: "50 دقيقة", type: "video" },
    ],
    objectives: [
      "القدرة على إعراب آيات القرآن",
      "فهم النحو من خلال النصوص الشرعية",
      "تنمية مهارات اللغة العربية المتقدمة",
    ],
    objectivesEn: [
      "Ability to parse Quranic verses",
      "Understand grammar through religious texts",
      "Develop advanced Arabic language skills",
    ],
    references: ["الأولية لأبي حيان الأندلسي", " Parsing Quran Texts for beginners", "Advanced Arabic Grammar"],
  },
  {
    id: "mantiq-101",
    title: "المدخل إلى المنطق الإسلامي",
    titleEn: "Introduction to Islamic Logic",
    instructor: "د. طارق بن سعيد الحميدي",
    instructorEn: "Dr. Tarek Al-Humaidi",
    description: "دورة في منطق التفكير الإسلامي وأساليب الاستدلال الشرعي.",
    descriptionEn: "A course in Islamic logical thinking and methods of religious argumentation.",
    image: "/courses/mantiq.jpg",
    level: "متوسط",
    levelEn: "Intermediate",
    duration: "8 أسابيع",
    lessons: 24,
    category: "المنطق",
    categoryEn: "Logic",
    progress: 0,
    curriculum: [
      { id: "c1", title: "أهمية المنطق في العلوم الشرعية", titleEn: "Importance of Logic in Religious Sciences", duration: "40 دقيقة", type: "video" },
      { id: "c2", title: "المقدمة والم前提", titleEn: "Premises and Assumptions", duration: "45 دقيقة", type: "video" },
    ],
    objectives: [
      "فهم أساليب التفكير المنطقي",
      "القدرة على بناء الحجج الشرعية",
      "تمييز المغالطات المنطقية",
    ],
    objectivesEn: [
      "Understand logical thinking methods",
      "Build religious arguments correctly",
      "Identify logical fallacies",
    ],
    references: ["إيضاح المختصر لابن المقفع", "الرد على المنطقيين لابن تيمية", "أصول المنطق الإسلامي"],
  },
  {
    id: "fatawa-101",
    title: "منهج الفتاوى والمفاهيم الشرعية",
    titleEn: "Methodology of Fatwa and Religious Rulings",
    instructor: "د. عبدالعزيز بن فهد الراجحي",
    instructorEn: "Dr. Abdulaziz Al-Rajihi",
    description: "دراسة منهجية لطرق استنباط الفتاوى والتعامل مع الفروض الشرعية.",
    descriptionEn: "A systematic study of fatwa methodology and dealing with hypothetical religious cases.",
    image: "/courses/fatawa.jpg",
    level: "متقدم",
    levelEn: "Advanced",
    duration: "10 أسابيع",
    lessons: 30,
    category: "الفقه",
    categoryEn: "Jurisprudence",
    progress: 0,
    curriculum: [
      { id: "c1", title: "تعريف الفتوى وشروطها", titleEn: "Definition and Conditions of Fatwa", duration: "45 دقيقة", type: "video" },
      { id: "c2", title: "شروط المفتي", titleEn: "Conditions of the Mufti", duration: "40 دقيقة", type: "video" },
    ],
    objectives: [
      "فهم منهج الفتوى الشرعية",
      "معرفة شروط المفتي وآدابه",
      "التمييز بين الفروض الواقعية والفرضية",
    ],
    objectivesEn: [
      "Understand fatwa methodology",
      "Know the conditions and etiquette of the Mufti",
      "Distinguish between real and hypothetical cases",
    ],
    references: ["إعلام الموقعين لابن قيم الجوزية", "الإفتاء والifeeq", "منهج الفتوى للقرضاوي"],
  },
  {
    id: "nawaqid-islam-101",
    title: "شرح نواقض الإسلام",
    titleEn: "Explanation of The Nullifiers of Islam",
    instructor: "الشيخ د. سليمان الرحيلي",
    instructorEn: "Sheikh Dr. Sulaiman Al-Ruhayli",
    description: "شرح علمي لرسالة نواقض الإسلام، يوضح مسائلها وأدلتها وينبه إلى خطورة النواقض وضوابط فهمها.",
    descriptionEn: "A scholarly explanation of The Nullifiers of Islam, presenting its issues and proofs while highlighting their seriousness and the principles for understanding them.",
    image: "/Photos/BMC.png",
    level: "مبتدئ",
    levelEn: "Beginner",
    duration: "23 فيديو",
    lessons: 23,
    category: "العقيدة",
    categoryEn: "Creed",
    progress: 0,
    curriculum: [
      { id: "n1", title: "تمهيد", titleEn: "Introduction", duration: "فيديو", type: "video", videoUrl: "https://www.youtube.com/embed/0MxQD-0kJcY?rel=0" },
      { id: "n2", title: "المقدمة الأولى", titleEn: "First Introduction", duration: "فيديو", type: "video", videoUrl: "https://www.youtube.com/embed/rurWObdRvG0?rel=0" },
      { id: "n3", title: "المقدمة الثانية", titleEn: "Second Introduction", duration: "فيديو", type: "video", videoUrl: "https://www.youtube.com/embed/CzuqYnVmRm8?rel=0" },
      { id: "n4", title: "المقدمة الثالثة", titleEn: "Third Introduction", duration: "فيديو", type: "video", videoUrl: "https://www.youtube.com/embed/jNyD1ngk7Rc?rel=0" },
      { id: "n5", title: "المقدمة الرابعة", titleEn: "Fourth Introduction", duration: "فيديو", type: "video", videoUrl: "https://www.youtube.com/embed/fqr0ZO319rg?rel=0" },
      { id: "n6", title: "مقدمة المصنف", titleEn: "The Author's Introduction", duration: "فيديو", type: "video", videoUrl: "https://www.youtube.com/embed/x8cF3zWXcvI?rel=0" },
      { id: "n7", title: "الناقض الأول", titleEn: "The First Nullifier", duration: "فيديو", type: "video", videoUrl: "https://www.youtube.com/embed/djDy0208zWU?rel=0" },
      { id: "n8", title: "الناقض الثاني", titleEn: "The Second Nullifier", duration: "فيديو", type: "video", videoUrl: "https://www.youtube.com/embed/LWdn01npPBk?rel=0" },
      { id: "n9", title: "الناقض الثالث", titleEn: "The Third Nullifier", duration: "فيديو", type: "video", videoUrl: "https://www.youtube.com/embed/arEKoCZWrO0?rel=0" },
      { id: "n10", title: "الناقض الرابع ج1", titleEn: "The Fourth Nullifier, Part 1", duration: "فيديو", type: "video", videoUrl: "https://www.youtube.com/embed/5hG_KsYQIgo?rel=0" },
      { id: "n11", title: "الناقض الرابع ج2", titleEn: "The Fourth Nullifier, Part 2", duration: "فيديو", type: "video", videoUrl: "https://www.youtube.com/embed/-YxHCrbo23M?rel=0" },
      { id: "n12", title: "الناقض الرابع ج3", titleEn: "The Fourth Nullifier, Part 3", duration: "فيديو", type: "video", videoUrl: "https://www.youtube.com/embed/tb2v88BX-6k?rel=0" },
      { id: "n13", title: "الناقض الرابع ج4", titleEn: "The Fourth Nullifier, Part 4", duration: "فيديو", type: "video", videoUrl: "https://www.youtube.com/embed/tGSv9v3CTF4?rel=0" },
      { id: "n14", title: "الناقض الخامس", titleEn: "The Fifth Nullifier", duration: "فيديو", type: "video", videoUrl: "https://www.youtube.com/embed/CcaF6_zfaxw?rel=0" },
      { id: "n15", title: "الناقض السادس", titleEn: "The Sixth Nullifier", duration: "فيديو", type: "video", videoUrl: "https://www.youtube.com/embed/6J5zESs-ZF0?rel=0" },
      { id: "n16", title: "الناقض السابع", titleEn: "The Seventh Nullifier", duration: "فيديو", type: "video", videoUrl: "https://www.youtube.com/embed/6fjDR0HZPJU?rel=0" },
      { id: "n17", title: "الناقض الثامن", titleEn: "The Eighth Nullifier", duration: "فيديو", type: "video", videoUrl: "https://www.youtube.com/embed/B8xJ-3Hjd-4?rel=0" },
      { id: "n18", title: "الناقض التاسع", titleEn: "The Ninth Nullifier", duration: "فيديو", type: "video", videoUrl: "https://www.youtube.com/embed/bM7oznkK5as?rel=0" },
      { id: "n19", title: "الناقض العاشر", titleEn: "The Tenth Nullifier", duration: "فيديو", type: "video", videoUrl: "https://www.youtube.com/embed/KY7J5KgTtDc?rel=0" },
      { id: "n20", title: "خطورة نواقض الإسلام", titleEn: "The Seriousness of the Nullifiers of Islam", duration: "فيديو", type: "video", videoUrl: "https://www.youtube.com/embed/mB9-p6pLDpU?rel=0" },
      { id: "n21", title: "العذر بالجهل", titleEn: "Excuse Due to Ignorance", duration: "فيديو", type: "video", videoUrl: "https://www.youtube.com/embed/tV_GBrKPy_U?rel=0" },
      { id: "n22", title: "خاتمة", titleEn: "Conclusion", duration: "فيديو", type: "video", videoUrl: "https://www.youtube.com/embed/-DYuSB-9WY0?rel=0" },
      { id: "n23", title: "الإجابة على الأسئلة", titleEn: "Answering the Questions", duration: "فيديو", type: "video", videoUrl: "https://www.youtube.com/embed/0RoN3qTwYbI?rel=0" },
    ],
    objectives: [
      "معرفة نواقض الإسلام وأدلتها",
      "فهم ضوابط الحكم على مسائل النواقض",
      "التنبه إلى خطورة الجهل بأصول العقيدة",
    ],
    objectivesEn: [
      "Learn the nullifiers of Islam and their proofs",
      "Understand the principles for judging issues related to the nullifiers",
      "Recognize the danger of ignorance regarding the foundations of creed",
    ],
    references: ["نواقض الإسلام للإمام محمد بن عبدالوهاب", "شروح العلماء على نواقض الإسلام"],
  },
];

export const books: Book[] = [
  {
    id: "b1",
    title: "العقيدة الواسطية",
    titleEn: "The Wasseetiyyah Creed",
    author: "شيخ الإسلام ابن تيمية",
    authorEn: "Ibn Taymiyyah",
    cover: "/books/aqeedah-wasitiyyah.jpg",
    category: "العقيدة",
    categoryEn: "Creed",
    description: "رسالة مختصرة في أصول الدين على مذهب أهل السنة والجماعة.",
    descriptionEn: "A concise treatise on the fundamentals of religion according to Ahlus-Sunnah wal-Jama'ah.",
    pages: 48,
    content: `بسم الله الرحمن الرحيم

العقيدة الواسطية

لشيخ الإسلام أحمد بن تيمية رحمه الله

الحمد لله الذي أرسل رسوله بالهدى ودين الحق ليظهره على الدين كله وكفى بالله شهيدا.

أعلم رحمك الله تعالى أن أصول أهل السنة والجماعة которые يجب على العبد أن يعلمها قبل القدر الذي يحتاج إليه في الصلاة والزكاة والصيام والحج ونحوها ما جاء به رسول الله صلى الله عليه وسلم من الإيمان بالله وملائكته وكتبه ورسله والبعث بعد الموت والإيمان بالقضاء والقدر خيره وشره.

والإيمان بالقدر خيره وشره من أصول أهل السنة والجماعة.

والإيمان بالقدر خيره وشره معناه: الإيمان بأن كل شيء بقضاء الله وقدره، وأن الله خلق كل شيء وقدره/Applying exact measures.

ولا يجوز لأحد أن يukan خلق الله وتقديره لشيء من الخلق.`,
    contentEn: `In the name of God, the Most Gracious, the Most Merciful

The Wasseetiyyah Creed

By Sheikh al-Islam Ibn Taymiyyah, may God have mercy on him

Praise be to God who sent His Messenger with guidance and the religion of truth to manifest it over all religion, and God is sufficient as a witness.

Know, may God have mercy on you, that the fundamentals of Ahlus-Sunnah wal-Jama'ah which a servant must know before the amount needed in prayer, zakat, fasting, and pilgrimage are what the Messenger of God, peace be upon him, brought: belief in God, His angels, His books, His messengers, resurrection after death, and belief in divine decree, its good and bad.

Belief in divine decree, its good and bad, is one of the fundamentals of Ahlus-Sunnah wal-Jama'ah.

Its meaning is: belief that everything is by God's decree and providence, and that God created everything and ordained it.

No one is permitted to deny God's creation and ordainment of anything from His creation.`,
  },
  {
    id: "b2",
    title: "ال Recap التحصينية",
    titleEn: "The Protective Summary",
    author: "ابن قيم الجوزية",
    authorEn: "Ibn Qayyim al-Jawziyyah",
    cover: "/books/tahseeniyyah.jpg",
    category: "التزكية",
    categoryEn: "Spiritual Purification",
    description: "رسالة في الدفع والعلاج الشرعي للأمراض القلبية والروحية.",
    descriptionEn: "A treatise on the prevention and treatment of spiritual and cardiac illnesses.",
    pages: 120,
    content: `بسم الله الرحمن الرحيم

رسالة التحصينية

لابن قيم الجوزية رحمه الله

الأمراض القلبية نوعان: نوع يعرض للقلب من جهة الشهوة والANGER، ونوع يعرض له من جهة الشك والราيبة.

والعلاج من الأول: ذكر الله تعالى والrage والإنابة والتوكل عليه.

والعلاج من الثاني: الإيمان بالله وكتبه ورسله واليوم الآخر والقضاء والقدر خيره وشره.`,
    contentEn: `In the name of God, the Most Gracious, the Most Merciful

The Protective Summary

By Ibn Qayyim al-Jawziyyah, may God have mercy on him

Cardiac illnesses are of two types: one that affects the heart from the side of desire and anger, and another from the side of doubt and suspicion.

The treatment of the first is: remembrance of God Almighty, repentance, returning to Him, and relying on Him.

The treatment of the second is: belief in God, His books, His messengers, the Last Day, and divine decree, its good and bad.`,
  },
  {
    id: "b3",
    title: "مدارج السالكين",
    titleEn: "Stages of the Wayfarers",
    author: "ابن قيم الجوزية",
    authorEn: "Ibn Qayyim al-Jawziyyah",
    cover: "/books/madarij.jpg",
    category: "التزكية",
    categoryEn: "Spiritual Purification",
    description: "شرح مفصل لطريق السلوك إلى الله تعالى وأحوال المريدين.",
    descriptionEn: "A detailed commentary on the path to God and the states of seekers.",
    pages: 450,
    content: `بسم الله الرحمن الرحيم

مدارج السالكين بين منازل إياك نعبد وإياك نستعين

لابن قيم الجوزية رحمه الله

الحمد لله الذي جعل في القلوب نورا يعرف به الناس حقائق الأمور، وجعل في العقول ضوءا يهتدى به إلى معرفة الله وطاعته ومحبته.

سلك هؤلاء طريقا يرتقي فيه القلب من مرتبة إلى مرتبة أعلى منها.`,
    contentEn: `In the name of God, the Most Gracious, the Most Merciful

Stages of the Wayfarers Between the Stations of "You alone we worship, and You alone we ask for help"

By Ibn Qayyim al-Jawziyyah, may God have mercy on him

Praise be to God who placed in hearts a light by which people know the truth of matters, and placed in minds an illumination by which they are guided to know God, obey Him, and love Him.

These people followed a path in which the heart ascends from one station to a higher one.`,
  },
  {
    id: "b4",
    title: "الآجرومية",
    titleEn: "The Ajrumiyyah",
    author: "ابن آجروم الصنهاجي",
    authorEn: "Ibn Ajrum",
    cover: "/books/ajrumiyyah.jpg",
    category: "اللغة العربية",
    categoryEn: "Arabic Language",
    description: "متن مختصر في قواعد اللغة العربية للنحو والإعراب.",
    descriptionEn: "A concise text on Arabic grammar and parsing rules.",
    pages: 32,
    content: `بسم الله الرحمن الرحيم

متن الآجرومية

لابن آجروم الصنهاجي رحمه الله

الحمد لله على نعمته، والصلاة والسلام على نبيه محمد وآله وصحبه.

بدء الكلام في العربية على ثلاثة أقسام: اسم وفعل وحرف.
الاسم ما دل على معنى في نفسه ولم يقتضِ فاعلا متصلا به لفظا.
والفعل ما دل على معنى في نفسه واقتضى فاعلا متصلا به لفظا.
والحرف ما دل على معنى في غيره.`,
    contentEn: `In the name of God, the Most Gracious, the Most Merciful

The Ajrumiyyah Text

By Ibn Ajrum al-Sahhji, may God have mercy on him

Praise be to God for His blessing, and prayers and peace be upon His prophet Muhammad, his family, and companions.

Speech in Arabic begins with three divisions: noun, verb, and particle.
The noun is what indicates a meaning in itself and does not require an attached subject verbally.
The verb is what indicates a meaning in itself and requires an attached subject verbally.
The particle is what indicates a meaning in other than itself.`,
  },
  {
    id: "b5",
    title: "إحياء علوم الدين",
    titleEn: "Revival of the Religious Sciences",
    author: "الغزالي",
    authorEn: "Al-Ghazali",
    cover: "/books/ihya.jpg",
    category: "التزكية",
    categoryEn: "Spiritual Purification",
    description: "من أعظم كتب التصوف والرقائق في الإسلام.",
    descriptionEn: "One of the greatest books on Sufism and spiritual refinement in Islam.",
    pages: 1200,
    content: `بسم الله الرحمن الرحيم

إحياء علوم الدين

لأبي حامد الغزالي رحمه الله

الحمد لله الذي جعل العلم نورا يهتدى به في ظلمات الشبهات والشهوات، وجعل الجهل ظلاما يعمى القلوب ويشغلها عن معرفة الحقائق.`,
    contentEn: `In the name of God, the Most Gracial, the Most Merciful

Revival of the Religious Sciences

By Abu Hamid Al-Ghazali, may God have mercy on him

Praise be to God who made knowledge a light by which one is guided through the darknesses of doubts and desires, and made ignorance a darkness that blinds hearts and occupies them from knowing truths.`,
  },
  {
    id: "b6",
    title: "العقيدة الطحاوية",
    titleEn: "The Tahawiyyah Creed",
    author: "الإمام الطحاوي",
    authorEn: "Imam Al-Tahawi",
    cover: "/books/tahawiyyah.jpg",
    category: "العقيدة",
    categoryEn: "Creed",
    description: "بيان عقيدة أهل السنة والجماعة في صورة نظم مختصر.",
    descriptionEn: "An exposition of Ahlus-Sunnah wal-Jama'ah creed in concise verse form.",
    pages: 64,
    content: `بسم الله الرحمن الرحيم

شرح العقيدة الطحاوية

هذا ذكر بيان عقيدة أهل السنة والجماعة

نحن نؤمن برب واحد لا شريك له ومحمد عبده ورسوله.

الكلام على الله تعالى وال篇章 فيه 및صف الله تعالى بما وصف به نفسه في كتابه أو بما وصف به رسوله محمد صلى الله عليه وسلم.`,
    contentEn: `In the name of God, the Most Gracious, the Most Merciful

Commentary on the Tahawiyyah Creed

This is a statement of the creed of Ahlus-Sunnah wal-Jama'ah

We believe in one Lord without partners, and Muhammad is His servant and Messenger.

Speech about God Almighty and chapters therein describe God Almighty with what He described Himself in His Book or what His Messenger Muhammad, peace be upon him, described Him with.`,
  },
  {
    id: "b7",
    title: "فتح الباري",
    titleEn: "Opening of the All-Merciful",
    author: "ابن حجر العسقلاني",
    authorEn: "Ibn Hajar al-Asqalani",
    cover: "/books/fathul-bari.jpg",
    category: "الحديث",
    categoryEn: "Hadith Sciences",
    description: "أعظم شروح على صحيح البخاري وأهم مرجع في علوم الحديث.",
    descriptionEn: "The greatest commentary on Sahih al-Bukhari and the most important reference in Hadith sciences.",
    pages: 1500,
    content: `بسم الله الرحمن الرحيم

فتح الباري شرح صحيح البخاري

لابن حجر العسقلاني رحمه الله

الحمد لله الذي أنيز السنة النبوية وحفظها من الدس والتحريف، وجعلها مصدراً ثانياً للتشريع الإسلامي.`,
    contentEn: `In the name of God, the Most Gracious, the Most Merciful

Opening of the All-Merciful: Commentary on Sahih al-Bukhari

By Ibn Hajar al-Asqalani, may God have mercy on him

Praise be to God who made the Prophetic Sunnah and preserved it from interpolation and alteration, and made it a second source of Islamic legislation.`,
  },
  {
    id: "b8",
    title: "الموافقات",
    titleEn: "The Harmonizing Agreements",
    author: "الشاطبي",
    authorEn: "Al-Shatibi",
    cover: "/books/muwafaqat.jpg",
    category: "أصول الفقه",
    categoryEn: "Principles of Jurisprudence",
    description: "من أعظم كتب أصول الفقه في استclair الغرض من الشريعة.",
    descriptionEn: "One of the greatest books in Usul al-Fiqh on clarifying the objectives of Sharia.",
    pages: 800,
    content: `بسم الله الرحمن الرحيم

الموافقات في أصول الشريعة

للإمام الشاطبي رحمه الله

الحمد لله الذي شرع الشرع وجعله هداية للعالمين، وجعل فيه مصالح العباد في الدنيا والآخرة.`,
    contentEn: `In the name of God, the Most Gracious, the Most Merciful

The Harmonizing Agreements in the Principles of Sharia

By Imam Al-Shatibi, may God have mercy on him

Praise be to God who legislated Sharia and made it a guidance for all worlds, and placed in it the welfare of servants in this world and the Hereafter.`,
  },
  {
    id: "b9",
    title: "الرحيم المختوم",
    titleEn: "The Sealed Nectar",
    author: "صافي الرحمن المباركفوري",
    authorEn: "Safi al-Rahman al-Mubarakfuri",
    cover: "/books/raheeq.jpg",
    category: "السيرة",
    categoryEn: "Prophetic Studies",
    description: "أفضل كتاب في السيرة النبوية في العصر الحديث.",
    descriptionEn: "The finest book on Prophetic biography in the modern era.",
    pages: 600,
    content: `بسم الله الرحمن الرحيم

الرحيم المختوم

لصافي الرحمن المباركفوري رحمه الله

حمدًا لمن جعل في القلوب حباً للنبي الكريم، وشوقاً لشريعته`,

    contentEn: `In the name of God, the Most Gracious, the Most Merciful

The Sealed Nectar

By Safi al-Rahman al-Mubarakfuri, may God have mercy on him

Praise to Him who placed in hearts love for the Noble Prophet and longing for his Sharia.`,
  },
  {
    id: "b10",
    title: "البداية والنهاية",
    titleEn: "The Beginning and the End",
    author: "ابن كثير",
    authorEn: "Ibn Kathir",
    cover: "/books/bidaya-nihaya.jpg",
    category: "التاريخ",
    categoryEn: "History",
    description: "من أعظم كتب التاريخ الإسلامي شاملًا تاريخ الكون من البداية إلى النهاية.",
    descriptionEn: "One of the greatest books of Islamic history covering the history of the universe from beginning to end.",
    pages: 2000,
    content: `بسم الله الرحمن الرحيم

البداية والنهاية

لابن كثير رحمه الله

الحمد لله الذي خلق الخلق وبدأ بهم من العدم، وسيULLY إليهم النهاية بالرجوع إليه.`,
    contentEn: `In the name of God, the Most Gracious, the Most Merciful

The Beginning and the End

By Ibn Kathir, may God have mercy on him

Praise be to God who created the creation and began with them from nothing, and will end with their return to Him.`,
  },
  {
    id: "b11",
    title: "البرهان في علوم القرآن",
    titleEn: "The Proof in Quranic Sciences",
    author: "الزركشي",
    authorEn: "Al-Zarkashi",
    cover: "/books/burhan.jpg",
    category: "علوم القرآن",
    categoryEn: "Quranic Sciences",
    description: "من أهم كتب علوم القرآن في المقدمة والناسخ والمنسوخ.",
    descriptionEn: "One of the most important books on Quranic sciences covering introduction, abrogating, and abrogated verses.",
    pages: 700,
    content: `بسم الله الرحمن الرحيم

البرهان في علوم القرآن

للزركشي رحمه الله

الحمد لله الذي أنزل القرآن على قلب النبي محمد، وجعله هدية للعالمين.`,
    contentEn: `In the name of God, the Most Gracious, the Most Merciful

The Proof in Quranic Sciences

By Al-Zarkashi, may God have mercy on him

Praise be to God who sent down the Quran upon the heart of Muhammad, and made it a guidance for all worlds.`,
  },
  {
    id: "b12",
    title: "إعلام الموقعين",
    titleEn: "Informants of the Places",
    author: "ابن قيم الجوزية",
    authorEn: "Ibn Qayyim al-Jawziyyah",
    cover: "/books/ialam.jpg",
    category: "أصول الفقه",
    categoryEn: "Principles of Jurisprudence",
    description: "شرح مفصل لأدلة الشريعة الإسلامية وطرق الاستدلال.",
    descriptionEn: "A detailed commentary on the evidences of Islamic Sharia and methods of argumentation.",
    pages: 900,
    content: `بسم الله الرحمن الرحيم

إعلام الموقعين عن رب العالمين

لابن قيم الجوزية رحمه الله

الحمد لله الذي جعل في الشريعة الإسلامية من الحكمة والمصالح ما يكفي لسعادة الإنسان في الدارين.`,
    contentEn: `In the name of God, the Most Gracious, the Most Merciful

Informants of the Places about the Lord of All Worlds

By Ibn Qayyim al-Jawziyyah, may God have mercy on him

Praise be to God who placed in Islamic Sharia such wisdom and interests as suffice for human happiness in both abodes.`,
  },
];

export const articles: Article[] = [
  {
    id: "a1",
    title: "أهمية العلم الشرعي في حياة المسلم",
    titleEn: "The Importance of Religious Knowledge in a Muslim's Life",
    author: "د. عبدالله الشرقي",
    authorEn: "Dr. Abdullah Al-Sharqi",
    category: "الفكر الإسلامي",
    categoryEn: "Islamic Thought",
    date: "2024-01-15",
    readTime: "8 دقائق",
    excerpt: "يُعد طلب العلم الشرعي من أهم الفروض الكفائية بل قد ي Pedro فرض عين على بعض الناس في أوقات الحاجة.",
    excerptEn: "Seeking religious knowledge is one of the most important collective obligations and may become an individual obligation during times of need.",
    content: "مقدمة في أهمية العلم الشرعي...\n\nيُعد طلب العلم الشرعي من أهم ما يcommit عليه المسلم في حياته، فقد جاء في الحديث النبوي: 'طلب العلم فريضة على كل Muslim'.\n\nويشمل العلم الشرعي العلوم التالية: العقيدة، والفقه، والتفسير، والحديث، والسيرة، واللغة العربية.\n\nوإن من أعظم ما يميز العلم الشرعي أنه ي pertains to معرفة الله تعالى وطاعته، وأصول الدين وفروعه.",
    contentEn: "Introduction to the importance of religious knowledge...\n\nSeeking religious knowledge is among the most important things a Muslim undertakes in his life, as the Prophet said: 'Seeking knowledge is an obligation upon every Muslim'.\n\nReligious knowledge includes the following sciences: creed, jurisprudence, exegesis, hadith, biography, and Arabic language.\n\nAmong the greatest things that distinguish religious knowledge is that it pertains to knowing God Almighty, obeying Him, the fundamentals and branches of religion.",
  },
  {
    id: "a2",
    title: "آداب طالب العلم",
    titleEn: "Etiquettes of the Knowledge Seeker",
    author: "د. محمد البوسعيدي",
    authorEn: "Dr. Mohammed Al-Busaidi",
    category: "التربية الإسلامية",
    categoryEn: "Islamic Education",
    date: "2024-02-10",
    readTime: "10 دقائق",
    excerpt: "لا يكفي أن يكون الطالب طموحاً في طلب العلم، بل يجب أن يArmed بآداب وadolescent ترتقي بعلمه وتخليقه.",
    excerptEn: "It is not enough for the student to be ambitious in seeking knowledge; he must be equipped with etiquettes that elevate his knowledge and character.",
    content: "آداب طالب العلم من أهم ما يجب أن يهتم به كل من seeks طلب العلم الشرعي.\n\nمن هذه الآداب: الإخلاص في الطمع، والkhushoo في العبادة، وAdab المعلم، والصبر على المشقة.",
    contentEn: "The etiquettes of the knowledge seeker are among the most important things that everyone seeking religious knowledge should be concerned with.\n\nThese etiquettes include: sincerity in intention, humility in worship, respect for the teacher, and patience in hardship.",
  },
  {
    id: "a3",
    title: "منهج أهل السنة والجماعة في العقيدة",
    titleEn: "The Methodology of Ahlus-Sunnah wal-Jama'ah in Creed",
    author: "د. يوسف النملي",
    authorEn: "Dr. Yusuf Al-Namli",
    category: "العقيدة",
    categoryEn: "Creed",
    date: "2024-03-05",
    readTime: "12 دقيقة",
    excerpt: "يتناول المقال منهج أهل السنة والجماعة في العقيدة الإسلامية وما يميزه عن المذاهب الأخرى.",
    excerptEn: "The article discusses the methodology of Ahlus-Sunnah wal-Jama'ah in Islamic creed and what distinguishes it from other schools.",
    content: "منهج أهل السنة والجماعة في العقيدة هو المنهج الوسط الذي يavoid التطرف والغلو.\n\nيقوم على الإيمان بالله وملائكته وكتبه ورسله واليوم الآخر والقضاء والقدر خيره وشره.",
    contentEn: "The methodology of Ahlus-Sunnah wal-Jama'ah in creed is the balanced approach that avoids extremism.\n\nIt is based on belief in God, His angels, His books, His messengers, the Last Day, and divine decree, its good and bad.",
  },
  {
    id: "a4",
    title: "فضل تعلم اللغة العربية لفهم القرآن",
    titleEn: "The Virtue of Learning Arabic for Understanding the Quran",
    author: "د. خالد الجبري",
    authorEn: "Dr. Khalid Al-Jabri",
    category: "اللغة العربية",
    categoryEn: "Arabic Language",
    date: "2024-04-12",
    readTime: "7 دقائق",
    excerpt: "تعلم اللغة العربية مفتاح لفهم القرآن الكريم والحديث النبوي فهمًا صحيحاً.",
    excerptEn: "Learning Arabic is the key to understanding the Quran and Prophetic Hadith correctly.",
    content: "لغة العربية هي لغة القرآن الكريم، ومن لا يتعلمها يعسر عليه فهم كتاب الله تعالى.\n\nولذلك حث النبي صلى الله عليه وسلم على تعلم العربية وفضلها.",
    contentEn: "Arabic is the language of the Quran, and whoever does not learn it will find it difficult to understand God's Book.\n\nTherefore, the Prophet, peace be upon him, urged learning Arabic and its virtue.",
  },
  {
    id: "a5",
    title: "أهمية التزكية في الإسلام",
    titleEn: "The Importance of Spiritual Purification in Islam",
    author: "د. سعيد القحطاني",
    authorEn: "Dr. Saeed Al-Qahtani",
    category: "التزكية",
    categoryEn: "Spiritual Purification",
    date: "2024-05-20",
    readTime: "9 دقائق",
    excerpt: "التزكية من أهم مقاصد الشريعة الإسلامية وهي أساس لصلاح الفرد والمجتمع.",
    excerptEn: "Spiritual purification is one of the most important objectives of Islamic Sharia and is fundamental to individual and societal righteousness.",
    content: "التزكية هي تنظيف النفس من الأخلاق الرذيلة وتصفيتها بالصفات الحميدة.\n\nوللإبراهيمية في التزكية مكانة عظيمة في القرآن الكريم.",
    contentEn: "Spiritual purification is the cleansing of the soul from vile character traits and its refinement with praiseworthy qualities.\n\nThe Abrahamic tradition in purification holds a great place in the Quran.",
  },
];

export const research: Research[] = [
  {
    id: "r1",
    title: "تحليل منهجية الاستدلال في كتب الفقه المعاصرة",
    titleEn: "Analyzing Argumentation Methodology in Contemporary Fiqh Books",
    author: "د. عبدالرحمن الشبل",
    authorEn: "Dr. Abdulrahman Al-Shabal",
    field: "أصول الفقه",
    fieldEn: "Principles of Jurisprudence",
    date: "2024-01-20",
    abstract: "يبحث هذا البحث في منهجية الاستدلال الشرعي المستخدمة في كتب الفقه المعاصرة ومدى التزامها بالمناهج الأصيلة.",
    abstractEn: "This research investigates the methodology of religious argumentation used in contemporary Fiqh books and their adherence to authentic methodologies.",
    content: "مقدمة في تحليل منهجية الاستدلال...\n\nيهدف هذا البحث إلى تحليل منهجية الاستدلال الشرعي في كتب الفقه المعاصرة.\n\nوقد توصل البحث إلى عدة نتائج أهمها: التزام معظم الفقهاء بالمناهج الأصيلة.",
    contentEn: "Introduction to analyzing argumentation methodology...\n\nThis research aims to analyze the methodology of religious argumentation in contemporary Fiqh books.\n\nThe research reached several findings, the most important of which: most scholars adhered to authentic methodologies.",
  },
  {
    id: "r2",
    title: "دراسة مقارنة لمناهج التفسير في العصر الحديث",
    titleEn: "Comparative Study of Exegesis Methodologies in the Modern Era",
    author: "د. أحمد الحازمي",
    authorEn: "Dr. Ahmed Al-Hazmi",
    field: "التفسير",
    fieldEn: "Quranic Studies",
    date: "2024-03-15",
    abstract: "مقارنة بين مناهج التفسير المختلفة في العصر الحديث من حيث الأصالة والتجديد.",
    abstractEn: "A comparison between different exegesis methodologies in the modern era in terms of authenticity and renewal.",
    content: "دراسة مقارنة لمناهج التفسير...\n\nيعالج هذا البحث المقارنة بين مناهج التفسير في العصر الحديث.\n\nوقد يمكن التوصل إلى that هناك تطور ملحوظ في مناهج التفسير المعاصر.",
    contentEn: "Comparative study of exegesis methodologies...\n\nThis research addresses the comparison between exegesis methodologies in the modern era.\n\nA notable development in contemporary exegesis methodologies was observed.",
  },
  {
    id: "r3",
    title: "أثر التقنية الحديثة في نشر العلم الشرعي",
    titleEn: "The Impact of Modern Technology on Disseminating Religious Knowledge",
    author: "د. فيصل المطيري",
    authorEn: "Dr. Faisal Al-Mutairi",
    field: "التربية الإسلامية",
    fieldEn: "Islamic Education",
    date: "2024-05-10",
    abstract: "دراسة تحليلية لأثر التقنية الحديثة في وصول العلم الشرعي إلى الناس وتحقيق_access للعلم.",
    abstractEn: "An analytical study on the impact of modern technology in reaching people with religious knowledge and achieving access to knowledge.",
    content: "أثر التقنية الحديثة في نشر العلم الشرعي...\n\nيبحث هذا البحث في كيفيات استخدام التقنية الحديثة في خدمة العلم الشرعي.\n\nوقد أظهرت الدراسة أن التقنية ساهمت في accessibility العلم بشكل غير مسبوق.",
    contentEn: "Impact of modern technology on disseminating religious knowledge...\n\nThis research investigates the ways modern technology is used in serving religious knowledge.\n\nThe study showed that technology has contributed to unprecedented access to knowledge.",
  },
];

export const lectures: Lecture[] = [
  {
    id: "l1",
    title: "أهمية العلم الشرعي في بناء الأمة",
    titleEn: "The Importance of Religious Knowledge in Building the Nation",
    speaker: "د. عبدالله الشرقي",
    speakerEn: "Dr. Abdullah Al-Sharqi",
    date: "2024-02-01",
    duration: "45 دقيقة",
    category: "الدعوة",
    categoryEn: "Da'wah",
    description: "محاضرة تتناول دور العلم الشرعي في بناء الأمة الإسلامية ورقيها.",
    descriptionEn: "A lecture discussing the role of religious knowledge in building and elevating the Islamic nation.",
  },
  {
    id: "l2",
    title: "آداب العالم والمتعلم",
    titleEn: "Etiquettes of the Scholar and the Student",
    speaker: "د. محمد البوسعيدي",
    speakerEn: "Dr. Mohammed Al-Busaidi",
    date: "2024-03-15",
    duration: "35 دقيقة",
    category: "التربية",
    categoryEn: "Education",
    description: "محاضرة في آداب العلماء والطلاب تiting الحضور في مجالس العلم.",
    descriptionEn: "A lecture on the etiquettes of scholars and students emphasizing attendance in scholarly circles.",
  },
  {
    id: "l3",
    title: "كيفية التدبر في القرآن الكريم",
    titleEn: "How to Reflect on the Quran",
    speaker: "د. أحمد الحازمي",
    speakerEn: "Dr. Ahmed Al-Hazmi",
    date: "2024-04-20",
    duration: "50 دقيقة",
    category: "التفسير",
    categoryEn: "Exegesis",
    description: "محاضرة عملية في كيفية تدبر آيات القرآن الكريم والتأمل فيها.",
    descriptionEn: "A practical lecture on how to reflect on and contemplate Quranic verses.",
  },
  {
    id: "l4",
    title: "أهمية السنة النبوية في حياة المسلم",
    titleEn: "The Importance of the Prophetic Sunnah in a Muslim's Life",
    speaker: "د. يوسف النملي",
    speakerEn: "Dr. Yusuf Al-Namli",
    date: "2024-05-10",
    duration: "40 دقيقة",
    category: "الحديث",
    categoryEn: "Hadith",
    description: "محاضرة في أهمية اتباع السنة النبوية الشريفة وال Tightness لها.",
    descriptionEn: "A lecture on the importance of following the Prophetic Sunnah and adhering to it.",
  },
  {
    id: "l5",
    title: "فقه الطهارة بين النظري والتطبيقي",
    titleEn: "Jurisprudence of Purification: Theory and Practice",
    speaker: "د. عبدالرحمن الشبل",
    speakerEn: "Dr. Abdulrahman Al-Shabal",
    date: "2024-06-05",
    duration: "55 دقيقة",
    category: "الفقه",
    categoryEn: "Jurisprudence",
    description: "محاضرة تطبيقية في فقه الطهارة مع الإشارة إلى المستجدات المعاصرة.",
    descriptionEn: "A practical lecture on the jurisprudence of purification with reference to contemporary developments.",
  },
];

export const quizQuestions: QuizQuestion[] = [
  {
    id: "q1",
    question: "ما هو تعريف التوحيد?",
    questionEn: "What is the definition of Tawheed?",
    options: ["إفراد الله تعالى بالعبادة", "الإيمان بالملائكة فقط", "קריאה القرآن", "الصلاة خمس مرات"],
    optionsEn: ["Exclusively devoting worship to God", "Believing in angels only", "Reciting the Quran", "Praying five times"],
    correctIndex: 0,
    explanation: "التوحيد هو إفراد الله تعالى بالعبادة ونفي الشرك عنه.",
    explanationEn: "Tawheed is exclusively devoting worship to God Almighty and denying association with Him.",
  },
  {
    id: "q2",
    question: "كم عدد أقسام التوحيد?",
    questionEn: "How many categories of Tawheed are there?",
    options: ["قسمان", "ثلاثة أقسام", "أربعة أقسام", "خمسة أقسام"],
    optionsEn: ["Two categories", "Three categories", "Four categories", "Five categories"],
    correctIndex: 1,
    explanation: "أقسام التوحيد ثلاثة: توحيد الربوبية، توحيد الألوهية، توحيد الأسماء والصفات.",
    explanationEn: "The categories of Tawheed are three: Tawheed of Lordship, Tawheed of Worship, Tawheed of Names and Attributes.",
  },
  {
    id: "q3",
    question: "ما هو الدليل الشرعي على وحدانية الله تعالى من القرآن?",
    questionEn: "What is the Quranic evidence for God's oneness?",
    options: ["قل هو الله أحد", "اقرأ باسم ربك", "إنا أنزلناه في ليلة القدر", "بسم الله الرحمن الرحيم"],
    optionsEn: ["Say: He is God, the One", "Read in the name of your Lord", "We sent it down in the Night of Decree", "In the name of God, the Most Gracious, the Most Merciful"],
    correctIndex: 0,
    explanation: "سورة الإخلاص هي أوضح دليل على توحيد الله تعالى في القرآن.",
    explanationEn: "Surat Al-Ikhlas is the clearest evidence of God's oneness in the Quran.",
  },
  {
    id: "q4",
    question: "ما هو الدليل الشرعي على وحدانية الله تعالى من القرآن?",
    questionEn: "What is the Quranic evidence for God's oneness?",
    options: ["قل هو الله أحد", "اقرأ باسم ربك", "إنا أنزلناه في ليلة القدر", "بسم الله الرحمن الرحيم"],
    optionsEn: ["Say: He is God, the One", "Read in the name of your Lord", "We sent it down in the Night of Decree", "In the name of God, the Most Gracious, the Most Merciful"],
    correctIndex: 0,
    explanation: "سورة الإخلاص هي أوضح دليل على توحيد الله تعالى في القرآن.",
    explanationEn: "Surat Al-Ikhlas is the clearest evidence of God's oneness in the Quran.",
  },
  {
    id: "q5",
    question: "ما هو أركان الإيمان الستة?",
    questionEn: "What are the six articles of faith?",
    options: [
      "الإيمان بالله والملائكة والكتب والرسل واليوم الآخر والقضاء والقدر",
      "الصلاة والزكاة والصوم والحج والعمرة والتلاوة",
      "التوحيد والنبوات والمعاد",
      "القرآن والسنة والإجماع والقياس",
    ],
    optionsEn: [
      "Belief in God, angels, books, messengers, Last Day, and divine decree",
      "Prayer, zakat, fasting, pilgrimage, umrah, and recitation",
      "Tawheed, prophethood, and resurrection",
      "Quran, Sunnah, consensus, and analogy",
    ],
    correctIndex: 0,
    explanation: "أركان الإيمان الستة هي: الله، الملائكة، الكتب، الرسل، اليوم الآخر، القضاء والقدر.",
    explanationEn: "The six articles of faith are: God, angels, books, messengers, Last Day, and divine decree.",
  },
  {
    id: "q6",
    question: "ما هي الكتب المذكورة في القرآن الكريم?",
    questionEn: "What are the books mentioned in the Quran?",
    options: ["الإنجيل وال torah والزبور والصحف", "القرآن فقط", "الكتب الربعة", "المصحف والسنن الستة"],
    optionsEn: ["The Gospel, Torah, Psalms, and Scrolls", "Only the Quran", "The four books", "The Quran and the six canonical collections"],
    correctIndex: 0,
    explanation: "الكتب المذكورة في القرآن هي: التوراة والإنجيل والزبور والصحف.",
    explanationEn: "The books mentioned in the Quran are: Torah, Gospel, Psalms, and Scrolls.",
  },
  {
    id: "q7",
    question: "من هو خاتم الأنبياء والمرسلين?",
    questionEn: "Who is the Seal of the Prophets and Messengers?",
    options: ["محمد صلى الله عليه وسلم", "عيسى عليه السلام", "موسى عليه السلام", "إبراهيم عليه السلام"],
    optionsEn: ["Muhammad, peace be upon him", "Jesus, peace be upon him", "Moses, peace be upon him", "Abraham, peace be upon him"],
    correctIndex: 0,
    explanation: "محمد صلى الله عليه وسلم هو خاتم الأنبياء والمرسلين.",
    explanationEn: "Muhammad, peace be upon him, is the Seal of the Prophets and Messengers.",
  },
  {
    id: "q8",
    question: "ما هو أول واجب على المكلف?",
    questionEn: "What is the first obligation upon a accountable person?",
    options: ["طلب العلم", "الصلاة", "الزكاة", "الصوم"],
    optionsEn: ["Seeking knowledge", "Prayer", "Zakat", "Fasting"],
    correctIndex: 0,
    explanation: "طلب العلم الشرعي هو أول واجب على المكلف لقوله صلى الله عليه وسلم: 'طلب العلم فريضة'.",
    explanationEn: "Seeking religious knowledge is the first obligation based on the hadith: 'Seeking knowledge is an obligation'.",
  },
  {
    id: "q9",
    question: "ما هي مراحل طلب العلم الشرعي?",
    questionEn: "What are the stages of seeking religious knowledge?",
    options: [
      "المقدمة ثم العقيدة ثم الفقه ثم التفسير ثم الحديث",
      "القراءة فقط",
      "الحفظ فقط",
      "الاستماع فقط",
    ],
    optionsEn: [
      "Introduction then creed then jurisprudence then exegesis then hadith",
      "Reading only",
      "Memorization only",
      "Listening only",
    ],
    correctIndex: 0,
    explanation: "مراحل طلب العلم الشرعي تبدأ بالمقدمة ثم العقيدة ثم الفقه ثم التفسير ثم الحديث.",
    explanationEn: "Stages of seeking religious knowledge begin with introduction, then creed, jurisprudence, exegesis, and hadith.",
  },
  {
    id: "q10",
    question: "ما هو本书 الذي يشتمل على أحاديث النبي صلى الله عليه وسلم?",
    questionEn: "What book contains the Prophet's hadith?",
    options: ["صحيح البخاري", "القرآن الكريم", "العقيدة الواسطية", "الآجرومية"],
    optionsEn: ["Sahih al-Bukhari", "The Holy Quran", "The Wasseetiyyah Creed", "The Ajrumiyyah"],
    correctIndex: 0,
    explanation: "صحيح البخاري هو أصح كتاب بعد كتاب الله تعالى.",
    explanationEn: "Sahih al-Bukhari is the most authentic book after the Book of God Almighty.",
  },
];

export const studentData = {
  name: "أحمد بن محمد العلي",
  nameEn: "Ahmed bin Mohammed Al-Ali",
  email: "ahmed@example.com",
  joinDate: "2024-01-01",
  avatar: "/avatars/student.jpg",
  activeCourses: ["aqeedah-101", "usool-fiqh-101"],
  completedCourses: ["sira-101"],
  certificates: [
    {
      id: "cert-1",
      courseTitle: "السيرة النبوية: دراسة تحليلية",
      courseTitleEn: "Prophetic Biography: Analytical Study",
      instructor: "د. فيصل بن عبدالعزيز المطيري",
      instructorEn: "Dr. Faisal Al-Mutairi",
      completionDate: "2024-06-15",
    },
  ],
  stats: {
    totalCourses: 12,
    completedCourses: 1,
    activeCourses: 2,
    certificatesEarned: 1,
    totalHoursLearned: 45,
    averageGrade: 88,
  },
  recentActivity: [
    { type: "lesson", title: "الأصل الأول: معرفة الله", titleEn: "The First Principle: Knowing Allah", course: "شرح الأصول الثلاثة", courseEn: "Explanation of The Three Fundamental Principles", date: "2024-06-20" },
    { type: "quiz", title: "اختبار الوحدة الأولى", titleEn: "Unit 1 Assessment", course: "أصول الفقه للمبتدئين", courseEn: "Principles of Islamic Jurisprudence", date: "2024-06-19" },
    { type: "lesson", title: "الدليل الشرعي الأول: الكتاب", titleEn: "The First Evidence: The Quran", course: "أصول الفقه للمبتدئين", courseEn: "Principles of Islamic Jurisprudence", date: "2024-06-18" },
  ],
};

export function isCourseUnlocked(course: Course) {
  if (course.level === "مبتدئ") return true;

  const previousLevel = course.level === "متوسط" ? "مبتدئ" : "متوسط";
  const previousLevelCourses = courses.filter((candidate) => candidate.level === previousLevel);

  return previousLevelCourses.length > 0 && previousLevelCourses.every(
    (candidate) =>
      studentData.completedCourses.includes(candidate.id) || candidate.progress === 100
  );
}

export const faqData = [
  {
    question: "كيف أسجل في الأكاديمية?",
    questionEn: "How do I register at the academy?",
    answer: "يمكنك التسجيل من خلال صفحة التسجيل وملء البيانات المطلوبة. التسجيل مجاني بالكامل.",
    answerEn: "You can register through the registration page by filling in the required information. Registration is completely free.",
  },
  {
    question: "هل الدورات مجانية?",
    questionEn: "Are the courses free?",
    answer: "نعم، جميع الدورات التعليمية في أكاديمية سراج مجانية بالكامل. نؤمن بأن العلم حق للجميع.",
    answerEn: "Yes, all courses at SIRAJ Academy are completely free. We believe knowledge is a right for everyone.",
  },
  {
    question: "هل أحصل على شهادة إتمام?",
    questionEn: "Do I get a completion certificate?",
    answer: "نعم، عند إتمام الدورة بنجاح واجتياز الاختبار النهائي ستحصل على شهادة إتمام مجانية.",
    answerEn: "Yes, upon successful completion of the course and passing the final assessment, you will receive a free completion certificate.",
  },
  {
    question: "كم استغرق إتمام الدورة الواحدة?",
    questionEn: "How long does it take to complete one course?",
    answer: "تختلف مدة الدورات حسب موضوعها ومستواها، لكنها عادة ما تتراوح بين 6 و16 أسبوعاً.",
    answerEn: "Course duration varies by topic and level, but typically ranges from 6 to 16 weeks.",
  },
  {
    question: "هل يمكنني تعلم الدورات على الهاتف؟",
    questionEn: "Can I learn on mobile?",
    answer: "نعم، منصة سراج متوافقة مع جميع الأجهزة بما في ذلك الهواتف الذكية والأجهزة اللوحية.",
    answerEn: "Yes, SIRAJ platform is compatible with all devices including smartphones and tablets.",
  },
  {
    question: "ما هي اللغات المدعومة?",
    questionEn: "What languages are supported?",
    answer: "تتوفر المنصة باللغتين العربية والإنجليزية مع دعم كامل لاتجاه الكتابة RTL/LTR.",
    answerEn: "The platform is available in Arabic and English with full RTL/LTR direction support.",
  },
  {
    question: "هل يمكنني تحميل الكتب من المكتبة?",
    questionEn: "Can I download books from the library?",
    answer: "نعم، يمكنك قراءة الكتب مباشرة من المكتبة. نعمل على إضافة ميزة التحميل في التحديثات القادمة.",
    answerEn: "Yes, you can read books directly from the library. We are working on adding download functionality in future updates.",
  },
  {
    question: "كيف أتواصل مع الدعم الفني?",
    questionEn: "How do I contact technical support?",
    answer: "يمكنك التواصل معنا من خلال صفحة اتصل بنا أو عبر البريد الإلكتروني support@siraj.edu",
    answerEn: "You can contact us through the contact page or via email at support@siraj.edu",
  },
];
