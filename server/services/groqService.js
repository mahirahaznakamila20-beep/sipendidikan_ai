const fs = require('fs');

const GROQ_API_URL = process.env.GROQ_API_URL;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const buildPrompt = ({
  subject,
  topic,
  choices = 0,
  complex = 0,
  fill = 0,
  essay = 0,
  imageRatio = 0,
  difficulty = 'sedang',
  customPrompt = ''
}) => {

return `
Buat paket asesmen mata pelajaran ${subject}.

Materi:
${topic}

Jumlah soal:

- Pilihan ganda: ${choices}
- Pilihan ganda kompleks: ${complex}
- Isian singkat: ${fill}
- Uraian: ${essay}

Ketentuan:

- Gunakan bahasa Indonesia yang jelas.
- Soal kontekstual dan sesuai kehidupan sehari-hari.
- Tingkat kesulitan: ${difficulty}
- Hindari soal ambigu.
- Integrasikan penalaran.
${imageRatio ? `- Sekitar ${imageRatio}% soal dapat menggunakan gambar.` : ''}

Jenis soal:

A. pilihan_ganda
- 4 opsi
- hanya 1 jawaban benar
- options wajib array

B. pilihan_ganda_kompleks
- 4 opsi
- tepat 2 jawaban benar
- answer berupa array

Contoh:

"answer":["A","C"]

C. isian_singkat
- jawaban singkat
- options=[]

D. uraian
- sertakan rubric
- options=[]

${customPrompt ? `
Instruksi tambahan:
${customPrompt}
` : ''}

WAJIB:

Balas HANYA JSON VALID.

Jangan markdown.
Jangan gunakan \`\`\`
Jangan gunakan penjelasan.

Format HARUS:

{
 "questions":[
   {
      "type":"pilihan_ganda",
      "difficulty":"sedang",
      "question":"....",
      "options":[
         "A....",
         "B....",
         "C....",
         "D...."
      ],
      "answer":"A",
      "explanation":"....",
      "bloom":"C2",
      "image_url":null,
      "rubric":null
   }
 ]
}

Untuk soal isian dan uraian:

"options":[]

`;
};

const repairJson = (txt) => {

return txt

.replace(/,\s*}/g,'}')
.replace(/,\s*]/g,']')

.replace(
/([{,]\s*)([A-Za-z0-9_]+):/g,
'$1"$2":'
)

.trim();

};

const extractJson=(text)=>{

if(!text) return null;

let content=String(text).trim();

content=content
.replace(
/```json\s*/gi,
''
)

.replace(
/```/g,
''
)

.trim();

const tryParse=(input)=>{

try{

return JSON.parse(input);

}catch{

return null;

}

};

let parsed=tryParse(content);

if(parsed) return parsed;

const objMatch=
content.match(
/\{[\s\S]*\}/
);

if(objMatch){

const repaired=
repairJson(
objMatch[0]
);

parsed=
tryParse(repaired);

if(parsed){

return parsed;

}

}

return null;

};

const makeRequest=async(payload)=>{

const response=
await fetch(
`${GROQ_API_URL}/chat/completions`,
{
method:'POST',

headers:{
'Content-Type':
'application/json',

Authorization:
`Bearer ${GROQ_API_KEY}`
},

body:
JSON.stringify(payload)

}
);

const data=
await response.json();

if(!response.ok){

console.log(
"GROQ ERROR:",
data
);

throw new Error(

data?.error?.message ||

data?.message ||

'Groq request failed'

);

}

return data;

};

const generateQuestionBank=async({

subject,
topic,
choices=0,
complex=0,
fill=0,
essay=0,
imageRatio=0,
difficulty='sedang',
customPrompt=''

})=>{

if(
!GROQ_API_URL ||
!GROQ_API_KEY
){

throw new Error(
'GROQ_API_URL atau GROQ_API_KEY belum diisi'
);

}

const prompt=
buildPrompt({

subject,
topic,
choices,
complex,
fill,
essay,
imageRatio,
difficulty,
customPrompt

});

const totalQuestions=

choices+
complex+
fill+
essay;

const payload={

model:
'llama-3.3-70b-versatile',

messages:[

{
role:'system',

content:`
Kamu AI pembuat bank soal.

Balas HANYA JSON.

Tidak boleh markdown.

Format:

{
"questions":[]
}
`
},

{
role:'user',
content:prompt
}

],

temperature:0.2,

max_tokens:
Math.max(
2000,
totalQuestions*250
),

response_format:{
type:"json_object"
}

};

let lastError=null;

for(
let attempt=1;
attempt<=3;
attempt++
){

try{

const data=
await makeRequest(
payload
);

const content=

data?.choices?.[0]
?.message?.content;

if(!content){

throw new Error(
'Response kosong'
);

}

fs.writeFileSync(
'groq-debug.txt',
content
);

console.log(
"GROQ RESPONSE:"
);

console.log(
content
);

const parsed=
extractJson(
content
);

if(

parsed &&
Array.isArray(
parsed.questions
)

){

return parsed.questions;

}

throw new Error(
'JSON questions tidak ditemukan'
);

}catch(err){

lastError=err;

console.log(
"ATTEMPT:",
attempt
);

console.log(
err.message
);

if(
attempt===3
){

break;

}

await new Promise(
r=>setTimeout(
r,
attempt*1000
)
);

}

}

throw lastError;

};

module.exports={

generateQuestionBank,
extractJson

};