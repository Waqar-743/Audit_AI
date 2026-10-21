import { mkdir, writeFile } from "node:fs/promises";

// Original, code-native illustrations. Shared by the website and extension.
const eye =
  '<circle cx="139" cy="65" r="13" fill="#f0ede8"/><circle cx="143" cy="64" r="4" fill="#111111"/><circle cx="145" cy="62" r="1.5" fill="#f0ede8"/>';
const bird = `<path d="M100 160c-24-10-35-33-30-61 3-20 18-32 30-38 2-25 20-38 40-32 22 6 29 27 20 45-2 20 13 39 0 65-10 19-34 29-60 21Z" fill="#a8ff57"/><path d="M98 91c-17 9-22 33-10 48 12 14 32 8 35-7 3-16-13-22-25-41Z" fill="#578a38"/><path d="m146 79 22-9c9 16-1 31-15 33l3-16Z" fill="#f0ede8"/><path d="m92 153-12 34 20-12 9 14 9-30" fill="#578a38"/>${eye}<path d="m110 34 1-14 11 10 7-15 7 14" fill="none"/><path d="m119 158-2 13m17-16 3 16m-27 0h17m4 0h16"/>`;
const nest =
  '<path d="M43 130q77 18 154 0-10 49-77 49t-77-49Z" fill="#304326"/><path d="m40 130 161 23M43 147l151-18M52 162l125-12M69 175l118-43M55 127l111 50M73 124l74 55" stroke="#a8ff57" fill="none"/>';
