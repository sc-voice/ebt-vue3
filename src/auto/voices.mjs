const VOICES= [
  {
    "name": "Amy",
    "label": "🤖 Amy (slower)",
    "langTrans": "en",
    "gender": "female",
    "iVoice": 0,
    "locale": "en-GB",
    "service": "aws-polly"
  },
  {
    "name": "Raveena",
    "label": "🤖 Raveena (faster)",
    "langTrans": "en",
    "gender": "female",
    "iVoice": 2,
    "locale": "en-IN",
    "service": "aws-polly"
  },
  {
    "name": "Matthew",
    "label": "🤖 Matthew (fastest)",
    "langTrans": "en",
    "gender": "male",
    "iVoice": 3,
    "locale": "en-US",
    "service": "aws-polly"
  },
  {
    "name": "Aditi",
    "label": "🤖 Aditi",
    "langTrans": "pli",
    "gender": "female",
    "locale": "hi-IN",
    "service": "aws-polly"
  },
  {
    "name": "Brian",
    "label": "🤖 Brian (medium)",
    "langTrans": "en",
    "gender": "male",
    "iVoice": 1,
    "locale": "en-AU",
    "service": "aws-polly"
  },
  {
    "name": "sujato_en",
    "label": "🗣 Bhante Sujato (English)",
    "langTrans": "en",
    "gender": "male",
    "locale": "en",
    "service": "human-tts"
  },
  {
    "name": "Vicki",
    "label": "🤖 Vicki (langsamer)",
    "langTrans": "de",
    "gender": "female",
    "iVoice": 10,
    "locale": "de-DE",
    "service": "aws-polly"
  },
  {
    "name": "Hans",
    "label": "🤖 Hans (mittel)",
    "langTrans": "de",
    "gender": "male",
    "iVoice": 11,
    "locale": "de-DE",
    "service": "aws-polly"
  },
  {
    "name": "Marlene",
    "label": "🤖 Marlene (schneller)",
    "langTrans": "de",
    "gender": "female",
    "iVoice": 12,
    "locale": "de-DE",
    "service": "aws-polly"
  },
  {
    "name": "sujato_pli",
    "label": "🗣 Bhante Sujato (Pali)",
    "langTrans": "pli",
    "gender": "male",
    "locale": "pli",
    "service": "human-tts"
  },
  {
    "name": "Ricardo",
    "label": "🤖 Ricardo",
    "langTrans": "pt",
    "gender": "male",
    "iVoice": 10,
    "locale": "pt-BR",
    "service": "aws-polly"
  },
  {
    "name": "Ines",
    "label": "🤖 Inés",
    "langTrans": "pt",
    "gender": "female",
    "iVoice": 11,
    "locale": "pt-PT",
    "service": "aws-polly"
  },
  {
    "name": "Celine",
    "label": "🤖 Celine",
    "langTrans": "fr",
    "gender": "female",
    "iVoice": 10,
    "locale": "fr-FR",
    "service": "aws-polly"
  },
  {
    "name": "Mathieu",
    "label": "🤖 Mathieu",
    "langTrans": "fr",
    "gender": "female",
    "iVoice": 10,
    "locale": "fr-FR",
    "service": "aws-polly"
  },
  {
    "name": "Takumi",
    "label": "🤖 Takumi",
    "langTrans": "ja",
    "gender": "male",
    "iVoice": 20,
    "locale": "ja-JP",
    "service": "aws-polly"
  },
  {
    "name": "Mizuki",
    "label": "🤖 Mizuki",
    "langTrans": "ja",
    "gender": "female",
    "iVoice": 21,
    "locale": "ja-JP",
    "service": "aws-polly"
  }
]
export default VOICES
