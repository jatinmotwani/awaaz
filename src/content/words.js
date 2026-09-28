// The 50 everyday words. Each becomes a short clip in the elder's own voice and a card
// in "Learn Sindhi". Ids are stored with recordings — never rename an existing id.
//
// Roman spellings follow how Indian Sindhi families usually type; Devanagari uses the
// Sindhi implosive letters (ॻ ॼ ॾ ॿ). Please have a fluent elder review before launch.
export const wordGroups = [
  {
    title: 'Family',
    words: [
      { id: 'amaan', emoji: '👩', en: 'Mother', roman: 'Amaan', deva: 'अमां' },
      { id: 'baba', emoji: '👨', en: 'Father', roman: 'Baba', deva: 'बाबा' },
      { id: 'dado', emoji: '👴', en: 'Grandfather (father’s side)', roman: 'Dado', deva: 'ॾाॾो' },
      { id: 'dadi', emoji: '👵', en: 'Grandmother (father’s side)', roman: 'Dadi', deva: 'ॾाॾी' },
      { id: 'nano', emoji: '👴', en: 'Grandfather (mother’s side)', roman: 'Nano', deva: 'नानो' },
      { id: 'nani', emoji: '👵', en: 'Grandmother (mother’s side)', roman: 'Nani', deva: 'नानी' },
      { id: 'bhaau', emoji: '👦', en: 'Brother', roman: 'Bhaau', deva: 'भाउ' },
      { id: 'bhenu', emoji: '👧', en: 'Sister', roman: 'Bhenu', deva: 'भेणु' },
      { id: 'putu', emoji: '👶', en: 'Son', roman: 'Putu', deva: 'पुटु' },
      { id: 'dhiyu', emoji: '🎀', en: 'Daughter', roman: 'Dhiyu', deva: 'धीउ' },
      { id: 'maamo', emoji: '🧔', en: 'Mother’s brother', roman: 'Maamo', deva: 'मामो' },
      { id: 'phuphi', emoji: '👩‍🦳', en: 'Father’s sister', roman: 'Phuphi', deva: 'फुफी' },
    ],
  },
  {
    title: 'Home & food',
    words: [
      { id: 'paani', emoji: '💧', en: 'Water', roman: 'Paani', deva: 'पाणी' },
      { id: 'maani', emoji: '🫓', en: 'Roti / a meal', roman: 'Maani', deva: 'मानी' },
      { id: 'kheer', emoji: '🥛', en: 'Milk', roman: 'Kheer', deva: 'खीरु' },
      { id: 'chaanhi', emoji: '☕', en: 'Tea', roman: 'Chaanhi', deva: 'चांहिं' },
      { id: 'chaanwar', emoji: '🍚', en: 'Rice', roman: 'Chaanwar', deva: 'चांवर' },
      { id: 'loon', emoji: '🧂', en: 'Salt', roman: 'Loon', deva: 'लूणु' },
      { id: 'mitho', emoji: '🍬', en: 'Sweet', roman: 'Mitho', deva: 'मिठो' },
      { id: 'bukh', emoji: '😋', en: 'Hunger', roman: 'Bukh', deva: 'ॿुख' },
      { id: 'ghar', emoji: '🏠', en: 'Home', roman: 'Ghar', deva: 'घरु' },
      { id: 'nind', emoji: '😴', en: 'Sleep', roman: 'Nind', deva: 'निंड' },
      { id: 'baar', emoji: '🧒', en: 'Child', roman: 'Baaru', deva: 'ॿारु' },
    ],
  },
  {
    title: 'Sky & river',
    words: [
      { id: 'siju', emoji: '☀️', en: 'Sun', roman: 'Siju', deva: 'सिजु' },
      { id: 'chandu', emoji: '🌙', en: 'Moon', roman: 'Chandu', deva: 'चंडु' },
      { id: 'meenhun', emoji: '🌧️', en: 'Rain', roman: 'Meenhun', deva: 'मींहुं' },
      { id: 'darya', emoji: '🌊', en: 'River', roman: 'Darya', deva: 'दरियाहु' },
    ],
  },
  {
    title: 'Describing',
    words: [
      { id: 'suthho', emoji: '👍', en: 'Good', roman: 'Suthho', deva: 'सुठो' },
      { id: 'suhino', emoji: '🌸', en: 'Beautiful', roman: 'Suhino', deva: 'सुहिणो' },
      { id: 'waddo', emoji: '🐘', en: 'Big', roman: 'Waddo', deva: 'वॾो' },
      { id: 'nandho', emoji: '🐭', en: 'Small', roman: 'Nandho', deva: 'नंढो' },
      { id: 'thadho', emoji: '❄️', en: 'Cold', roman: 'Thadho', deva: 'ठधो' },
    ],
  },
  {
    title: 'Doing',
    words: [
      { id: 'acho', emoji: '🤗', en: 'Come', roman: 'Acho', deva: 'अचो' },
      { id: 'vanjo', emoji: '👋', en: 'Go', roman: 'Vanjo', deva: 'वञो' },
      { id: 'vehho', emoji: '🪑', en: 'Sit', roman: 'Vehho', deva: 'वेहो' },
      { id: 'khaao', emoji: '🍛', en: 'Eat', roman: 'Khaao', deva: 'खाओ' },
      { id: 'peeo', emoji: '🥤', en: 'Drink', roman: 'Peeo', deva: 'पीओ' },
      { id: 'budho', emoji: '👂', en: 'Listen', roman: 'Budho', deva: 'ॿुधो' },
      { id: 'gaalhaayo', emoji: '🗣️', en: 'Speak', roman: 'Gaalhaayo', deva: 'ॻाल्हायो' },
    ],
  },
  {
    title: 'When, what, where',
    words: [
      { id: 'aju', emoji: '📅', en: 'Today', roman: 'Aju', deva: 'अॼु' },
      { id: 'kaalh', emoji: '⏪', en: 'Yesterday', roman: 'Kaalh', deva: 'कल्ह' },
      { id: 'chha', emoji: '❓', en: 'What?', roman: 'Chha?', deva: 'छा?' },
      { id: 'kithe', emoji: '📍', en: 'Where?', roman: 'Kithe?', deva: 'किथे?' },
      { id: 'chho', emoji: '🤔', en: 'Why?', roman: 'Chho?', deva: 'छो?' },
    ],
  },
  {
    title: 'Little phrases',
    words: [
      { id: 'haa', emoji: '✅', en: 'Yes', roman: 'Haa', deva: 'हा' },
      { id: 'na', emoji: '✋', en: 'No', roman: 'Na', deva: 'न' },
      { id: 'kiyan-aahiyo', emoji: '🙂', en: 'How are you?', roman: 'Kiyan aahiyo?', deva: 'कीअं आहियो?' },
      { id: 'theek-aahiyaan', emoji: '😊', en: 'I’m fine', roman: 'Theek aahiyaan', deva: 'ठीकु आहियां' },
      { id: 'meharbaani', emoji: '🙏', en: 'Thank you', roman: 'Meharbaani', deva: 'मेहरबानी' },
      { id: 'jeeanda-raho', emoji: '💛', en: 'Live long! (a blessing)', roman: 'Jeeanda raho', deva: 'जीअंदा रहो' },
    ],
  },
];

export const words = wordGroups.flatMap((group) => group.words.map((word) => ({ ...word, group: group.title })));
