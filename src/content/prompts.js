import { wordGroups, words } from './words.js';

// Guided prompts, shown in Roman Sindhi and Devanagari so the elder can simply talk,
// with an English line for the grandchild holding the phone.
//
// Prompt ids are stored with every recording: add, reorder or reword freely, but never
// change an existing id. The Sindhi is a first draft — have a fluent elder review it.
export const sections = [
  {
    id: 'vatan',
    title: 'Vatan',
    deva: 'वतनु',
    en: 'Your town in Sindh',
    maxSeconds: 60,
    prompts: [
      {
        id: 'vatan-born',
        roman: 'Tavhaanjo janamu kithe thiyo? Shahar jo naalo budhaayo.',
        deva: 'तव्हांजो जनमु किथे थियो? शहर जो नालो ॿुधायो।',
        en: 'Where were you born? Tell us the name of your town.',
      },
      {
        id: 'vatan-house',
        roman: 'Asaanjo ghar kahiro ho? Ghar mein ker ker rahanda hua?',
        deva: 'असांजो घरु कहिड़ो हो? घर में केर केर रहंदा हुआ?',
        en: 'What was the family home like? Who all lived in it?',
      },
      {
        id: 'vatan-walk',
        roman: 'Pahinje shahar jo hiku chakkar lagaayo — bazaar, mandir, school.',
        deva: 'पंहिंजे शहर जो हिकु चक्करु लॻायो — बाज़ारु, मंदिरु, स्कूलु।',
        en: 'Take us for a walk through your town — the bazaar, the mandir, the school.',
      },
      {
        id: 'vatan-childhood',
        roman: 'Nandhpan ji kaa mithi yaad budhaayo.',
        deva: 'नंढपण जी का मिठी याद ॿुधायो।',
        en: 'Tell us a sweet memory from your childhood.',
      },
      {
        id: 'vatan-festival',
        roman: 'Sindh mein Cheti Chand ain Diyaari kiyan malhaainda hua?',
        deva: 'सिंध में चेटी चंड ऐं ॾियारी कीअं मल्हाईंदा हुआ?',
        en: 'How did the family celebrate Cheti Chand and Diwali in Sindh?',
      },
    ],
  },
  {
    id: 'safar',
    title: '1947 jo Safar',
    deva: '1947 जो सफ़रु',
    en: 'The Partition journey',
    maxSeconds: 60,
    prompts: [
      {
        id: 'safar-1947',
        roman: '1947 mein tavhaan kitran saalan ja hua? Uhe dinhan kahira hua?',
        deva: '1947 में तव्हां कितरनि सालनि जा हुआ? उहे ॾींहं कहिड़ा हुआ?',
        en: 'How old were you in 1947? What were those days like?',
      },
      {
        id: 'safar-leaving',
        roman: 'Ghar chhadan jo faislo kiyan thiyo? Aakhri dinhun kahiro ho?',
        deva: 'घरु छॾण जो फ़ैसलो कीअं थियो? आख़िरी ॾींहुं कहिड़ो हो?',
        en: 'How was the decision to leave home made? What was the last day like?',
      },
      {
        id: 'safar-carried',
        roman: 'Saan chha khanyo? Ain chha puthiyaan rahji viyo?',
        deva: 'साणु छा खंयो? ऐं छा पुठियां रहिजी वियो?',
        en: 'What did you carry with you? And what was left behind?',
      },
      {
        id: 'safar-journey',
        roman: 'Safar kiyan kayo — jahaz, rail ya pairan? Rasto kahiro ho?',
        deva: 'सफ़रु कीअं कयो — जहाज़, रेल या पेरनि? रस्तो कहिड़ो हो?',
        en: 'How did you travel — by ship, train or on foot? What was the journey like?',
      },
      {
        id: 'safar-arrival',
        roman: 'Hindustan pahuchan khaan poi pahiriyaan kithe rahiya? Guzaaro kiyan kayo?',
        deva: 'हिंदुस्तान पहुचण खां पोइ पहिरियां किथे रहिया? गुज़ारो कीअं कयो?',
        en: 'After reaching India, where did you first stay? How did the family get by?',
      },
      {
        id: 'safar-kindness',
        roman: 'Kahiro maanhu ya kahiri madad kadahin na visaare saghiya?',
        deva: 'कहिड़ो माण्हू या कहिड़ी मदद कडहिं न विसारे सघिया?',
        en: 'Which person, or which kindness, could you never forget?',
      },
      {
        id: 'safar-return',
        roman: 'Je Sindh vapas vanjo, ta pahiriyaan kithe vanjo?',
        deva: 'जे सिंध वापस वञो, त पहिरियां किथे वञो?',
        en: 'If you could go back to Sindh, where would you go first?',
      },
    ],
  },
  {
    id: 'loliyun',
    title: 'Loliyun',
    deva: 'लोलियूं',
    en: 'Lullabies & songs',
    maxSeconds: 60,
    prompts: [
      {
        id: 'lolee-sleep',
        roman: 'Kaa lolee ghaayo, jaa baaran khe sumhaarinda hua.',
        deva: 'का लोली ॻायो, जा ॿारनि खे सुम्हारींदा हुआ।',
        en: 'Sing a lullaby you used to sing to put the children to sleep.',
      },
      {
        id: 'lolee-song',
        roman: 'Ko Sindhi geet, lado ya Jhulelal jo panjro ghaayo.',
        deva: 'को सिंधी गीतु, लाॾो या झूलेलाल जो पंजिड़ो ॻायो।',
        en: 'Sing a Sindhi song, a wedding lado or a Jhulelal panjro.',
      },
      {
        id: 'lolee-story',
        roman: 'Nandhpan mein budhal kaa kahaani ya chavani budhaayo.',
        deva: 'नंढपण में ॿुधल का कहाणी या चवणी ॿुधायो।',
        en: 'Tell a story or a saying you heard as a child.',
      },
    ],
  },
  {
    id: 'rasoi',
    title: 'Rasoi',
    deva: 'रसोई',
    en: 'Recipes',
    maxSeconds: 60,
    prompts: [
      {
        id: 'rasoi-saibhaji',
        roman: 'Sai Bhaaji kiyan thaahinda aahiyo? Kujh bi na chhadjo!',
        deva: 'साई भाॼी कीअं ठाहींदा आहियो? कुझु बि न छॾजो!',
        en: 'How do you make Sai Bhaji? Don’t skip a single step!',
      },
      {
        id: 'rasoi-dalpakwan',
        roman: 'Daal Pakwaan jo tareeqo budhaayo.',
        deva: 'दाल पकवान जो तरीक़ो ॿुधायो।',
        en: 'Tell us how to make Dal Pakwan.',
      },
      {
        id: 'rasoi-koki',
        roman: 'Koki ain Seyal Maani kiyan thaahinda aahiyo?',
        deva: 'कोकी ऐं सेयल मानी कीअं ठाहींदा आहियो?',
        en: 'How do you make Koki and Seyal Mani?',
      },
      {
        id: 'rasoi-festival',
        roman: 'Thadri, Chaliho ya Diyaari te khaas chha thahando ho?',
        deva: 'ठदिड़ी, चालीहे या ॾियारीअ ते ख़ास छा ठहंदो हो?',
        en: 'What special food was made for Thadri, Chaliho or Diwali?',
      },
      {
        id: 'rasoi-sindh',
        roman: 'Sindh jo ko khaadho, jo hite kadahin na miliyo.',
        deva: 'सिंध जो को खाधो, जो हिते कडहिं न मिलियो।',
        en: 'A taste of Sindh you never found again here.',
      },
    ],
  },
  {
    id: 'lafz',
    title: '50 Lafz',
    deva: '50 लफ़्ज़',
    en: '50 everyday Sindhi words',
    maxSeconds: 15,
    words: true,
    hint: 'Say the word slowly, then use it in a short sentence.',
    groups: wordGroups.map((group) => ({ title: group.title, ids: group.words.map((w) => `lafz-${w.id}`) })),
    prompts: words.map((word) => ({
      id: `lafz-${word.id}`,
      roman: word.roman,
      deva: word.deva,
      en: word.en,
      emoji: word.emoji,
    })),
  },
  {
    id: 'aasees',
    title: 'Aasees',
    deva: 'आसीस',
    en: 'A blessing for the grandchildren',
    maxSeconds: 60,
    prompts: [
      {
        id: 'aasees-grandkids',
        roman: 'Potan ain dohtan laai hik aasees diyo.',
        deva: 'पोटनि ऐं ॾोहिटनि लाइ हिक आसीस ॾियो।',
        en: 'Give a blessing for your grandchildren.',
      },
      {
        id: 'aasees-sindhi',
        roman: 'Baaran khe chao ta Sindhi chho gaalhaainu ghurje.',
        deva: 'ॿारनि खे चओ त सिंधी छो ॻाल्हाइणु घुरिजे।',
        en: 'Tell the children why they should keep speaking Sindhi.',
      },
    ],
  },
];

export const prompts = sections.flatMap((section) =>
  section.prompts.map((prompt, index) => ({
    ...prompt,
    sectionId: section.id,
    maxSeconds: section.maxSeconds,
    order: index,
  })),
);

export const promptById = new Map(prompts.map((p) => [p.id, p]));
export const promptOrder = new Map(prompts.map((p, i) => [p.id, i]));
export const isWordPrompt = (id) => promptById.get(id)?.sectionId === 'lafz';

export const relations = {
  dada: { label: 'Dada', deva: 'ॾाॾो', pronoun: 'his', gender: 'm' },
  dadi: { label: 'Dadi', deva: 'ॾाॾी', pronoun: 'her', gender: 'f' },
  nana: { label: 'Nana', deva: 'नानो', pronoun: 'his', gender: 'm' },
  nani: { label: 'Nani', deva: 'नानी', pronoun: 'her', gender: 'f' },
  other: { label: 'Elder', deva: 'वॾा', pronoun: 'their', gender: 'x' },
};
