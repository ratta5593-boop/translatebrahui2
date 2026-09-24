const BRAHUI_LEXICON = {
  // Pronouns
  "i": { arabic: "\u0627\u06CC", latin: "I", urdu: "\u0645\u06CC\u06BA", english: "I", pos: "pronoun", root: "i", gloss: "1st person singular" },
  "me": { arabic: "\u06A9\u0646\u06D2", latin: "Kane", urdu: "\u0645\u062C\u06BE\u06D2", english: "me", pos: "pronoun", root: "kane", gloss: "1st person accusative/dative" },
  "my": { arabic: "\u06A9\u0646\u0627", latin: "Kan-na", urdu: "\u0645\u06CC\u0631\u0627", english: "my", pos: "pronoun", root: "kan-na", gloss: "1st person genitive" },
  "mine": { arabic: "\u06A9\u0646\u0627", latin: "Kan-na", urdu: "\u0645\u06CC\u0631\u0627", english: "mine", pos: "pronoun", root: "kan-na", gloss: "1st person genitive" },
  "you": { arabic: "\u0646\u06CC", latin: "N\u012B", urdu: "\u0622\u067E", english: "you", pos: "pronoun", root: "n\u012B", gloss: "2nd person singular" },
  "your": { arabic: "\u0646\u0627", latin: "N\u0101", urdu: "\u0622\u067E \u06A9\u0627", english: "your", pos: "pronoun", root: "n\u0101", gloss: "2nd person genitive" },
  "yours": { arabic: "\u0646\u0627", latin: "N\u0101", urdu: "\u0622\u067E \u06A9\u0627", english: "yours", pos: "pronoun", root: "n\u0101", gloss: "2nd person genitive" },
  "he": { arabic: "\u0627\u0648", latin: "\u014C", urdu: "\u0648\u06C1", english: "he", pos: "pronoun", root: "\u014D", gloss: "3rd person singular" },
  "she": { arabic: "\u0627\u0648", latin: "\u014C", urdu: "\u0648\u06C1", english: "she", pos: "pronoun", root: "\u014D", gloss: "3rd person singular" },
  "it": { arabic: "\u062F\u0627", latin: "D\u0101", urdu: "\u06CC\u06C1", english: "it", pos: "pronoun", root: "d\u0101", gloss: "proximate demonstrative" },
  "his": { arabic: "\u0627\u0648\u0646\u0627", latin: "Ona", urdu: "\u0627\u0633 \u06A9\u0627", english: "his", pos: "pronoun", root: "ona", gloss: "3rd person genitive" },
  "her": { arabic: "\u0627\u0648\u0646\u0627", latin: "Ona", urdu: "\u0627\u0633 \u06A9\u0627", english: "her", pos: "pronoun", root: "ona", gloss: "3rd person genitive" },
  "we": { arabic: "\u0646\u0646", latin: "Nan", urdu: "\u06C1\u0645", english: "we", pos: "pronoun", root: "nan", gloss: "1st person plural" },
  "us": { arabic: "\u0646\u0646\u0646\u06D2", latin: "Nan-ne", urdu: "\u06C1\u0645\u06CC\u06BA", english: "us", pos: "pronoun", root: "nan-ne", gloss: "1st person plural accusative" },
  "our": { arabic: "\u0646\u0646\u0627", latin: "Nan-na", urdu: "\u06C1\u0645\u0627\u0631\u0627", english: "our", pos: "pronoun", root: "nan-na", gloss: "1st person plural genitive" },
  "they": { arabic: "\u0627\u0648\u0641\u06A9", latin: "Ofk", urdu: "\u0648\u06C1", english: "they", pos: "pronoun", root: "ofk", gloss: "3rd person plural" },
  "them": { arabic: "\u0627\u0648\u0641\u062A\u06D2", latin: "Ofte", urdu: "\u0627\u0646\u06C1\u06CC\u06BA", english: "them", pos: "pronoun", root: "ofte", gloss: "3rd person plural accusative" },
  "their": { arabic: "\u0627\u0648\u0641\u062A\u0627", latin: "Ofta", urdu: "\u0627\u0646 \u06A9\u0627", english: "their", pos: "pronoun", root: "ofta", gloss: "3rd person plural genitive" },
  "this": { arabic: "\u062F\u0627", latin: "D\u0101", urdu: "\u06CC\u06C1", english: "this", pos: "pronoun", root: "d\u0101", gloss: "demonstrative this" },
  "that": { arabic: "\u0627\u0648", latin: "\u014C", urdu: "\u0648\u06C1", english: "that", pos: "pronoun", root: "\u014D", gloss: "demonstrative that" },
  "these": { arabic: "\u062F\u0627\u0641\u06A9", latin: "D\u0101fk", urdu: "\u06CC\u06C1 \u0633\u0628", english: "these", pos: "pronoun", root: "d\u0101fk", gloss: "plural these" },
  "those": { arabic: "\u0627\u0648\u0641\u06A9", latin: "Ofk", urdu: "\u0648\u06C1 \u0633\u0628", english: "those", pos: "pronoun", root: "ofk", gloss: "plural those" },
  // Copula & Auxiliary
  "am": { arabic: "\u0627\u064F\u0679", latin: "u\u0163", urdu: "\u06C1\u0648\u06BA", english: "am", pos: "verb", root: "an", gloss: "1st person singular copula" },
  "is": { arabic: "\u0621\u0650", latin: "e", urdu: "\u06C1\u06D2", english: "is", pos: "verb", root: "an", gloss: "3rd person singular copula" },
  "are": { arabic: "\u0627\u064F\u0633", latin: "us", urdu: "\u06C1\u06CC\u06BA", english: "are", pos: "verb", root: "an", gloss: "2nd person / plural copula" },
  "was": { arabic: "\u0626\u0633", latin: "as", urdu: "\u062A\u06BE\u0627", english: "was", pos: "verb", root: "as", gloss: "past tense copula" },
  "were": { arabic: "\u0626\u0633\u0631", latin: "asur", urdu: "\u062A\u06BE\u06D2", english: "were", pos: "verb", root: "as", gloss: "past tense plural copula" },
  "be": { arabic: "\u0645\u0631", latin: "mar", urdu: "\u06C1\u0648\u0646\u0627", english: "be", pos: "verb", root: "mar", gloss: "existential verb" },
  // Interrogatives
  "what": { arabic: "\u0627\u0646\u062A", latin: "ant", urdu: "\u06A9\u06CC\u0627", english: "what", pos: "question", root: "ant", gloss: "interrogative what" },
  "where": { arabic: "\u0627\u0631\u0627\u0646\u06AF", latin: "ar\u0101ng", urdu: "\u06A9\u06C1\u0627\u06BA", english: "where", pos: "question", root: "ar\u0101ng", gloss: "interrogative locative" },
  "who": { arabic: "\u062F\u06CC\u0631", latin: "d\u0113r", urdu: "\u06A9\u0648\u0646", english: "who", pos: "question", root: "d\u0113r", gloss: "interrogative person" },
  "why": { arabic: "\u0627\u0646\u062A\u06CC", latin: "anti", urdu: "\u06A9\u06CC\u0648\u06BA", english: "why", pos: "question", root: "anti", gloss: "interrogative reason" },
  "how": { arabic: "\u0627\u0645\u0631", latin: "amar", urdu: "\u06A9\u06CC\u0633\u06D2", english: "how", pos: "question", root: "amar", gloss: "interrogative manner" },
  "when": { arabic: "\u06C1\u0631\u0627 \u0648\u062E\u062A", latin: "har\u0101 wakht", urdu: "\u06A9\u0628", english: "when", pos: "question", root: "wakht", gloss: "interrogative time" },
  // Common Nouns
  "name": { arabic: "\u067E\u0650\u0646", latin: "pin", urdu: "\u0646\u0627\u0645", english: "name", pos: "noun", root: "pin", gloss: "identity / name" },
  "water": { arabic: "\u062F\u06CC\u0631", latin: "d\u012Br", urdu: "\u067E\u0627\u0646\u06CC", english: "water", pos: "noun", root: "d\u012Br", gloss: "Dravidian water" },
  "bread": { arabic: "\u0627\u06CC\u0644\u06CC\u0634", latin: "elesh", urdu: "\u0631\u0648\u0679\u06CC", english: "bread", pos: "noun", root: "elesh", gloss: "flatbread" },
  "food": { arabic: "\u063A\u0644\u06C1 / \u06A9\u064F\u0646\u0646\u06AF", latin: "kunning", urdu: "\u06A9\u06BE\u0627\u0646\u0627", english: "food", pos: "noun", root: "kun", gloss: "sustenance" },
  "home": { arabic: "\u0627\u064F\u0631\u0627", latin: "ur\u0101", urdu: "\u06AF\u06BE\u0631", english: "home", pos: "noun", root: "ur", gloss: "house / abode" },
  "house": { arabic: "\u0627\u064F\u0631\u0627", latin: "ur\u0101", urdu: "\u0645\u06A9\u0627\u0646", english: "house", pos: "noun", root: "ur", gloss: "building / house" },
  "book": { arabic: "\u06A9\u062A\u0627\u0628", latin: "kit\u0101b", urdu: "\u06A9\u062A\u0627\u0628", english: "book", pos: "noun", root: "kit\u0101b", gloss: "written work" },
  "city": { arabic: "\u0634\u0627\u06C1\u0631", latin: "shahr", urdu: "\u0634\u06C1\u0631", english: "city", pos: "noun", root: "shahr", gloss: "urban settlement" },
  "village": { arabic: "\u062C\u06BE\u0644 / \u062E\u0644\u0642", latin: "jhal", urdu: "\u06AF\u0627\u0624\u06BA", english: "village", pos: "noun", root: "jhal", gloss: "rural community" },
  "country": { arabic: "\u0688\u06CC\u06C1\u06C1", latin: "d\u0113h", urdu: "\u0645\u0644\u06A9", english: "country", pos: "noun", root: "d\u0113h", gloss: "homeland / nation" },
  "friend": { arabic: "\u0633\u0646\u06AF\u062A", latin: "sangat", urdu: "\u062F\u0648\u0633\u062A", english: "friend", pos: "noun", root: "sangat", gloss: "companion / friend" },
  "brother": { arabic: "\u0627\u06CC\u0644\u0645", latin: "elum", urdu: "\u0628\u06BE\u0627\u0626\u06CC", english: "brother", pos: "noun", root: "elum", gloss: "sibling male" },
  "sister": { arabic: "\u0627\u06CC\u0691", latin: "e\u0155", urdu: "\u0628\u06C1\u0646", english: "sister", pos: "noun", root: "e\u0155", gloss: "sibling female" },
  "father": { arabic: "\u0628\u0627\u0648\u06C1", latin: "b\u0101wa", urdu: "\u0648\u0627\u0644\u062F", english: "father", pos: "noun", root: "b\u0101wa", gloss: "male parent" },
  "mother": { arabic: "\u0622\u0626\u06CC", latin: "\u0101'\u012B", urdu: "\u0648\u0627\u0644\u062F\u06C1", english: "mother", pos: "noun", root: "\u0101'\u012B", gloss: "female parent" },
  "man": { arabic: "\u0628\u0646\u062F\u063A", latin: "bandagh", urdu: "\u0622\u062F\u0645\u06CC", english: "man", pos: "noun", root: "bandagh", gloss: "human / male" },
  "woman": { arabic: "\u0632\u0627\u0644\u0628\u0648\u0644", latin: "z\u0101lb\u016Bl", urdu: "\u0639\u0648\u0631\u062A", english: "woman", pos: "noun", root: "z\u0101lb\u016Bl", gloss: "female" },
  "child": { arabic: "\u0686\u0646\u0627", latin: "chun\u0101", urdu: "\u0628\u0686\u06C1", english: "child", pos: "noun", root: "chun\u0101", gloss: "young human" },
  "boy": { arabic: "\u0628\u0627\u0686\u06A9", latin: "b\u0101chak", urdu: "\u0644\u0691\u06A9\u0627", english: "boy", pos: "noun", root: "b\u0101chak", gloss: "young male" },
  "girl": { arabic: "\u0645\u0633\u0691", latin: "masi\u0155", urdu: "\u0644\u0691\u06A9\u06CC", english: "girl", pos: "noun", root: "masi\u0155", gloss: "young female" },
  "day": { arabic: "\u062F\u06D2", latin: "d\u0113", urdu: "\u062F\u0646", english: "day", pos: "noun", root: "d\u0113", gloss: "daytime / sun" },
  "night": { arabic: "\u0646\u0646", latin: "nan", urdu: "\u0631\u0627\u062A", english: "night", pos: "noun", root: "nan", gloss: "night period" },
  "sun": { arabic: "\u062F\u06D2", latin: "d\u0113", urdu: "\u0633\u0648\u0631\u062C", english: "sun", pos: "noun", root: "d\u0113", gloss: "solar body" },
  "moon": { arabic: "\u062A\u0648\u06A9", latin: "t\u014Dk", urdu: "\u0686\u0627\u0646\u062F", english: "moon", pos: "noun", root: "t\u014Dk", gloss: "lunar body" },
  "heart": { arabic: "\u0627\u0633\u062A", latin: "ust", urdu: "\u062F\u0644", english: "heart", pos: "noun", root: "ust", gloss: "inner feeling" },
  "eye": { arabic: "\u062E\u0627\u0646", latin: "kh\u0101n", urdu: "\u0622\u0646\u06A9\u06BE", english: "eye", pos: "noun", root: "kh\u0101n", gloss: "vision organ" },
  "hand": { arabic: "\u062F\u0648", latin: "d\u016B", urdu: "\u06C1\u0627\u062A\u06BE", english: "hand", pos: "noun", root: "d\u016B", gloss: "upper limb" },
  "road": { arabic: "\u06A9\u0633\u0631", latin: "kasar", urdu: "\u0631\u0627\u0633\u062A\u06C1", english: "road", pos: "noun", root: "kasar", gloss: "pathway" },
  "mountain": { arabic: "\u0645\u0634", latin: "mash", urdu: "\u067E\u06C1\u0627\u0691", english: "mountain", pos: "noun", root: "mash", gloss: "high peak" },
  "word": { arabic: "\u06C1\u06CC\u062A", latin: "h\u012Bt", urdu: "\u0628\u0627\u062A", english: "word", pos: "noun", root: "h\u012Bt", gloss: "speech / utterance" },
  "language": { arabic: "\u0628\u0648\u0644 / \u0632\u0628\u0627\u0646", latin: "b\u014Dl", urdu: "\u0632\u0628\u0627\u0646", english: "language", pos: "noun", root: "b\u014Dl", gloss: "tongue" },
  "brahui": { arabic: "\u0628\u0631\u0627\u06C1\u0648\u0626\u06CC", latin: "Br\xE1hu\xED", urdu: "\u0628\u0631\u0627\u06C1\u0648\u0626\u06CC", english: "Brahui", pos: "noun", root: "br\xE1hu\xED", gloss: "Brahui language/people" },
  "urdu": { arabic: "\u0627\u0631\u062F\u0648", latin: "Urdu", urdu: "\u0627\u0631\u062F\u0648", english: "Urdu", pos: "noun", root: "urdu", gloss: "Urdu language" },
  "english": { arabic: "\u0627\u0646\u06AF\u0631\u06CC\u0632\u06CC", latin: "Angr\u0113z\u012B", urdu: "\u0627\u0646\u06AF\u0631\u06CC\u0632\u06CC", english: "English", pos: "noun", root: "english", gloss: "English language" },
  "school": { arabic: "\u0627\u0633\u06A9\u0648\u0644", latin: "isk\u016Bl", urdu: "\u0627\u0633\u06A9\u0648\u0644", english: "school", pos: "noun", root: "isk\u016Bl", gloss: "educational institute" },
  "class": { arabic: "\u062C\u0645\u0627\u0639\u062A", latin: "jam\u0101'at", urdu: "\u062C\u0645\u0627\u0639\u062A", english: "class", pos: "noun", root: "jam\u0101'at", gloss: "academic class" },
  "classes": { arabic: "\u062C\u0645\u0627\u0639\u062A \u0622\u062A\u0627", latin: "jam\u0101'at-\u0101t\u0101", urdu: "\u062C\u0645\u0627\u0639\u062A\u06CC\u06BA", english: "classes", pos: "noun", root: "jam\u0101'at", gloss: "academic classes" },
  "grade": { arabic: "\u062C\u0645\u0627\u0639\u062A", latin: "jam\u0101'at", urdu: "\u062C\u0645\u0627\u0639\u062A", english: "grade", pos: "noun", root: "jam\u0101'at", gloss: "grade level" },
  "teacher": { arabic: "\u0627\u0633\u062A\u0627\u062F", latin: "ust\u0101d", urdu: "\u0627\u0633\u062A\u0627\u062F", english: "teacher", pos: "noun", root: "ust\u0101d", gloss: "instructor" },
  "student": { arabic: "\u0634\u0627\u06AF\u0631\u062F", latin: "sh\u0101gird", urdu: "\u0637\u0627\u0644\u0628 \u0639\u0644\u0645", english: "student", pos: "noun", root: "sh\u0101gird", gloss: "learner" },
  "work": { arabic: "\u06A9\u0627\u0631\u06CC\u0645", latin: "k\u0101r\u012Bm", urdu: "\u06A9\u0627\u0645", english: "work", pos: "noun", root: "k\u0101r\u012Bm", gloss: "labor / task" },
  "money": { arabic: "\u0632\u0631", latin: "zar", urdu: "\u0631\u0648\u067E\u06CC\u06C1", english: "money", pos: "noun", root: "zar", gloss: "currency" },
  "time": { arabic: "\u0648\u062E\u062A", latin: "wakht", urdu: "\u0648\u0642\u062A", english: "time", pos: "noun", root: "wakht", gloss: "duration / period" },
  "quetta": { arabic: "\u06A9\u0648\u0626\u0679\u06C1", latin: "Quetta", urdu: "\u06A9\u0648\u0626\u0679\u06C1", english: "Quetta", pos: "noun", root: "quetta", gloss: "city" },
  "kalat": { arabic: "\u0642\u0644\u0627\u062A", latin: "Qal\u0101t", urdu: "\u0642\u0644\u0627\u062A", english: "Kalat", pos: "noun", root: "qal\u0101t", gloss: "historic capital" },
  "balochistan": { arabic: "\u0628\u0644\u0648\u0686\u0633\u062A\u0627\u0646", latin: "Bal\u014Dchist\u0101n", urdu: "\u0628\u0644\u0648\u0686\u0633\u062A\u0627\u0646", english: "Balochistan", pos: "noun", root: "balochistan", gloss: "province" },
  "pakistan": { arabic: "\u067E\u0627\u06A9\u0633\u062A\u0627\u0646", latin: "P\u0101kist\u0101n", urdu: "\u067E\u0627\u06A9\u0633\u062A\u0627\u0646", english: "Pakistan", pos: "noun", root: "pakistan", gloss: "country" },
  "help": { arabic: "\u06A9\u0645\u06A9", latin: "kumak", urdu: "\u0645\u062F\u062F", english: "help", pos: "noun", root: "kumak", gloss: "assistance" },
  // Numbers & Ordinals
  "one": { arabic: "\u0627\u0633\u06CC\u0679", latin: "as\u012B\u0163", urdu: "\u0627\u06CC\u06A9", english: "one", pos: "noun", root: "as", gloss: "cardinal 1" },
  "1": { arabic: "\u0627\u0633\u06CC\u0679", latin: "as\u012B\u0163", urdu: "\u0627\u06CC\u06A9", english: "1", pos: "noun", root: "as", gloss: "cardinal 1" },
  "first": { arabic: "\u0627\u0648\u0644\u06CC\u06A9\u0648", latin: "awwal\u012Bko", urdu: "\u067E\u06C1\u0644\u06CC / \u067E\u06C1\u0644\u0627", english: "first", pos: "adjective", root: "awwal", gloss: "ordinal 1st" },
  "1st": { arabic: "\u0627\u0648\u0644\u06CC\u06A9\u0648", latin: "awwal\u012Bko", urdu: "\u067E\u06C1\u0644\u06CC / \u067E\u06C1\u0644\u0627", english: "1st", pos: "adjective", root: "awwal", gloss: "ordinal 1st" },
  "two": { arabic: "\u0627\u0650\u0631\u0627\u0679", latin: "ir\u0101\u0163", urdu: "\u062F\u0648", english: "two", pos: "noun", root: "ir", gloss: "cardinal 2" },
  "2": { arabic: "\u0627\u0650\u0631\u0627\u0679", latin: "ir\u0101\u0163", urdu: "\u062F\u0648", english: "2", pos: "noun", root: "ir", gloss: "cardinal 2" },
  "second": { arabic: "\u0627\u0631\u0627\u0645\u06CC", latin: "ir\u0101m\u012B", urdu: "\u062F\u0648\u0633\u0631\u0627", english: "second", pos: "adjective", root: "ir\u0101", gloss: "ordinal 2nd" },
  "2nd": { arabic: "\u0627\u0631\u0627\u0645\u06CC", latin: "ir\u0101m\u012B", urdu: "\u062F\u0648\u0633\u0631\u0627", english: "2nd", pos: "adjective", root: "ir\u0101", gloss: "ordinal 2nd" },
  "three": { arabic: "\u0645\u0633\u0679", latin: "musi\u0163", urdu: "\u062A\u06CC\u0646", english: "three", pos: "noun", root: "mus", gloss: "cardinal 3" },
  "3": { arabic: "\u0645\u0633\u0679", latin: "musi\u0163", urdu: "\u062A\u06CC\u0646", english: "3", pos: "noun", root: "mus", gloss: "cardinal 3" },
  "third": { arabic: "\u0645\u0633\u0645\u06CC", latin: "musm\u012B", urdu: "\u062A\u06CC\u0633\u0631\u0627", english: "third", pos: "adjective", root: "mus", gloss: "ordinal 3rd" },
  "3rd": { arabic: "\u0645\u0633\u0645\u06CC", latin: "musm\u012B", urdu: "\u062A\u06CC\u0633\u0631\u0627", english: "3rd", pos: "adjective", root: "mus", gloss: "ordinal 3rd" },
  "four": { arabic: "\u0686\u0627\u0631", latin: "ch\u0101r", urdu: "\u0686\u0627\u0631", english: "four", pos: "noun", root: "ch\u0101r", gloss: "cardinal 4" },
  "five": { arabic: "\u067E\u0646\u062C", latin: "panj", urdu: "\u067E\u0627\u0646\u0686", english: "five", pos: "noun", root: "panj", gloss: "cardinal 5" },
  // Verbs
  "go": { arabic: "\u06C1\u0646", latin: "hin", urdu: "\u062C\u0627\u0624", english: "go", pos: "verb", root: "hin", gloss: "movement away" },
  "going": { arabic: "\u06C1\u0646\u0646\u06AF \u0679\u06CC", latin: "hining \u0163\u012B", urdu: "\u062C\u0627 \u0631\u06C1\u0627", english: "going", pos: "verb", root: "hin", gloss: "present continuous" },
  "went": { arabic: "\u06C1\u0646\u0627", latin: "hin\u0101", urdu: "\u06AF\u06CC\u0627", english: "went", pos: "verb", root: "hin", gloss: "past motion" },
  "come": { arabic: "\u0628\u0631", latin: "bara", urdu: "\u0622\u0624", english: "come", pos: "verb", root: "ban", gloss: "movement toward" },
  "coming": { arabic: "\u0628\u0646\u0646\u06AF \u0679\u06CC", latin: "baning \u0163\u012B", urdu: "\u0622 \u0631\u06C1\u0627", english: "coming", pos: "verb", root: "ban", gloss: "continuous approach" },
  "came": { arabic: "\u0628\u0633", latin: "bas", urdu: "\u0622\u06CC\u0627", english: "came", pos: "verb", root: "ban", gloss: "past arrival" },
  "eat": { arabic: "\u06A9\u064F\u0646", latin: "kun", urdu: "\u06A9\u06BE\u0627\u0624", english: "eat", pos: "verb", root: "kun", gloss: "ingest" },
  "drink": { arabic: "\u062F\u06CC\u0631 \u06A9\u064F\u0646", latin: "d\u012Br kun", urdu: "\u067E\u06CC\u0648", english: "drink", pos: "verb", root: "kun", gloss: "consume liquid" },
  "see": { arabic: "\u062E\u0646", latin: "khan", urdu: "\u062F\u06CC\u06A9\u06BE\u0648", english: "see", pos: "verb", root: "khan", gloss: "visual perception" },
  "saw": { arabic: "\u062E\u0646\u0627", latin: "khan\u0101", urdu: "\u062F\u06CC\u06A9\u06BE\u0627", english: "saw", pos: "verb", root: "khan", gloss: "past perception" },
  "say": { arabic: "\u067E\u0627", latin: "p\u0101", urdu: "\u06A9\u06C1\u0648", english: "say", pos: "verb", root: "p\u0101", gloss: "speak" },
  "said": { arabic: "\u067E\u0627\u0631\u06D2", latin: "p\u0101re", urdu: "\u06A9\u06C1\u0627", english: "said", pos: "verb", root: "p\u0101", gloss: "past speech" },
  "speak": { arabic: "\u06C1\u06CC\u062A \u06A9\u0691", latin: "h\u012Bt ka\u0155", urdu: "\u0628\u0648\u0644\u0648", english: "speak", pos: "verb", root: "h\u012Bt", gloss: "communicate" },
  "do": { arabic: "\u06A9\u0691", latin: "ka\u0155", urdu: "\u06A9\u0631\u0648", english: "do", pos: "verb", root: "kan", gloss: "action" },
  "did": { arabic: "\u06A9\u0631\u06CC", latin: "kare", urdu: "\u06A9\u06CC\u0627", english: "did", pos: "verb", root: "kan", gloss: "past action" },
  "know": { arabic: "\u0633\u06C1\u06CC \u0627\u064F\u0679", latin: "sah\u012B u\u0163", urdu: "\u062C\u0627\u0646\u062A\u0627 \u06C1\u0648\u06BA", english: "know", pos: "verb", root: "sah\u012B", gloss: "cognition" },
  "want": { arabic: "\u067E\u06A9\u0627\u0631 \u0621\u0650", latin: "pak\u0101r e", urdu: "\u0686\u0627\u06C1\u06CC\u06D2", english: "want", pos: "verb", root: "pak\u0101r", gloss: "desire" },
  "need": { arabic: "\u0636\u0631\u0648\u0631\u062A \u0621\u0650", latin: "zar\u016Brat e", urdu: "\u0636\u0631\u0648\u0631\u062A \u06C1\u06D2", english: "need", pos: "verb", root: "zar\u016Brat", gloss: "requirement" },
  "give": { arabic: "\u0627\u06CC\u062A\u0631", latin: "\u0113tir", urdu: "\u062F\u0648", english: "give", pos: "verb", root: "\u0113", gloss: "transfer" },
  "take": { arabic: "\u06C1\u0644", latin: "hal", urdu: "\u0644\u0648", english: "take", pos: "verb", root: "hal", gloss: "acquire" },
  "read": { arabic: "\u062E\u0648\u0627\u0646\u0648\u06C1", latin: "khw\u0101niva", urdu: "\u067E\u0691\u06BE\u062A\u0627 \u06C1\u0648\u06BA", english: "read", pos: "verb", root: "khw\u0101n", gloss: "study / read" },
  "study": { arabic: "\u062E\u0648\u0627\u0646\u0648\u06C1", latin: "khw\u0101niva", urdu: "\u067E\u0691\u06BE\u062A\u0627 \u06C1\u0648\u06BA", english: "study", pos: "verb", root: "khw\u0101n", gloss: "study / read" },
  "studying": { arabic: "\u062E\u0648\u0627\u0646\u0646\u06AF \u0679\u06CC", latin: "khw\u0101ning \u0163\u012B", urdu: "\u067E\u0691\u06BE \u0631\u06C1\u0627", english: "studying", pos: "verb", root: "khw\u0101n", gloss: "continuous study" },
  "studies": { arabic: "\u062E\u0648\u0627\u0646\u06CC\u06A9", latin: "khw\u0101nik", urdu: "\u067E\u0691\u06BE\u062A\u0627 \u06C1\u06D2", english: "studies", pos: "verb", root: "khw\u0101n", gloss: "3rd person study" },
  "studied": { arabic: "\u062E\u0648\u0627\u0646\u0627", latin: "khw\u0101n\u0101", urdu: "\u067E\u0691\u06BE\u0627", english: "studied", pos: "verb", root: "khw\u0101n", gloss: "past study" },
  "learn": { arabic: "\u06C1\u06CC\u0644 \u06A9\u0691", latin: "h\u0113l ka\u0155", urdu: "\u0633\u06CC\u06A9\u06BE\u0648", english: "learn", pos: "verb", root: "h\u0113l", gloss: "learn" },
  "learning": { arabic: "\u06C1\u06CC\u0644 \u06A9\u0691\u0646\u06AF \u0679\u06CC", latin: "h\u0113l ka\u0155ing \u0163\u012B", urdu: "\u0633\u06CC\u06A9\u06BE \u0631\u06C1\u0627", english: "learning", pos: "verb", root: "h\u0113l", gloss: "continuous learning" },
  "teach": { arabic: "\u06C1\u06CC\u0644 \u0627\u06CC\u062A\u0631", latin: "h\u0113l \u0113te", urdu: "\u0633\u06A9\u06BE\u0627\u0624", english: "teach", pos: "verb", root: "h\u0113l", gloss: "teach" },
  "live": { arabic: "\u0631\u06C1\u0646\u06AF\u0648\u06C1", latin: "rahengova", urdu: "\u0631\u06C1\u062A\u0627 \u06C1\u0648\u06BA", english: "live", pos: "verb", root: "raheng", gloss: "reside" },
  "living": { arabic: "\u0631\u06C1\u0646\u06AF\u0646\u06AF \u0679\u06CC", latin: "rahengwing \u0163\u012B", urdu: "\u0631\u06C1 \u0631\u06C1\u0627", english: "living", pos: "verb", root: "raheng", gloss: "continuous living" },
  "play": { arabic: "\u06AF\u0648\u0627\u0632\u06CC \u06A9\u0691", latin: "gw\u0101z\u012B ka\u0155", urdu: "\u06A9\u06BE\u06CC\u0644\u0648", english: "play", pos: "verb", root: "gw\u0101z\u012B", gloss: "play" },
  "write": { arabic: "\u0644\u06A9\u06BE / \u0646\u0628\u0634\u062A\u06C1 \u06A9\u0691", latin: "likh", urdu: "\u0644\u06A9\u06BE\u0648", english: "write", pos: "verb", root: "likh", gloss: "inscribe" },
  "sleep": { arabic: "\u062E\u0627\u0686", latin: "kh\u0101ch", urdu: "\u0633\u0648 \u062C\u0627\u0624", english: "sleep", pos: "verb", root: "kh\u0101ch", gloss: "rest" },
  "sit": { arabic: "\u062A\u0648\u0644", latin: "t\u016Bl", urdu: "\u0628\u06CC\u0679\u06BE\u0648", english: "sit", pos: "verb", root: "t\u016Bl", gloss: "rest body" },
  // Adjectives
  "good": { arabic: "\u0648\u0634 / \u0634\u0631", latin: "wash", urdu: "\u0627\u0686\u06BE\u0627", english: "good", pos: "adjective", root: "wash", gloss: "favorable" },
  "fine": { arabic: "\u062C\u0648\u0691", latin: "jor", urdu: "\u0679\u06BE\u06CC\u06A9", english: "fine", pos: "adjective", root: "jor", gloss: "healthy / sound" },
  "well": { arabic: "\u062C\u0648\u0691", latin: "jor", urdu: "\u0679\u06BE\u06CC\u06A9", english: "well", pos: "adjective", root: "jor", gloss: "wellness" },
  "bad": { arabic: "\u06AF\u0646\u062F\u06C1", latin: "ganda", urdu: "\u0628\u0631\u0627", english: "bad", pos: "adjective", root: "ganda", gloss: "unfavorable" },
  "big": { arabic: "\u0628\u0644\u0646", latin: "ballun", urdu: "\u0628\u0691\u0627", english: "big", pos: "adjective", root: "ballun", gloss: "large" },
  "small": { arabic: "\u0686\u064F\u0646\u06A9", latin: "chunuk", urdu: "\u0686\u06BE\u0648\u0679\u0627", english: "small", pos: "adjective", root: "chunuk", gloss: "diminutive" },
  "new": { arabic: "\u067E\u0648\u0633\u06A9\u0646", latin: "poskun", urdu: "\u0646\u06CC\u0627", english: "new", pos: "adjective", root: "poskun", gloss: "recent" },
  "old": { arabic: "\u0645\u062A\u06A9\u0646", latin: "mutkun", urdu: "\u067E\u0631\u0627\u0646\u0627", english: "old", pos: "adjective", root: "mutkun", gloss: "aged" },
  "beautiful": { arabic: "\u0632\u06CC\u0628\u0627", latin: "z\u0113b\u0101", urdu: "\u062E\u0648\u0628\u0635\u0648\u0631\u062A", english: "beautiful", pos: "adjective", root: "z\u0113b\u0101", gloss: "attractive" },
  "hot": { arabic: "\u06AF\u0631\u0645", latin: "garm", urdu: "\u06AF\u0631\u0645", english: "hot", pos: "adjective", root: "garm", gloss: "high temperature" },
  "cold": { arabic: "\u06CC\u062E", latin: "yakh", urdu: "\u0679\u06BE\u0646\u0688\u0627", english: "cold", pos: "adjective", root: "yakh", gloss: "low temperature" },
  "happy": { arabic: "\u0648\u0634\u062D\u0627\u0644", latin: "wash-h\u0101l", urdu: "\u062E\u0648\u0634", english: "happy", pos: "adjective", root: "wash-h\u0101l", gloss: "joyous" },
  // Adverbs & Particles
  "very": { arabic: "\u0628\u0627\u0632", latin: "b\u0101z", urdu: "\u0628\u06C1\u062A", english: "very", pos: "adverb", root: "b\u0101z", gloss: "intensifier" },
  "much": { arabic: "\u0628\u0627\u0632", latin: "b\u0101z", urdu: "\u0632\u06CC\u0627\u062F\u06C1", english: "much", pos: "adverb", root: "b\u0101z", gloss: "quantity" },
  "here": { arabic: "\u062F\u0627\u0691\u06D2", latin: "d\u0101\u0155\u0113", urdu: "\u06CC\u06C1\u0627\u06BA", english: "here", pos: "adverb", root: "d\u0101\u0155\u0113", gloss: "proximate place" },
  "there": { arabic: "\u0627\u0648\u062F\u06D2", latin: "od\u0113", urdu: "\u0648\u06C1\u0627\u06BA", english: "there", pos: "adverb", root: "od\u0113", gloss: "distal place" },
  "today": { arabic: "\u0627\u06CC\u0646\u0648", latin: "\u0113no", urdu: "\u0622\u062C", english: "today", pos: "adverb", root: "\u0113no", gloss: "current day" },
  "now": { arabic: "\u062F\u0627\u0633\u0627", latin: "d\u0101s\u0101", urdu: "\u0627\u0628", english: "now", pos: "adverb", root: "d\u0101s\u0101", gloss: "present moment" },
  "yes": { arabic: "\u06C1\u0627\u0624", latin: "h\u0101o", urdu: "\u06C1\u0627\u06BA", english: "yes", pos: "particle", root: "h\u0101o", gloss: "affirmation" },
  "no": { arabic: "\u0622\u062E\u0627", latin: "\u0101kh\u0101", urdu: "\u0646\u06C1\u06CC\u06BA", english: "no", pos: "particle", root: "\u0101kh\u0101", gloss: "negation" },
  "not": { arabic: "\u0646\u06C1", latin: "na", urdu: "\u0646\u06C1\u06CC\u06BA", english: "not", pos: "particle", root: "na", gloss: "negative particle" },
  "and": { arabic: "\u0627\u0648", latin: "o", urdu: "\u0627\u0648\u0631", english: "and", pos: "particle", root: "o", gloss: "conjunction" },
  "in": { arabic: "\u0679\u06CC", latin: "\u0163\u012B", urdu: "\u0645\u06CC\u06BA", english: "in", pos: "postposition", root: "\u0163\u012B", gloss: "locative postposition" },
  "to": { arabic: "\u06A9\u06CC", latin: "ki", urdu: "\u06A9\u0648", english: "to", pos: "postposition", root: "ki", gloss: "dative/purposive postposition" },
  "from": { arabic: "\u0622\u0646", latin: "\u0101n", urdu: "\u0633\u06D2", english: "from", pos: "postposition", root: "\u0101n", gloss: "ablative postposition" },
  "with": { arabic: "\u062A\u0648", latin: "to", urdu: "\u0633\u0627\u062A\u06BE", english: "with", pos: "postposition", root: "to", gloss: "associative postposition" },
  "for": { arabic: "\u06A9\u0646", latin: "kin", urdu: "\u06A9\u06D2 \u0644\u06CC\u06D2", english: "for", pos: "postposition", root: "kin", gloss: "beneficiary postposition" },
  // Greetings & Courtesies
  "hello": { arabic: "\u0633\u0644\u0627\u0645 / \u062F\u0631\u0648\u062A", latin: "Dr\u014Dt", urdu: "\u0633\u0644\u0627\u0645", english: "hello", pos: "greeting", root: "dr\u014Dt", gloss: "greeting" },
  "thanks": { arabic: "\u0645\u0646\u062A\u0648\u0627\u0631", latin: "Minatw\xE1r", urdu: "\u0634\u06A9\u0631\u06CC\u06C1", english: "thanks", pos: "greeting", root: "minatw\xE1r", gloss: "gratitude" },
  "welcome": { arabic: "\u0628\u062E\u06CC\u0631 \u0628\u0633\u0633", latin: "Bakhair basus", urdu: "\u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062F", english: "welcome", pos: "greeting", root: "bakhair", gloss: "hospitality" },
  "please": { arabic: "\u0645\u06C1\u0631 \u06A9\u0691\u0633\u0627", latin: "Mihr ka\u0155s\u0101", urdu: "\u0628\u0631\u0627\u06C1 \u06A9\u0631\u0645", english: "please", pos: "greeting", root: "mihr", gloss: "politeness" }
};
const PHRASE_DICTIONARY = [
  {
    triggers: ["how are you", "how r u", "how are you?", "\u0622\u067E \u06A9\u06CC\u0633\u06D2 \u06C1\u06CC\u06BA", "\u0622\u067E \u06A9\u06CC\u0633\u06CC \u06C1\u06CC\u06BA", "\u06A9\u06CC\u0633\u06D2 \u06C1\u0648"],
    arabic: "\u0646\u06CC \u062C\u0648\u0691 \u0627\u064F\u0633\u061F",
    latin: "N\u012B jor us?",
    urdu: "\u0622\u067E \u06A9\u06CC\u0633\u06D2 \u06C1\u06CC\u06BA\u061F",
    english: "How are you?",
    notes: "Standard singular inquiry. N\u012B (you) + jor (well) + us (are)."
  },
  {
    triggers: ["i am fine", "i am good", "im fine", "im good", "\u0645\u06CC\u06BA \u0679\u06BE\u06CC\u06A9 \u06C1\u0648\u06BA", "\u0645\u06CC\u06BA \u062E\u06CC\u0631\u06CC\u062A \u0633\u06D2 \u06C1\u0648\u06BA"],
    arabic: "\u0627\u06CC \u062C\u0648\u0691 \u0627\u064F\u0679",
    latin: "I jor u\u0163",
    urdu: "\u0645\u06CC\u06BA \u0679\u06BE\u06CC\u06A9 \u06C1\u0648\u06BA",
    english: "I am fine",
    notes: "I (I) + jor (well) + u\u0163 (am)."
  },
  {
    triggers: ["what is your name", "what is your name?", "what's your name", "\u0622\u067E \u06A9\u0627 \u0646\u0627\u0645 \u06A9\u06CC\u0627 \u06C1\u06D2", "\u062A\u0645\u06C1\u0627\u0631\u0627 \u0646\u0627\u0645 \u06A9\u06CC\u0627 \u06C1\u06D2"],
    arabic: "\u0646\u0627 \u067E\u0650\u0646 \u0627\u0646\u062A \u0621\u0650\u061F",
    latin: "N\u0101 pin ant e?",
    urdu: "\u0622\u067E \u06A9\u0627 \u0646\u0627\u0645 \u06A9\u06CC\u0627 \u06C1\u06D2\u061F",
    english: "What is your name?",
    notes: "N\u0101 (your) + pin (name) + ant (what) + e (is)."
  },
  {
    triggers: ["my name is", "\u0645\u06CC\u0631\u0627 \u0646\u0627\u0645 \u06C1\u06D2", "\u0645\u06CC\u0631\u0627 \u0646\u0627\u0645"],
    arabic: "\u06A9\u0646\u0627 \u067E\u0650\u0646 ... \u0621\u0650",
    latin: "Kan-na pin ... e",
    urdu: "\u0645\u06CC\u0631\u0627 \u0646\u0627\u0645 ... \u06C1\u06D2",
    english: "My name is ...",
    notes: "Kan-na (my) + pin (name) + ... + e (is)."
  },
  {
    triggers: ["thank you", "thanks", "thank you very much", "\u0634\u06A9\u0631\u06CC\u06C1", "\u0628\u06C1\u062A \u0634\u06A9\u0631\u06CC\u06C1"],
    arabic: "\u0645\u0646\u062A\u0648\u0627\u0631 / \u0628\u0627\u0632 \u0645\u0646\u062A\u0648\u0627\u0631",
    latin: "Minatw\xE1r / B\u0101z minatw\xE1r",
    urdu: "\u0628\u06C1\u062A \u0634\u06A9\u0631\u06CC\u06C1",
    english: "Thank you very much",
    notes: "Authentic Brahui expression of gratitude."
  },
  {
    triggers: [
      "welcome to brahui translator",
      "welcome to brahui translator.",
      "welcome to the brahui translator",
      "\u0628\u0631\u0627\u06C1\u0648\u0626\u06CC \u0645\u062A\u0631\u062C\u0645 \u0645\u06CC\u06BA \u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062F",
      "\u0628\u0631\u0627\u06C1\u0648\u0626\u06CC \u0645\u062A\u0631\u062C\u0645 \u0646\u0627 \u06A9\u0633\u0631 \u0679\u06CC \u0628\u062E\u06CC\u0631"
    ],
    arabic: "\u0628\u0631\u0627\u06C1\u0648\u0626\u06CC \u0645\u062A\u0631\u062C\u0645 \u0679\u06CC \u0628\u062E\u06CC\u0631 \u0628\u0633\u0633 (\u0633\u0627\u0631\u0627\u0648\u0627\u0646\u06CC)\n\u0628\u0631\u0627\u06C1\u0648\u0626\u06CC \u0645\u062A\u0631\u062C\u0645 \u0679\u06CC \u062E\u06CC\u0631 \u0627\u062A \u0628\u0633\u0633 (\u062C\u0627\u0644\u0627\u0648\u0627\u0646\u06CC)\n\u0628\u0631\u0627\u06C1\u0648\u0626\u06CC \u0645\u062A\u0631\u062C\u0645 \u0679\u06CC \u0648\u0634 \u0627\u062A\u06A9\u0626\u06D2 (\u0631\u062E\u0634\u0627\u0646\u06CC)",
    latin: "Br\u0101h\u016B\u012B mutarjim-\u1E6D\u012B bakhair basus (Sarawani)\nBr\u0101h\u016B\u012B mutarjim-\u1E6D\u012B khair at basus (Jhalawani)\nBr\u0101h\u016B\u012B mutarjim-\u1E6D\u012B wash atk\u0113 (Rakhshani)",
    urdu: "\u0628\u0631\u0627\u06C1\u0648\u0626\u06CC \u0645\u062A\u0631\u062C\u0645 \u0645\u06CC\u06BA \u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062F",
    english: "Welcome to Brahui translator",
    dialectVariants: [
      { dialect: "\u0633\u0627\u0631\u0627\u0648\u0627\u0646\u06CC", text: "\u0628\u0631\u0627\u06C1\u0648\u0626\u06CC \u0645\u062A\u0631\u062C\u0645 \u0679\u06CC \u0628\u062E\u06CC\u0631 \u0628\u0633\u0633", alternativeScript: "Br\u0101h\u016B\u012B mutarjim-\u1E6D\u012B bakhair basus" },
      { dialect: "\u062C\u0627\u0644\u0627\u0648\u0627\u0646\u06CC", text: "\u0628\u0631\u0627\u06C1\u0648\u0626\u06CC \u0645\u062A\u0631\u062C\u0645 \u0679\u06CC \u062E\u06CC\u0631 \u0627\u062A \u0628\u0633\u0633", alternativeScript: "Br\u0101h\u016B\u012B mutarjim-\u1E6D\u012B khair at basus" },
      { dialect: "\u0631\u062E\u0634\u0627\u0646\u06CC", text: "\u0628\u0631\u0627\u06C1\u0648\u0626\u06CC \u0645\u062A\u0631\u062C\u0645 \u0679\u06CC \u0648\u0634 \u0627\u062A\u06A9\u0626\u06D2", alternativeScript: "Br\u0101h\u016B\u012B mutarjim-\u1E6D\u012B wash atk\u0113" }
    ],
    notes: "Multi-dialect greeting across Sarawani, Jhalawani, and Rakhshani dialects with bracketed markers."
  },
  {
    triggers: ["welcome", "\u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062F"],
    arabic: "\u0628\u062E\u06CC\u0631 \u0628\u0633\u0633",
    latin: "Bakhair basus",
    urdu: "\u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062F",
    english: "Welcome",
    notes: "Bakhair (with peace) + basus (you arrived)."
  },
  {
    triggers: ["peace be upon you", "as salam alaikum", "assalam alaikum", "\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u06CC\u06A9\u0645"],
    arabic: "\u0633\u0644\u0627\u0645 / \u062F\u0631\u0648\u062A",
    latin: "Sal\u0101m / Dr\u014Dt",
    urdu: "\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u06CC\u06A9\u0645",
    english: "Peace be upon you",
    notes: "Traditional Balochistan/Brahui greeting."
  },
  {
    triggers: ["good morning", "\u0635\u0628\u062D \u0628\u062E\u06CC\u0631"],
    arabic: "\u0633\u064F\u06C1\u0628 \u0648\u0634",
    latin: "Suhb wash",
    urdu: "\u0635\u0628\u062D \u0628\u062E\u06CC\u0631",
    english: "Good morning",
    notes: "Suhb (morning) + wash (pleasant)."
  },
  {
    triggers: ["good evening", "\u0634\u0627\u0645 \u0628\u062E\u06CC\u0631"],
    arabic: "\u0634\u0627\u0645 \u0648\u0634",
    latin: "Sh\u0101m wash",
    urdu: "\u0634\u0627\u0645 \u0628\u062E\u06CC\u0631",
    english: "Good evening",
    notes: "Sh\u0101m (evening) + wash (pleasant)."
  },
  {
    triggers: ["good night", "\u0634\u0628 \u0628\u062E\u06CC\u0631"],
    arabic: "\u0646\u0646 \u0648\u0634",
    latin: "Nan wash",
    urdu: "\u0634\u0628 \u0628\u062E\u06CC\u0631",
    english: "Good night",
    notes: "Nan (night) + wash (pleasant)."
  },
  {
    triggers: ["where are you going", "where are you going?", "\u0622\u067E \u06A9\u06C1\u0627\u06BA \u062C\u0627 \u0631\u06C1\u06D2 \u06C1\u06CC\u06BA"],
    arabic: "\u0646\u06CC \u0627\u0631\u0627\u0646\u06AF \u06C1\u0646\u0646\u06AF \u0679\u06CC \u0627\u064F\u0633\u061F",
    latin: "N\u012B ar\u0101ng hining \u0163\u012B us?",
    urdu: "\u0622\u067E \u06A9\u06C1\u0627\u06BA \u062C\u0627 \u0631\u06C1\u06D2 \u06C1\u06CC\u06BA\u061F",
    english: "Where are you going?",
    notes: "Strict SOV: Subject (N\u012B) + Destination (ar\u0101ng) + Verb (hining \u0163\u012B us)."
  },
  {
    triggers: ["i want water", "give me water", "\u0645\u062C\u06BE\u06D2 \u067E\u0627\u0646\u06CC \u0686\u0627\u06C1\u06CC\u06D2", "\u067E\u0627\u0646\u06CC \u062F\u06CC\u06BA"],
    arabic: "\u06A9\u0646\u06D2 \u062F\u06CC\u0631 \u067E\u06A9\u0627\u0631 \u0621\u0650",
    latin: "Kane d\u012Br pak\u0101r e",
    urdu: "\u0645\u062C\u06BE\u06D2 \u067E\u0627\u0646\u06CC \u0686\u0627\u06C1\u06CC\u06D2",
    english: "I want water",
    notes: "Dative subject: Kane (to me) + d\u012Br (water) + pak\u0101r e (is needed)."
  },
  {
    triggers: ["who are you", "who are you?", "\u0622\u067E \u06A9\u0648\u0646 \u06C1\u06CC\u06BA", "\u062A\u0645 \u06A9\u0648\u0646 \u06C1\u0648"],
    arabic: "\u0646\u06CC \u062F\u06CC\u0631 \u0627\u064F\u0633\u061F",
    latin: "N\u012B d\u0113r us?",
    urdu: "\u0622\u067E \u06A9\u0648\u0646 \u06C1\u06CC\u06BA\u061F",
    english: "Who are you?",
    notes: "N\u012B (you) + d\u0113r (who) + us (are)."
  },
  {
    triggers: [
      "i study in class one",
      "i study in class 1",
      "i study in 1st class",
      "i read in class one",
      "i am studying in class one",
      "im studying in class one",
      "\u0645\u06CC\u06BA \u067E\u06C1\u0644\u06CC \u062C\u0645\u0627\u0639\u062A \u0645\u06CC\u06BA \u067E\u0691\u06BE\u062A\u0627 \u06C1\u0648\u06BA",
      "\u0645\u06CC\u06BA \u06A9\u0644\u0627\u0633 \u0648\u0646 \u0645\u06CC\u06BA \u067E\u0691\u06BE\u062A\u0627 \u06C1\u0648\u06BA",
      "\u0645\u06CC\u06BA \u067E\u06C1\u0644\u06CC \u06A9\u0644\u0627\u0633 \u0645\u06CC\u06BA \u067E\u0691\u06BE\u062A\u0627 \u06C1\u0648\u06BA"
    ],
    arabic: "\u0627\u06CC \u0627\u0648\u0644\u06CC\u06A9\u0648 \u062C\u0645\u0627\u0639\u062A \u0679\u06CC \u062E\u0648\u0627\u0646\u0648\u06C1",
    latin: "I awwal\u012Bko jam\u0101'at-\u0163\u012B khw\u0101niva",
    urdu: "\u0645\u06CC\u06BA \u067E\u06C1\u0644\u06CC \u062C\u0645\u0627\u0639\u062A \u0645\u06CC\u06BA \u067E\u0691\u06BE\u062A\u0627 \u06C1\u0648\u06BA",
    english: "I study in class one",
    notes: `Strict SOV: Subject "I" (\u0627\u06CC) + Locative "awwal\u012Bko jam\u0101'at-\u0163\u012B" (\u0627\u0648\u0644\u06CC\u06A9\u0648 \u062C\u0645\u0627\u0639\u062A \u0679\u06CC) + Verb "khw\u0101niva" (\u062E\u0648\u0627\u0646\u0648\u06C1). Zero English leakage.`
  },
  {
    triggers: [
      "class one",
      "class 1",
      "grade one",
      "grade 1",
      "1st class",
      "\u067E\u06C1\u0644\u06CC \u062C\u0645\u0627\u0639\u062A",
      "\u06A9\u0644\u0627\u0633 \u0648\u0646",
      "\u067E\u06C1\u0644\u06CC \u06A9\u0644\u0627\u0633"
    ],
    arabic: "\u0627\u0648\u0644\u06CC\u06A9\u0648 \u062C\u0645\u0627\u0639\u062A",
    latin: "Awwal\u012Bko jam\u0101'at",
    urdu: "\u067E\u06C1\u0644\u06CC \u062C\u0645\u0627\u0639\u062A",
    english: "Class one",
    notes: `Ordinal adjective "awwal\u012Bko" + noun "jam\u0101'at".`
  },
  {
    triggers: [
      "i am a student",
      "i am student",
      "im a student",
      "\u0645\u06CC\u06BA \u0627\u06CC\u06A9 \u0637\u0627\u0644\u0628 \u0639\u0644\u0645 \u06C1\u0648\u06BA",
      "\u0645\u06CC\u06BA \u0637\u0627\u0644\u0628 \u0639\u0644\u0645 \u06C1\u0648\u06BA"
    ],
    arabic: "\u0627\u06CC \u0627\u0633\u06C1 \u0634\u0627\u06AF\u0631\u062F \u0627\u0633 \u0627\u064F\u0679",
    latin: "I asa sh\u0101gird-as u\u0163",
    urdu: "\u0645\u06CC\u06BA \u0627\u06CC\u06A9 \u0637\u0627\u0644\u0628 \u0639\u0644\u0645 \u06C1\u0648\u06BA",
    english: "I am a student",
    notes: "Subject (I) + Indefinite numeral/suffix (asa sh\u0101gird-as) + Copula (u\u0163)."
  },
  {
    triggers: [
      "i go to school",
      "i am going to school",
      "\u0645\u06CC\u06BA \u0627\u0633\u06A9\u0648\u0644 \u062C\u0627\u062A\u0627 \u06C1\u0648\u06BA"
    ],
    arabic: "\u0627\u06CC \u0627\u0633\u06A9\u0648\u0644 \u0622 \u06C1\u0646\u0648\u06C1",
    latin: "I isk\u016Bl-\u0101 hinova",
    urdu: "\u0645\u06CC\u06BA \u0627\u0633\u06A9\u0648\u0644 \u062C\u0627\u062A\u0627 \u06C1\u0648\u06BA",
    english: "I go to school",
    notes: "Subject (I) + Directional (isk\u016Bl-\u0101) + Verb (hinova)."
  },
  {
    triggers: [
      "where do you live",
      "where do you live?",
      "\u0622\u067E \u06A9\u06C1\u0627\u06BA \u0631\u06C1\u062A\u06D2 \u06C1\u06CC\u06BA",
      "\u062A\u0645 \u06A9\u06C1\u0627\u06BA \u0631\u06C1\u062A\u06D2 \u06C1\u0648"
    ],
    arabic: "\u0646\u06CC \u0627\u0631\u0627\u0646\u06AF \u0631\u06C1\u0646\u06AF\u0648\u0633\u06C1\u061F",
    latin: "N\u012B ar\u0101ng rahengosa?",
    urdu: "\u0622\u067E \u06A9\u06C1\u0627\u06BA \u0631\u06C1\u062A\u06D2 \u06C1\u06CC\u06BA\u061F",
    english: "Where do you live?",
    notes: "Subject (N\u012B) + Interrogative (ar\u0101ng) + Verb (rahengosa)."
  },
  {
    triggers: [
      "i live in quetta",
      "\u0645\u06CC\u06BA \u06A9\u0648\u0626\u0679\u06C1 \u0645\u06CC\u06BA \u0631\u06C1\u062A\u0627 \u06C1\u0648\u06BA"
    ],
    arabic: "\u0627\u06CC \u06A9\u0648\u0626\u0679\u06C1 \u0679\u06CC \u0631\u06C1\u0646\u06AF\u0648\u06C1",
    latin: "I Quetta-\u0163\u012B rahengova",
    urdu: "\u0645\u06CC\u06BA \u06A9\u0648\u0626\u0679\u06C1 \u0645\u06CC\u06BA \u0631\u06C1\u062A\u0627 \u06C1\u0648\u06BA",
    english: "I live in Quetta",
    notes: "Subject (I) + Locative (Quetta-\u0163\u012B) + Verb (rahengova)."
  }
];
function transliterateEnglishToPersoArabic(text) {
  if (!text) return "";
  if (/[\u0600-\u06FF]/.test(text)) return text;
  const charMap = {
    "sh": "\u0634",
    "kh": "\u062E",
    "ch": "\u0686",
    "lh": "\u076A",
    "zh": "\u0698",
    "gh": "\u063A",
    "b": "\u0628",
    "p": "\u067E",
    "t": "\u0679",
    "j": "\u062C",
    "d": "\u0688",
    "r": "\u0631",
    "z": "\u0632",
    "s": "\u0633",
    "f": "\u0641",
    "q": "\u0642",
    "k": "\u06A9",
    "g": "\u06AF",
    "l": "\u0644",
    "m": "\u0645",
    "n": "\u0646",
    "v": "\u0648",
    "w": "\u0648",
    "h": "\u06C1",
    "y": "\u06CC",
    "a": "\u0627",
    "e": "\u06CC",
    "i": "\u06CC",
    "o": "\u0648",
    "u": "\u0648",
    "1": "\u06F1",
    "2": "\u06F2",
    "3": "\u06F3",
    "4": "\u06F4",
    "5": "\u06F5",
    "6": "\u06F6",
    "7": "\u06F7",
    "8": "\u06F8",
    "9": "\u06F9",
    "0": "\u06F0"
  };
  let lower = text.toLowerCase();
  let result = "";
  let i = 0;
  while (i < lower.length) {
    if (i + 1 < lower.length && charMap[lower.substring(i, i + 2)]) {
      result += charMap[lower.substring(i, i + 2)];
      i += 2;
    } else if (charMap[lower[i]]) {
      result += charMap[lower[i]];
      i++;
    } else {
      result += lower[i];
      i++;
    }
  }
  return result;
}
function adaptForeignToken(rawWord) {
  const clean = rawWord.toLowerCase().trim();
  const digitMap = {
    "1": { arabic: "\u0627\u0633\u06CC\u0679", latin: "as\u012B\u0163", urdu: "\u0627\u06CC\u06A9" },
    "2": { arabic: "\u0627\u0650\u0631\u0627\u0679", latin: "ir\u0101\u0163", urdu: "\u062F\u0648" },
    "3": { arabic: "\u0645\u0633\u0679", latin: "musi\u0163", urdu: "\u062A\u06CC\u0646" },
    "4": { arabic: "\u0686\u0627\u0631", latin: "ch\u0101r", urdu: "\u0686\u0627\u0631" },
    "5": { arabic: "\u067E\u0646\u062C", latin: "panj", urdu: "\u067E\u0627\u0646\u0686" }
  };
  if (digitMap[clean]) return digitMap[clean];
  const vocabMap = {
    "study": { arabic: "\u062E\u0648\u0627\u0646\u0648\u06C1", latin: "khw\u0101niva", urdu: "\u067E\u0691\u06BE\u062A\u0627 \u06C1\u0648\u06BA", isVerb: true },
    "studies": { arabic: "\u062E\u0648\u0627\u0646\u06CC\u06A9", latin: "khw\u0101nik", urdu: "\u067E\u0691\u06BE\u062A\u0627 \u06C1\u06D2", isVerb: true },
    "studying": { arabic: "\u062E\u0648\u0627\u0646\u0646\u06AF \u0679\u06CC", latin: "khw\u0101ning \u0163\u012B", urdu: "\u067E\u0691\u06BE \u0631\u06C1\u0627", isVerb: true },
    "studied": { arabic: "\u062E\u0648\u0627\u0646\u0627", latin: "khw\u0101n\u0101", urdu: "\u067E\u0691\u06BE\u0627", isVerb: true },
    "read": { arabic: "\u062E\u0648\u0627\u0646\u0648\u06C1", latin: "khw\u0101niva", urdu: "\u067E\u0691\u06BE\u062A\u0627 \u06C1\u0648\u06BA", isVerb: true },
    "reads": { arabic: "\u062E\u0648\u0627\u0646\u06CC\u06A9", latin: "khw\u0101nik", urdu: "\u067E\u0691\u06BE\u062A\u0627 \u06C1\u06D2", isVerb: true },
    "reading": { arabic: "\u062E\u0648\u0627\u0646\u0646\u06AF \u0679\u06CC", latin: "khw\u0101ning \u0163\u012B", urdu: "\u067E\u0691\u06BE \u0631\u06C1\u0627", isVerb: true },
    "learn": { arabic: "\u06C1\u06CC\u0644 \u06A9\u0691\u0648\u06C1", latin: "h\u0113l ka\u0155iva", urdu: "\u0633\u06CC\u06A9\u06BE\u062A\u0627 \u06C1\u0648\u06BA", isVerb: true },
    "learns": { arabic: "\u06C1\u06CC\u0644 \u06A9\u0691\u06CC\u06A9", latin: "h\u0113l ka\u0155ik", urdu: "\u0633\u06CC\u06A9\u06BE\u062A\u0627 \u06C1\u06D2", isVerb: true },
    "class": { arabic: "\u062C\u0645\u0627\u0639\u062A", latin: "jam\u0101'at", urdu: "\u062C\u0645\u0627\u0639\u062A" },
    "classes": { arabic: "\u062C\u0645\u0627\u0639\u062A \u0622\u062A\u0627", latin: "jam\u0101'at-\u0101t\u0101", urdu: "\u062C\u0645\u0627\u0639\u062A\u06CC\u06BA" },
    "grade": { arabic: "\u062C\u0645\u0627\u0639\u062A", latin: "jam\u0101'at", urdu: "\u062C\u0645\u0627\u0639\u062A" },
    "one": { arabic: "\u0627\u0633\u06CC\u0679", latin: "as\u012B\u0163", urdu: "\u0627\u06CC\u06A9" },
    "first": { arabic: "\u0627\u0648\u0644\u06CC\u06A9\u0648", latin: "awwal\u012Bko", urdu: "\u067E\u06C1\u0644\u06CC" },
    "two": { arabic: "\u0627\u0650\u0631\u0627\u0679", latin: "ir\u0101\u0163", urdu: "\u062F\u0648" },
    "second": { arabic: "\u0627\u0631\u0627\u0645\u06CC", latin: "ir\u0101m\u012B", urdu: "\u062F\u0648\u0633\u0631\u06CC" },
    "three": { arabic: "\u0645\u0633\u0679", latin: "musi\u0163", urdu: "\u062A\u06CC\u0646" },
    "third": { arabic: "\u0645\u0633\u0645\u06CC", latin: "musm\u012B", urdu: "\u062A\u06CC\u0633\u0631\u06CC" },
    "four": { arabic: "\u0686\u0627\u0631", latin: "ch\u0101r", urdu: "\u0686\u0627\u0631" },
    "five": { arabic: "\u067E\u0646\u062C", latin: "panj", urdu: "\u067E\u0627\u0646\u0686" },
    "school": { arabic: "\u0627\u0633\u06A9\u0648\u0644", latin: "isk\u016Bl", urdu: "\u0627\u0633\u06A9\u0648\u0644" },
    "college": { arabic: "\u06A9\u0627\u0644\u062C", latin: "k\u0101lij", urdu: "\u06A9\u0627\u0644\u062C" },
    "university": { arabic: "\u062C\u0627\u0645\u0639\u06C1", latin: "j\u0101mi'a", urdu: "\u062C\u0627\u0645\u0639\u06C1" },
    "student": { arabic: "\u0634\u0627\u06AF\u0631\u062F", latin: "sh\u0101gird", urdu: "\u0637\u0627\u0644\u0628 \u0639\u0644\u0645" },
    "students": { arabic: "\u0634\u0627\u06AF\u0631\u062F \u0622\u062A\u0627", latin: "sh\u0101gird-\u0101t\u0101", urdu: "\u0637\u0627\u0644\u0628 \u0639\u0644\u0645" },
    "teacher": { arabic: "\u0627\u0633\u062A\u0627\u062F", latin: "ust\u0101d", urdu: "\u0627\u0633\u062A\u0627\u062F" },
    "teachers": { arabic: "\u0627\u0633\u062A\u0627\u062F \u0622\u062A\u0627", latin: "ust\u0101d-\u0101t\u0101", urdu: "\u0627\u0633\u0627\u062A\u0630\u06C1" },
    "book": { arabic: "\u06A9\u062A\u0627\u0628", latin: "kit\u0101b", urdu: "\u06A9\u062A\u0627\u0628" },
    "books": { arabic: "\u06A9\u062A\u0627\u0628 \u0622\u062A\u0627", latin: "kit\u0101b-\u0101t\u0101", urdu: "\u06A9\u062A\u0627\u0628\u06CC\u06BA" },
    "room": { arabic: "\u06A9\u0645\u0631\u06C1", latin: "kamra", urdu: "\u06A9\u0645\u0631\u06C1" },
    "live": { arabic: "\u0631\u06C1\u0646\u06AF\u0648\u06C1", latin: "rahengova", urdu: "\u0631\u06C1\u062A\u0627 \u06C1\u0648\u06BA", isVerb: true },
    "living": { arabic: "\u0631\u06C1\u0646\u06AF\u0646\u06AF \u0679\u06CC", latin: "rahengwing \u0163\u012B", urdu: "\u0631\u06C1 \u0631\u06C1\u0627", isVerb: true },
    // Urdu loan and educational terms
    "\u06A9\u0644\u0627\u0633": { arabic: "\u062C\u0645\u0627\u0639\u062A", latin: "jam\u0101'at", urdu: "\u062C\u0645\u0627\u0639\u062A" },
    "\u0648\u0646": { arabic: "\u0627\u0633\u06CC\u0679", latin: "as\u012B\u0163", urdu: "\u0627\u06CC\u06A9" },
    "\u067E\u0691\u06BE\u062A\u0627": { arabic: "\u062E\u0648\u0627\u0646\u0648\u06C1", latin: "khw\u0101niva", urdu: "\u067E\u0691\u06BE\u062A\u0627", isVerb: true },
    "\u067E\u0691\u06BE\u062A\u06CC": { arabic: "\u062E\u0648\u0627\u0646\u06CC\u06A9", latin: "khw\u0101nik", urdu: "\u067E\u0691\u06BE\u062A\u06CC", isVerb: true },
    "\u067E\u0691\u06BE\u062A\u06D2": { arabic: "\u062E\u0648\u0627\u0646\u06CC\u0631\u06C1", latin: "khw\u0101nira", urdu: "\u067E\u0691\u06BE\u062A\u06D2", isVerb: true },
    "\u067E\u0691\u06BE\u0646\u0627": { arabic: "\u062E\u0648\u0627\u0646\u0646\u06AF", latin: "khw\u0101ning", urdu: "\u067E\u0691\u06BE\u0646\u0627", isVerb: true },
    "\u067E\u06C1\u0644\u06CC": { arabic: "\u0627\u0648\u0644\u06CC\u06A9\u0648", latin: "awwal\u012Bko", urdu: "\u067E\u06C1\u0644\u06CC" },
    "\u062F\u0648\u0633\u0631\u06CC": { arabic: "\u0627\u0631\u0627\u0645\u06CC", latin: "ir\u0101m\u012B", urdu: "\u062F\u0648\u0633\u0631\u06CC" },
    "\u062A\u06CC\u0633\u0631\u06CC": { arabic: "\u0645\u0633\u0645\u06CC", latin: "musm\u012B", urdu: "\u062A\u06CC\u0633\u0631\u06CC" },
    "\u0686\u0648\u062A\u06BE\u06CC": { arabic: "\u0686\u0627\u0631\u0645\u06CC", latin: "ch\u0101rm\u012B", urdu: "\u0686\u0648\u062A\u06BE\u06CC" },
    "\u067E\u0627\u0646\u0686\u0648\u06CC\u06BA": { arabic: "\u067E\u0646\u062C\u0645\u06CC", latin: "panjm\u012B", urdu: "\u067E\u0627\u0646\u0686\u0648\u06CC\u06BA" },
    "\u0637\u0627\u0644\u0628": { arabic: "\u0634\u0627\u06AF\u0631\u062F", latin: "sh\u0101gird", urdu: "\u0637\u0627\u0644\u0628" }
  };
  if (vocabMap[clean]) return vocabMap[clean];
  if (/[\u0600-\u06FF]/.test(rawWord)) {
    return { arabic: rawWord, latin: rawWord, urdu: rawWord };
  }
  const arabicAdapted = transliterateEnglishToPersoArabic(rawWord);
  return {
    arabic: arabicAdapted,
    latin: rawWord,
    urdu: arabicAdapted
  };
}
function lookupLexicon(rawWord) {
  const clean = rawWord.toLowerCase().replace(/^[^\w\u0600-\u06FF]+|[^\w\u0600-\u06FF]+$/g, "");
  if (!clean) return null;
  if (BRAHUI_LEXICON[clean]) {
    return BRAHUI_LEXICON[clean];
  }
  for (const entry of Object.values(BRAHUI_LEXICON)) {
    if (entry.arabic === clean || entry.latin.toLowerCase() === clean || entry.urdu === clean || entry.english.toLowerCase() === clean) {
      return entry;
    }
  }
  return null;
}
function dynamicTranslateSentence(sourceText, sourceLang, targetLang) {
  const trimmed = sourceText.trim();
  const lower = trimmed.toLowerCase();
  for (const item of PHRASE_DICTIONARY) {
    const matched = item.triggers.some((trigger) => {
      const cleanTrigger = trigger.toLowerCase().trim();
      return lower === cleanTrigger || lower === cleanTrigger + "?" || lower === cleanTrigger + ".";
    });
    if (matched) {
      let mainText = item.arabic;
      let altText = item.latin;
      if (targetLang === "brahui-latin") {
        mainText = item.latin;
        altText = item.arabic;
      } else if (targetLang === "urdu") {
        mainText = item.urdu;
        altText = item.latin;
      } else if (targetLang === "english") {
        mainText = item.english;
        altText = item.latin;
      }
      return {
        sourceText: trimmed,
        sourceLang,
        targetLang,
        translatedText: mainText,
        alternativeScript: altText,
        confidence: 96,
        dialectVariants: item.dialectVariants,
        grammaticalNotes: [
          "Direct idiomatic sentence alignment.",
          item.notes
        ],
        morphemeBreakdown: [
          {
            word: mainText,
            root: item.latin.split(" ")[0] || mainText,
            partOfSpeech: "Idiomatic Expression",
            meaning: item.english
          }
        ]
      };
    }
  }
  const eduMatchEn = lower.match(/^(?:(i|we|he|she|they|you)\s+)?(?:(study|studies|am studying|is studying|are studying|read|reads)\s+in\s+)?(?:class|grade)\s+([a-z0-9]+)\.?$/i);
  if (eduMatchEn) {
    const subj = (eduMatchEn[1] || "i").toLowerCase();
    const gradeRaw = eduMatchEn[3].toLowerCase();
    let gradeArabic = "\u0627\u0648\u0644\u06CC\u06A9\u0648 \u062C\u0645\u0627\u0639\u062A";
    let gradeLatin = "awwal\u012Bko jam\u0101'at";
    let gradeUrdu = "\u067E\u06C1\u0644\u06CC \u062C\u0645\u0627\u0639\u062A";
    if (gradeRaw === "one" || gradeRaw === "1" || gradeRaw === "first" || gradeRaw === "1st") {
      gradeArabic = "\u0627\u0648\u0644\u06CC\u06A9\u0648 \u062C\u0645\u0627\u0639\u062A";
      gradeLatin = "awwal\u012Bko jam\u0101'at";
      gradeUrdu = "\u067E\u06C1\u0644\u06CC \u062C\u0645\u0627\u0639\u062A";
    } else if (gradeRaw === "two" || gradeRaw === "2" || gradeRaw === "second" || gradeRaw === "2nd") {
      gradeArabic = "\u0627\u0631\u0627\u0645\u06CC \u062C\u0645\u0627\u0639\u062A";
      gradeLatin = "ir\u0101m\u012B jam\u0101'at";
      gradeUrdu = "\u062F\u0648\u0633\u0631\u06CC \u062C\u0645\u0627\u0639\u062A";
    } else if (gradeRaw === "three" || gradeRaw === "3" || gradeRaw === "third" || gradeRaw === "3rd") {
      gradeArabic = "\u0645\u0633\u0645\u06CC \u062C\u0645\u0627\u0639\u062A";
      gradeLatin = "musm\u012B jam\u0101'at";
      gradeUrdu = "\u062A\u06CC\u0633\u0631\u06CC \u062C\u0645\u0627\u0639\u062A";
    } else if (gradeRaw === "four" || gradeRaw === "4" || gradeRaw === "fourth" || gradeRaw === "4th") {
      gradeArabic = "\u0686\u0627\u0631\u0645\u06CC \u062C\u0645\u0627\u0639\u062A";
      gradeLatin = "ch\u0101rm\u012B jam\u0101'at";
      gradeUrdu = "\u0686\u0648\u062A\u06BE\u06CC \u062C\u0645\u0627\u0639\u062A";
    } else if (gradeRaw === "five" || gradeRaw === "5" || gradeRaw === "fifth" || gradeRaw === "5th") {
      gradeArabic = "\u067E\u0646\u062C\u0645\u06CC \u062C\u0645\u0627\u0639\u062A";
      gradeLatin = "panjm\u012B jam\u0101'at";
      gradeUrdu = "\u067E\u0627\u0646\u0686\u0648\u06CC\u06BA \u062C\u0645\u0627\u0639\u062A";
    } else {
      gradeArabic = `${gradeRaw} \u062C\u0645\u0627\u0639\u062A`;
      gradeLatin = `${gradeRaw} jam\u0101'at`;
      gradeUrdu = `\u062C\u0645\u0627\u0639\u062A ${gradeRaw}`;
    }
    let subjArabic = "\u0627\u06CC";
    let subjLatin = "I";
    let verbArabic = "\u062E\u0648\u0627\u0646\u0648\u06C1";
    let verbLatin = "khw\u0101niva";
    let subjUrdu = "\u0645\u06CC\u06BA";
    let verbUrdu = "\u067E\u0691\u06BE\u062A\u0627 \u06C1\u0648\u06BA";
    if (subj === "we") {
      subjArabic = "\u0646\u0646";
      subjLatin = "Nan";
      verbArabic = "\u062E\u0648\u0627\u0646\u0646\u06C1";
      verbLatin = "khw\u0101nina";
      subjUrdu = "\u06C1\u0645";
      verbUrdu = "\u067E\u0691\u06BE\u062A\u06D2 \u06C1\u06CC\u06BA";
    } else if (subj === "he" || subj === "she") {
      subjArabic = "\u0627\u0648";
      subjLatin = "\u014C";
      verbArabic = "\u062E\u0648\u0627\u0646\u06CC\u06A9";
      verbLatin = "khw\u0101nik";
      subjUrdu = "\u0648\u06C1";
      verbUrdu = "\u067E\u0691\u06BE\u062A\u0627 \u06C1\u06D2";
    } else if (subj === "they") {
      subjArabic = "\u0627\u0648\u0641\u06A9";
      subjLatin = "Ofk";
      verbArabic = "\u062E\u0648\u0627\u0646\u06CC\u0631\u06C1";
      verbLatin = "khw\u0101nira";
      subjUrdu = "\u0648\u06C1";
      verbUrdu = "\u067E\u0691\u06BE\u062A\u06D2 \u06C1\u06CC\u06BA";
    } else if (subj === "you") {
      subjArabic = "\u0646\u06CC";
      subjLatin = "N\u012B";
      verbArabic = "\u062E\u0648\u0627\u0646\u06CC\u0633\u06C1";
      verbLatin = "khw\u0101nis\u0101";
      subjUrdu = "\u0622\u067E";
      verbUrdu = "\u067E\u0691\u06BE\u062A\u06D2 \u06C1\u06CC\u06BA";
    }
    const arabicFull = `${subjArabic} ${gradeArabic} \u0679\u06CC ${verbArabic}\u06D4`;
    const latinFull = `${subjLatin} ${gradeLatin}-\u0163\u012B ${verbLatin}.`;
    const urduFull = `${subjUrdu} ${gradeUrdu} \u0645\u06CC\u06BA ${verbUrdu}\u06D4`;
    const englishFull = `${subj.charAt(0).toUpperCase() + subj.slice(1)} study in class ${gradeRaw}.`;
    return {
      sourceText: trimmed,
      sourceLang,
      targetLang,
      translatedText: targetLang === "brahui-latin" ? latinFull : targetLang === "urdu" ? urduFull : targetLang === "english" ? englishFull : arabicFull,
      alternativeScript: targetLang === "brahui-latin" ? arabicFull : targetLang === "brahui-arabic" ? latinFull : latinFull,
      confidence: 98,
      grammaticalNotes: [
        "Strict Brahui SOV sentence order applied: Subject + Locative phrase (-\u0163\u012B) + Conjugated verb.",
        "Academic grade translated using authentic Dravidian Brahui morphology with zero raw foreign tokens."
      ],
      morphemeBreakdown: [
        { word: subjArabic, root: subjLatin.toLowerCase(), partOfSpeech: "pronoun", meaning: subj },
        { word: gradeArabic, root: gradeLatin.split(" ")[0], partOfSpeech: "noun phrase", meaning: `class ${gradeRaw}` },
        { word: "\u0679\u06CC", root: "-\u0163\u012B", partOfSpeech: "postposition", meaning: "in" },
        { word: verbArabic, root: "khw\u0101n", partOfSpeech: "verb", meaning: "study" }
      ],
      wordCount: trimmed.split(/\s+/).filter(Boolean).length,
      paragraphCount: 1
    };
  }
  const eduMatchUr = trimmed.match(/^(میں|ہم|وہ|آپ|تم)\s+(?:(کلاس\s*[0-9a-zA-Zء-ي]+)|(پہلی|دوسری|تیسری|چوتھی|پانچویں)\s*جماعت)\s*میں\s*(?:پڑھتا\s*ہوں|پڑھتی\s*ہوں|پڑھتا\s*ہے|پڑھتی\s*ہے|پڑھتے\s*ہیں|پڑھتے\s*ہو)/);
  if (eduMatchUr) {
    const subjUr = eduMatchUr[1];
    const isFirst = trimmed.includes("\u067E\u06C1\u0644\u06CC") || trimmed.includes("\u0648\u0646") || trimmed.includes("1");
    const isSecond = trimmed.includes("\u062F\u0648\u0633\u0631\u06CC") || trimmed.includes("\u0679\u0648") || trimmed.includes("2");
    const isThird = trimmed.includes("\u062A\u06CC\u0633\u0631\u06CC") || trimmed.includes("\u062A\u06BE\u0631\u06CC") || trimmed.includes("3");
    let gradeArabic = isFirst ? "\u0627\u0648\u0644\u06CC\u06A9\u0648 \u062C\u0645\u0627\u0639\u062A" : isSecond ? "\u0627\u0631\u0627\u0645\u06CC \u062C\u0645\u0627\u0639\u062A" : isThird ? "\u0645\u0633\u0645\u06CC \u062C\u0645\u0627\u0639\u062A" : "\u062C\u0645\u0627\u0639\u062A";
    let gradeLatin = isFirst ? "awwal\u012Bko jam\u0101'at" : isSecond ? "ir\u0101m\u012B jam\u0101'at" : isThird ? "musm\u012B jam\u0101'at" : "jam\u0101'at";
    let subjArabic = subjUr === "\u06C1\u0645" ? "\u0646\u0646" : subjUr === "\u0648\u06C1" ? "\u0627\u0648" : subjUr === "\u0622\u067E" || subjUr === "\u062A\u0645" ? "\u0646\u06CC" : "\u0627\u06CC";
    let subjLatin = subjUr === "\u06C1\u0645" ? "Nan" : subjUr === "\u0648\u06C1" ? "\u014C" : subjUr === "\u0622\u067E" || subjUr === "\u062A\u0645" ? "N\u012B" : "I";
    let verbArabic = subjUr === "\u06C1\u0645" ? "\u062E\u0648\u0627\u0646\u0646\u06C1" : subjUr === "\u0648\u06C1" ? "\u062E\u0648\u0627\u0646\u06CC\u06A9" : subjUr === "\u0622\u067E" || subjUr === "\u062A\u0645" ? "\u062E\u0648\u0627\u0646\u06CC\u0633\u06C1" : "\u062E\u0648\u0627\u0646\u0648\u06C1";
    let verbLatin = subjUr === "\u06C1\u0645" ? "khw\u0101nina" : subjUr === "\u0648\u06C1" ? "khw\u0101nik" : subjUr === "\u0622\u067E" || subjUr === "\u062A\u0645" ? "khw\u0101nis\u0101" : "khw\u0101niva";
    const arabicFull = `${subjArabic} ${gradeArabic} \u0679\u06CC ${verbArabic}\u06D4`;
    const latinFull = `${subjLatin} ${gradeLatin}-\u0163\u012B ${verbLatin}.`;
    const englishFull = `${subjLatin} study in class ${isFirst ? "one" : isSecond ? "two" : isThird ? "three" : ""}.`;
    return {
      sourceText: trimmed,
      sourceLang,
      targetLang,
      translatedText: targetLang === "brahui-latin" ? latinFull : targetLang === "english" ? englishFull : targetLang === "urdu" ? trimmed : arabicFull,
      alternativeScript: targetLang === "brahui-latin" ? arabicFull : targetLang === "brahui-arabic" ? latinFull : latinFull,
      confidence: 98,
      grammaticalNotes: [
        "Strict Brahui SOV sentence order applied: Subject + Locative phrase (-\u0163\u012B) + Conjugated verb.",
        "Urdu loan words (\u06A9\u0644\u0627\u0633 \u0648\u0646) fully translated into authentic Brahui vocabulary (\u0627\u0648\u0644\u06CC\u06A9\u0648 \u062C\u0645\u0627\u0639\u062A \u0679\u06CC \u062E\u0648\u0627\u0646\u0648\u06C1)."
      ],
      morphemeBreakdown: [
        { word: subjArabic, root: subjLatin.toLowerCase(), partOfSpeech: "pronoun", meaning: subjUr },
        { word: gradeArabic, root: gradeLatin.split(" ")[0], partOfSpeech: "noun phrase", meaning: "class" },
        { word: "\u0679\u06CC", root: "-\u0163\u012B", partOfSpeech: "postposition", meaning: "in" },
        { word: verbArabic, root: "khw\u0101n", partOfSpeech: "verb", meaning: "study" }
      ],
      wordCount: trimmed.split(/\s+/).filter(Boolean).length,
      paragraphCount: 1
    };
  }
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const words = tokens.map((t) => t.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»،؟]/g, ""));
  const parsedWords = tokens.map((token, i) => ({
    raw: token,
    clean: words[i] || token,
    lexiconMatch: lookupLexicon(words[i] || token)
  }));
  const morphemes = [];
  const subjects = [];
  const subjectsLatin = [];
  const objects = [];
  const objectsLatin = [];
  const postpositions = [];
  const postpositionsLatin = [];
  const verbs = [];
  const verbsLatin = [];
  const others = [];
  const othersLatin = [];
  for (const pw of parsedWords) {
    const m = pw.lexiconMatch;
    if (m) {
      const arabicWord = m.arabic;
      const latinWord = m.latin;
      const urduWord = m.urdu;
      const englishWord = m.english;
      morphemes.push({
        word: targetLang === "brahui-latin" ? latinWord : targetLang === "urdu" ? urduWord : targetLang === "english" ? englishWord : arabicWord,
        root: m.root || m.latin,
        partOfSpeech: m.pos,
        meaning: m.english
      });
      if (targetLang === "english") {
        others.push(englishWord);
        othersLatin.push(latinWord);
      } else if (targetLang === "urdu") {
        if (m.pos === "pronoun" && subjects.length === 0) {
          subjects.push(urduWord);
        } else if (m.pos === "verb") {
          verbs.push(urduWord);
        } else if (m.pos === "postposition") {
          postpositions.push(urduWord);
        } else {
          objects.push(urduWord);
        }
        othersLatin.push(latinWord);
      } else {
        if (m.pos === "pronoun" && subjects.length === 0) {
          subjects.push(arabicWord);
          subjectsLatin.push(latinWord);
        } else if (m.pos === "verb") {
          verbs.push(arabicWord);
          verbsLatin.push(latinWord);
        } else if (m.pos === "postposition") {
          postpositions.push(arabicWord);
          postpositionsLatin.push(latinWord);
        } else if (m.pos === "noun" || m.pos === "adjective") {
          objects.push(arabicWord);
          objectsLatin.push(latinWord);
        } else {
          others.push(arabicWord);
          othersLatin.push(latinWord);
        }
      }
    } else {
      const adapted = adaptForeignToken(pw.clean);
      if (adapted.isVerb) {
        verbs.push(adapted.arabic);
        verbsLatin.push(adapted.latin);
      } else {
        if (targetLang === "brahui-arabic") {
          objects.push(adapted.arabic);
          objectsLatin.push(adapted.latin);
        } else if (targetLang === "urdu") {
          objects.push(adapted.urdu);
          othersLatin.push(adapted.latin);
        } else {
          objectsLatin.push(adapted.latin);
        }
      }
    }
  }
  let finalArabic = "";
  let finalLatin = "";
  let finalUrdu = "";
  let finalEnglish = "";
  if (targetLang === "brahui-arabic" || targetLang === "brahui-latin") {
    const arabicParts = [...subjects, ...objects, ...postpositions, ...others, ...verbs];
    const latinParts = [...subjectsLatin, ...objectsLatin, ...postpositionsLatin, ...othersLatin, ...verbsLatin];
    if (arabicParts.length === 0) {
      arabicParts.push(trimmed);
      latinParts.push(trimmed);
    }
    finalArabic = arabicParts.join(" ");
    finalLatin = latinParts.join(" ");
    if (trimmed.endsWith("?")) {
      finalArabic += "\u061F";
      finalLatin += "?";
    } else if (trimmed.endsWith("!")) {
      finalArabic += "!";
      finalLatin += "!";
    } else if (trimmed.endsWith(".")) {
      finalArabic += "\u06D4";
      finalLatin += ".";
    }
  } else if (targetLang === "urdu") {
    const urduParts = [...subjects, ...objects, ...others, ...verbs];
    if (urduParts.length === 0) urduParts.push(trimmed);
    finalUrdu = urduParts.join(" ");
    finalLatin = othersLatin.join(" ") || trimmed;
  } else {
    finalEnglish = others.join(" ") || trimmed;
    finalLatin = othersLatin.join(" ") || trimmed;
  }
  let translatedText = finalArabic;
  let alternativeScript = finalLatin;
  if (targetLang === "brahui-latin") {
    translatedText = finalLatin;
    alternativeScript = finalArabic;
  } else if (targetLang === "urdu") {
    translatedText = finalUrdu;
    alternativeScript = finalLatin;
  } else if (targetLang === "english") {
    translatedText = finalEnglish;
    alternativeScript = finalLatin;
  }
  return {
    sourceText: trimmed,
    sourceLang,
    targetLang,
    translatedText,
    alternativeScript,
    confidence: 88,
    grammaticalNotes: [
      `Dynamically translated ${tokens.length} words using grammatical tokenization.`,
      `Applied ${targetLang.startsWith("brahui") || targetLang === "urdu" ? "SOV (Subject-Object-Verb)" : "SVO"} syntactic arrangement.`
    ],
    morphemeBreakdown: morphemes.slice(0, 8),
    wordCount: tokens.length,
    paragraphCount: 1
  };
}
export {
  BRAHUI_LEXICON,
  PHRASE_DICTIONARY,
  adaptForeignToken,
  dynamicTranslateSentence,
  lookupLexicon,
  transliterateEnglishToPersoArabic
};