const illustrations = {
  parrot: [
    "Pip, your SEO companion",
    `<path d="M37 173h166" stroke="#888880"/>${bird}<path d="M175 171q-7-28 17-34 4 24-17 34Z" fill="#578a38"/>`,
  ],
  nest: [
    "Make a home for useful content",
    `${nest}<path d="m60 112 14 18m101-21-10 23M95 117l8 16"/>`,
  ],
  egg: [
    "Every good page starts somewhere",
    '<ellipse cx="120" cy="171" rx="61" ry="9" fill="#23301d"/><path d="M120 30c-22 0-53 67-53 96a53 43 0 0 0 106 0c0-29-31-96-53-96Z" fill="#f0ede8"/><path d="m98 112 5-8m30-29 5 4m6 47-3 7m-30 12 6-4" stroke="#578a38"/><path d="M87 76q5-16 17-26" stroke="#ffffff"/>',
  ],
  hatching: [
    "Small fixes, new beginnings",
    `<path d="M87 118V88a33 33 0 0 1 66 0v30" fill="#a8ff57"/><circle cx="111" cy="83" r="3" fill="#111111"/><circle cx="138" cy="83" r="3" fill="#111111"/><path d="m119 90 9 10 8-10" fill="#f0ede8"/><path d="m72 112 19 12 15-15 17 17 18-15 14 14 15-13c14 82-105 82-98 0Z" fill="#f0ede8"/><path d="m116 53 1-16 12 13 10-11"/>`,
  ],
  fledgling: [
    "Build confidence one check at a time",
    `<path d="M83 138q-34-14-30-47 27 6 37 23m65 24q33-14 29-47-27 6-37 23" fill="#578a38"/><ellipse cx="120" cy="118" rx="44" ry="49" fill="#a8ff57"/><circle cx="106" cy="102" r="4" fill="#111111"/><circle cx="135" cy="102" r="4" fill="#111111"/><path d="m113 115 9 11 10-11" fill="#f0ede8"/><path d="m103 165-7 12m42-12 7 12M112 71l-4-16 17 12 10-16"/><path d="M67 179h106" stroke="#888880"/>`,
  ],
  flight: [
    "Give your best work room to fly",
    '<path d="M111 106Q72 36 24 53q14 44 72 66-50-6-61 12 34 27 80 2l-8 40 27-37q33-4 38-34 40-10 45-48-49 0-72 47" fill="#a8ff57"/><path d="M91 104 49 71m53 49-43 12m96-24 37-34" stroke="#578a38"/><circle cx="154" cy="105" r="4" fill="#111111"/><path d="m166 113 15 3-15 9" fill="#f0ede8"/><path d="M36 162h35m-18 13h31" stroke="#888880"/>',
  ],
  feather: [
    "Keep the details light and clear",
    '<path d="M64 173C55 123 93 36 177 25c20 79-45 126-113 148Z" fill="#a8ff57"/><path d="m53 185 110-138M78 155l-4-35m23 11 1-38m22 9 1-34m-26 73 46-3m-25-23 44-5m-20-22 36-6" stroke="#304326"/><path d="m129 125 17 17" stroke="#111111"/>',
  ],
  branch: [
    "Strong foundations for your next page",
    '<path d="M33 155q74-9 171-74m-96 47-16-47m59 22 16 36" stroke="#888880"/><path d="M94 85Q54 84 59 43q40 2 35 42ZM137 112q-21-36 17-57 18 34-17 57Zm30 28q39-18 52 19-36 18-52-19Z" fill="#a8ff57"/><path d="m78 64 16 21m50-11-7 38m49 37-19-9" stroke="#578a38"/>',
  ],
  scout: [
    "Look closely, then decide",
    `<g transform="translate(-25 -5) scale(.85)">${bird}</g><circle cx="162" cy="120" r="32" fill="#111111" stroke="#f0ede8"/><circle cx="162" cy="120" r="23" fill="#a8ff57" fill-opacity=".12" stroke="#578a38"/><path d="m185 145 23 25" stroke="#f0ede8" stroke-width="9"/><path d="m150 119 8 8 16-17"/>`,
  ],
  map: [
    "A practical route through your fixes",
    '<path d="m32 60 57-18 63 18 56-18v113l-56 18-63-18-57 18Z" fill="#181818" stroke="#888880"/><path d="M89 42v113m63-95v113" stroke="#578a38"/><path d="M51 131q30-58 56-22t70-30" stroke="#a8ff57" stroke-dasharray="6 8"/><path d="M193 71c0 16-16 31-16 31s-16-15-16-31a16 16 0 0 1 32 0Z" fill="#a8ff57"/><circle cx="177" cy="70" r="5" fill="#111111"/>',
  ],
  leaf: [
    "Useful content grows with care",
    '<path d="M56 165C40 80 113 33 190 33c6 88-60 139-134 132Z" fill="#a8ff57"/><path d="m40 184 132-131m-90 88-7-32m35 4-4-37m-8 50 38 2m-1-27 28 1" stroke="#304326"/><path d="M189 133q-2 27-25 32" stroke="#888880"/>',
  ],
  compass: [
    "Choose the next useful step",
    '<circle cx="120" cy="104" r="69" fill="#181818" stroke="#578a38"/><circle cx="120" cy="104" r="53" stroke="#888880" fill="none"/><path d="m120 49 4 10m51 45h-10m-45 55v-10m-55-45h10"/><path d="m150 72-17 46-43 21 16-48Z" fill="#a8ff57"/><path d="m106 91 27 27" stroke="#111111"/><circle cx="120" cy="104" r="5" fill="#f0ede8"/><path d="M111 29v-9h18v9" stroke="#888880"/>',
  ],
  sunrise: [
    "A fresh start for every audit",
    '<path d="M53 132a67 67 0 0 1 134 0" fill="#a8ff57"/><path d="M28 132h184M50 152h140m-109 20h78M120 29V14m-67 42L42 45m145 11 11-11M28 101l-15-4m199 4 15-4" stroke="#888880"/><path d="m96 107 14-5 10 7 13-10 13 5" stroke="#304326"/>',
  ],
  flock: [
    "Better pages belong together",
    `<g transform="translate(-12 9) scale(.72)">${bird}</g><g transform="translate(80 20) scale(.63)">${bird}</g><path d="M37 177h170" stroke="#888880"/><path d="M111 51q10-14 20 0m5-15q10-14 20 0" fill="none"/>`,
  ],
  homecoming: [
    "Save the lesson and come back stronger",
    `<g transform="translate(33 -2) scale(.74)">${bird}</g>${nest}<path d="m35 63 10-10 10 10m131-12 8-8 8 8M28 89h13m-6-6v13" stroke="#a8ff57"/>`,
  ],
};
await mkdir("public/birds", { recursive: true });
for (const [name, [title, content]] of Object.entries(illustrations)) {
  await writeFile(
    `public/birds/${name}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 200" role="img" aria-labelledby="title"><title id="title">${title}</title><g stroke="#304326" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${content}</g></svg>\n`,
  );
}
console.log(
  `Created ${Object.keys(illustrations).length} original Pip illustrations.`,
);
