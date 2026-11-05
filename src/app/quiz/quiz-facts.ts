import { Language } from '../shared/i18n/languages';

export interface QuizFactText {
  en: string;
  de: string;
  fr: string;
}

export interface QuizFact {
  scientificName: string;
  commonName: string;
  question: QuizFactText;
  fact: QuizFactText;
}

export const QUIZ_FACT_LIST: readonly QuizFact[] = [
  {
    scientificName: 'Okapia johnstoni',
    commonName: 'Okapi',
    question: {
      en: 'Which animal is the giraffe’s closest living relative?',
      de: 'Welches Tier ist der nächste lebende Verwandte der Giraffe?',
      fr: 'Quel animal est le plus proche parent vivant de la girafe ?',
    },
    fact: {
      en: 'It is the only other living member of the giraffe family, and its legs carry zebra-like stripes.',
      de: 'Es ist das einzige andere lebende Mitglied der Giraffenfamilie, und seine Beine tragen zebraartige Streifen.',
      fr: 'C’est le seul autre membre vivant de la famille des girafes, et ses pattes portent des rayures semblables à celles du zèbre.',
    },
  },
  {
    scientificName: 'Ambystoma mexicanum',
    commonName: 'Axolotl',
    question: {
      en: 'Which animal keeps feathery external gills as an adult?',
      de: 'Welches Tier behält als ausgewachsenes Tier gefiederte Außenkiemen?',
      fr: 'Quel animal garde des branchies externes plumeuses à l’âge adulte ?',
    },
    fact: {
      en: 'This salamander can also regrow a lost limb.',
      de: 'Dieser Schwanzlurch kann außerdem eine verlorene Gliedmaße nachwachsen lassen.',
      fr: 'Cette salamandre peut aussi faire repousser un membre perdu.',
    },
  },
  {
    scientificName: 'Balaeniceps rex',
    commonName: 'Shoebill',
    question: {
      en: 'Which bird is named for a bill shaped like a shoe?',
      de: 'Welcher Vogel ist nach seinem schuhförmigen Schnabel benannt?',
      fr: 'Quel oiseau doit son nom à un bec en forme de chaussure ?',
    },
    fact: {
      en: 'It often hunts by standing still in the swamp, then striking quickly.',
      de: 'Er jagt oft, indem er still im Sumpf steht und dann blitzschnell zuschlägt.',
      fr: 'Il chasse souvent en restant immobile dans le marais, puis en frappant très vite.',
    },
  },
  {
    scientificName: 'Daubentonia madagascariensis',
    commonName: 'Aye-aye',
    question: {
      en: 'Which animal taps on wood with a very long middle finger to find grubs?',
      de: 'Welches Tier klopft mit einem sehr langen Mittelfinger auf Holz, um Larven zu finden?',
      fr: 'Quel animal tapote le bois avec un majeur très long pour trouver des larves ?',
    },
    fact: {
      en: 'It is the only living member of its primate family, the Daubentoniidae.',
      de: 'Es ist das einzige lebende Mitglied seiner Primatenfamilie, der Daubentoniidae.',
      fr: 'C’est le seul membre vivant de sa famille de primates, les Daubentoniidae.',
    },
  },
  {
    scientificName: 'Psychrolutes marcidus',
    commonName: 'Blobfish',
    question: {
      en: 'Which deep-sea fish looks like a soft blob after it is brought to the surface?',
      de: 'Welcher Tiefseefisch sieht an der Oberfläche wie ein weicher Klumpen aus?',
      fr: 'Quel poisson des grands fonds ressemble à une masse molle une fois remonté à la surface ?',
    },
    fact: {
      en: 'The drooping look comes from the drop in pressure. At depth its body is firmer.',
      de: 'Das schlaffe Aussehen kommt vom Druckabfall. In der Tiefe ist der Körper fester.',
      fr: 'Cet aspect affaissé vient de la chute de pression. En profondeur, son corps est plus ferme.',
    },
  },
  {
    scientificName: 'Ornithorhynchus anatinus',
    commonName: 'Platypus',
    question: {
      en: 'Which mammal lays eggs and has a broad bill?',
      de: 'Welches Säugetier legt Eier und hat einen breiten Schnabel?',
      fr: 'Quel mammifère pond des œufs et possède un large bec ?',
    },
    fact: {
      en: 'The male has a venomous spur on each hind ankle.',
      de: 'Das Männchen trägt an jedem hinteren Fußgelenk einen Giftsporn.',
      fr: 'Le mâle porte un éperon venimeux à chaque cheville arrière.',
    },
  },
  {
    scientificName: 'Monodon monoceros',
    commonName: 'Narwhal',
    question: {
      en: 'Which whale grows a long spiral tusk that is actually a tooth?',
      de: 'Welcher Wal trägt einen langen spiralförmigen Stoßzahn, der in Wirklichkeit ein Zahn ist?',
      fr: 'Quelle baleine porte une longue défense spiralée qui est en réalité une dent ?',
    },
    fact: {
      en: 'It is usually the male’s left upper canine that grows out through the lip.',
      de: 'Meist wächst der linke obere Eckzahn des Männchens durch die Lippe nach außen.',
      fr: 'C’est en général la canine supérieure gauche du mâle qui pousse à travers la lèvre.',
    },
  },
  {
    scientificName: 'Strigops habroptilus',
    commonName: 'Kakapo',
    question: {
      en: 'Which parrot cannot fly and is active at night?',
      de: 'Welcher Papagei kann nicht fliegen und ist nachts aktiv?',
      fr: 'Quel perroquet ne vole pas et est actif la nuit ?',
    },
    fact: {
      en: 'It is also the heaviest parrot.',
      de: 'Er ist außerdem der schwerste Papagei.',
      fr: 'C’est aussi le plus lourd des perroquets.',
    },
  },
  {
    scientificName: 'Apteryx',
    commonName: 'Kiwi',
    question: {
      en: 'Which bird has its nostrils at the tip of a long bill?',
      de: 'Welcher Vogel hat die Nasenlöcher an der Spitze eines langen Schnabels?',
      fr: 'Quel oiseau a les narines au bout d’un long bec ?',
    },
    fact: {
      en: 'Relative to its body, it lays one of the largest eggs of any bird.',
      de: 'Im Verhältnis zum Körper legt er eines der größten Eier aller Vögel.',
      fr: 'Par rapport à son corps, il pond l’un des plus gros œufs de tous les oiseaux.',
    },
  },
  {
    scientificName: 'Manis crassicaudata',
    commonName: 'Indian pangolin',
    question: {
      en: 'Which mammal is covered in large scales of keratin, the same material as hair?',
      de: 'Welches Säugetier ist von großen Schuppen aus Keratin bedeckt, demselben Stoff wie Haare?',
      fr: 'Quel mammifère est couvert de grandes écailles de kératine, la même matière que les poils ?',
    },
    fact: {
      en: 'When threatened, it rolls into a ball so the scales face outward.',
      de: 'Bei Gefahr rollt es sich zu einer Kugel, sodass die Schuppen nach außen zeigen.',
      fr: 'En cas de danger, il se roule en boule pour présenter ses écailles vers l’extérieur.',
    },
  },
  {
    scientificName: 'Phycodurus eques',
    commonName: 'Leafy seadragon',
    question: {
      en: 'Which animal is disguised as a piece of drifting seaweed?',
      de: 'Welches Tier ist als treibendes Stück Seetang getarnt?',
      fr: 'Quel animal est déguisé en morceau d’algue à la dérive ?',
    },
    fact: {
      en: 'The male carries the eggs on a brood patch under his tail.',
      de: 'Das Männchen trägt die Eier auf einer Bruttasche unter dem Schwanz.',
      fr: 'Le mâle porte les œufs sur une poche incubatrice sous la queue.',
    },
  },
  {
    scientificName: 'Cryptoprocta ferox',
    commonName: 'Fossa',
    question: {
      en: 'Which hunter in Madagascar is a relative of mongooses, not of cats?',
      de: 'Welcher Jäger auf Madagaskar ist mit Mangusten verwandt, nicht mit Katzen?',
      fr: 'Quel chasseur de Madagascar est parent des mangoustes, et non des chats ?',
    },
    fact: {
      en: 'It is the island’s largest native carnivore and can hunt lemurs in the trees.',
      de: 'Es ist das größte einheimische Raubtier der Insel und kann Lemuren in den Bäumen jagen.',
      fr: 'C’est le plus grand carnivore indigène de l’île, et il peut chasser les lémuriens dans les arbres.',
    },
  },
  {
    scientificName: 'Saiga tatarica',
    commonName: 'Saiga',
    question: {
      en: 'Which antelope has a large flexible nose that filters dust?',
      de: 'Welche Antilope hat eine große bewegliche Nase, die Staub filtert?',
      fr: 'Quelle antilope a un grand nez souple qui filtre la poussière ?',
    },
    fact: {
      en: 'The swollen nose also warms cold air before it reaches the lungs.',
      de: 'Die aufgeblähte Nase wärmt außerdem kalte Luft, bevor sie die Lunge erreicht.',
      fr: 'Ce nez gonflé réchauffe aussi l’air froid avant qu’il n’atteigne les poumons.',
    },
  },
  {
    scientificName: 'Nasalis larvatus',
    commonName: 'Proboscis monkey',
    question: {
      en: 'Which monkey is known for the male’s very large fleshy nose?',
      de: 'Welcher Affe ist für die sehr große fleischige Nase des Männchens bekannt?',
      fr: 'Quel singe est connu pour le très grand nez charnu du mâle ?',
    },
    fact: {
      en: 'It is a strong swimmer and often crosses rivers in Borneo.',
      de: 'Er schwimmt gut und überquert auf Borneo oft Flüsse.',
      fr: 'C’est un bon nageur, et il traverse souvent les rivières à Bornéo.',
    },
  },
  {
    scientificName: 'Heterocephalus glaber',
    commonName: 'Naked mole-rat',
    question: {
      en: 'Which mammal lives in a colony ruled by one breeding queen?',
      de: 'Welches Säugetier lebt in einer Kolonie mit einer einzigen fortpflanzungsfähigen Königin?',
      fr: 'Quel mammifère vit dans une colonie dirigée par une seule reine reproductrice ?',
    },
    fact: {
      en: 'The colony spends nearly all of its life in underground tunnels.',
      de: 'Die Kolonie verbringt fast ihr ganzes Leben in unterirdischen Gängen.',
      fr: 'La colonie passe presque toute sa vie dans des tunnels souterrains.',
    },
  },
  {
    scientificName: 'Opisthocomus hoazin',
    commonName: 'Hoatzin',
    question: {
      en: 'Which bird’s chicks have claws on their wings?',
      de: 'Welcher Vogel hat als Küken Krallen an den Flügeln?',
      fr: 'Quel oiseau a, au stade de poussin, des griffes sur les ailes ?',
    },
    fact: {
      en: 'The claws help the chicks climb if they drop from the nest toward the water.',
      de: 'Die Krallen helfen den Küken beim Klettern, wenn sie aus dem Nest zum Wasser hinunterfallen.',
      fr: 'Ces griffes aident les poussins à grimper s’ils tombent du nid vers l’eau.',
    },
  },
  {
    scientificName: 'Synodontis nigriventris',
    commonName: 'Upside-down catfish',
    question: {
      en: 'Which animal usually swims upside down?',
      de: 'Welches Tier schwimmt gewöhnlich auf dem Rücken?',
      fr: 'Quel animal nage d’habitude sur le dos ?',
    },
    fact: {
      en: 'Its belly is darker than its back, the reverse of the usual fish pattern.',
      de: 'Sein Bauch ist dunkler als sein Rücken, also umgekehrt zum üblichen Fischmuster.',
      fr: 'Son ventre est plus sombre que son dos, à l’inverse du motif habituel des poissons.',
    },
  },
  {
    scientificName: 'Tachyglossus aculeatus',
    commonName: 'Short-beaked echidna',
    question: {
      en: 'Which spiny mammal lays eggs?',
      de: 'Welches stachelige Säugetier legt Eier?',
      fr: 'Quel mammifère épineux pond des œufs ?',
    },
    fact: {
      en: 'Together with the platypus, echidnas are the only living mammals that lay eggs.',
      de: 'Zusammen mit dem Schnabeltier sind Ameisenigel die einzigen lebenden Säugetiere, die Eier legen.',
      fr: 'Avec l’ornithorynque, les échidnés sont les seuls mammifères vivants qui pondent des œufs.',
    },
  },
];

export function quizFactText(text: QuizFactText, language: Language): string {
  return text[language];
}
