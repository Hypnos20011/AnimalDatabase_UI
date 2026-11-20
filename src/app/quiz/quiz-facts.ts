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
  {
    scientificName: 'Inia geoffrensis',
    commonName: 'Amazon river dolphin',
    question: {
      en: 'Which dolphin lives in the Amazon and Orinoco rivers rather than in the sea?',
      de: 'Welcher Delfin lebt in den Flüssen Amazonas und Orinoko und nicht im Meer?',
      fr: 'Quel dauphin vit dans les fleuves Amazone et Orénoque plutôt que dans la mer ?',
    },
    fact: {
      en: 'Its neck vertebrae are not fused, so it can turn its head from side to side.',
      de: 'Seine Halswirbel sind nicht verwachsen, deshalb kann es den Kopf zur Seite drehen.',
      fr: 'Ses vertèbres du cou ne sont pas soudées, il peut donc tourner la tête sur les côtés.',
    },
  },
  {
    scientificName: 'Mungos mungo',
    commonName: 'Banded mongoose',
    question: {
      en: 'Which mongoose forages in a pack and takes turns babysitting the pups?',
      de: 'Welche Manguste sucht im Trupp nach Nahrung und wechselt sich bei der Jungenbetreuung ab?',
      fr: 'Quelle mangouste cherche sa nourriture en groupe et se relaie pour garder les petits ?',
    },
    fact: {
      en: 'Several females in a band give birth on the same night, and the pups are raised together.',
      de: 'Mehrere Weibchen einer Gruppe bringen in derselben Nacht Junge zur Welt, und diese werden gemeinsam aufgezogen.',
      fr: 'Plusieurs femelles d’un groupe mettent bas la même nuit, et les petits sont élevés ensemble.',
    },
  },
  {
    scientificName: 'Otocyon megalotis',
    commonName: 'Bat-eared fox',
    question: {
      en: 'Which fox feeds mainly on termites?',
      de: 'Welcher Fuchs ernährt sich vor allem von Termiten?',
      fr: 'Quel renard se nourrit surtout de termites ?',
    },
    fact: {
      en: 'It has more teeth than any other canid, which helps it chew insects.',
      de: 'Er hat mehr Zähne als jeder andere Hundsartige, was ihm beim Kauen von Insekten hilft.',
      fr: 'Il a plus de dents que tout autre canidé, ce qui l’aide à mâcher des insectes.',
    },
  },
  {
    scientificName: 'Arctictis binturong',
    commonName: 'Binturong',
    question: {
      en: 'Which animal marks its route with urine that smells like popcorn?',
      de: 'Welches Tier markiert seinen Weg mit Urin, der nach Popcorn riecht?',
      fr: 'Quel animal marque son chemin avec une urine qui sent le pop-corn ?',
    },
    fact: {
      en: 'It also has a prehensile tail that it uses as an extra grip in the trees.',
      de: 'Er hat außerdem einen Greifschwanz, mit dem er sich in den Bäumen zusätzlich festhält.',
      fr: 'Il a aussi une queue préhensile, dont il se sert comme prise supplémentaire dans les arbres.',
    },
  },
  {
    scientificName: 'Neofelis nebulosa',
    commonName: 'Clouded leopard',
    question: {
      en: 'Which cat has the longest canine teeth for the size of its skull?',
      de: 'Welche Katze hat im Verhältnis zum Schädel die längsten Eckzähne?',
      fr: 'Quel félin a les plus longues canines par rapport à la taille de son crâne ?',
    },
    fact: {
      en: 'It can rotate its hind ankles and climb down a tree head first.',
      de: 'Sie kann die Hinterknöchel drehen und einen Baum mit dem Kopf voran hinabklettern.',
      fr: 'Il peut tourner ses chevilles arrière et descendre d’un arbre la tête la première.',
    },
  },
  {
    scientificName: 'Grimpoteuthis',
    commonName: 'Dumbo octopus',
    question: {
      en: 'Which octopus has a pair of fins that look like ears?',
      de: 'Welcher Oktopus hat ein Paar Flossen, die wie Ohren aussehen?',
      fr: 'Quelle pieuvre a une paire de nageoires qui ressemblent à des oreilles ?',
    },
    fact: {
      en: 'The fins gave it the name Dumbo, after the elephant in the film.',
      de: 'Die Flossen haben ihm den Namen Dumbo gegeben, nach dem Elefanten aus dem Film.',
      fr: 'Ces nageoires lui ont valu le nom de Dumbo, d’après l’éléphant du film.',
    },
  },
  {
    scientificName: 'Vulpes zerda',
    commonName: 'Fennec fox',
    question: {
      en: 'Which fox has very large ears and lives in the Sahara?',
      de: 'Welcher Fuchs hat sehr große Ohren und lebt in der Sahara?',
      fr: 'Quel renard a de très grandes oreilles et vit dans le Sahara ?',
    },
    fact: {
      en: 'It is the smallest fox, and its ears also help it shed heat.',
      de: 'Er ist der kleinste Fuchs, und die Ohren helfen ihm außerdem, Wärme abzugeben.',
      fr: 'C’est le plus petit des renards, et ses oreilles l’aident aussi à évacuer la chaleur.',
    },
  },
  {
    scientificName: 'Hyalinobatrachium fleischmanni',
    commonName: "Fleischmann's glass frog",
    question: {
      en: 'Which frog has a see-through belly that shows its organs?',
      de: 'Welcher Frosch hat einen durchsichtigen Bauch, durch den man die Organe sieht?',
      fr: 'Quelle grenouille a un ventre transparent qui laisse voir ses organes ?',
    },
    fact: {
      en: 'The male stays with the eggs on a leaf above a stream and keeps them moist.',
      de: 'Das Männchen bleibt bei den Eiern auf einem Blatt über einem Bach und hält sie feucht.',
      fr: 'Le mâle reste auprès des œufs sur une feuille au-dessus d’un ruisseau et les garde humides.',
    },
  },
  {
    scientificName: 'Gavialis gangeticus',
    commonName: 'Gharial',
    question: {
      en: 'Which crocodile has a long narrow snout used to catch fish?',
      de: 'Welches Krokodil hat eine lange schmale Schnauze, mit der es Fische fängt?',
      fr: 'Quel crocodile a un long museau étroit dont il se sert pour attraper des poissons ?',
    },
    fact: {
      en: 'The adult male grows a round bulb, the ghara, on the tip of the snout.',
      de: 'Das erwachsene Männchen trägt an der Schnauzenspitze einen runden Höcker, den Ghara.',
      fr: 'Le mâle adulte porte une bosse ronde, le ghara, au bout du museau.',
    },
  },
  {
    scientificName: 'Myrmecophaga tridactyla',
    commonName: 'Giant anteater',
    question: {
      en: 'Which anteater is the largest and has a bushy tail almost as long as its body?',
      de: 'Welcher Ameisenbär ist der größte und hat einen buschigen Schwanz, fast so lang wie der Körper?',
      fr: 'Quel fourmilier est le plus grand et a une queue touffue presque aussi longue que son corps ?',
    },
    fact: {
      en: 'It has no teeth. A long sticky tongue flicks into ant and termite nests.',
      de: 'Er hat keine Zähne. Eine lange klebrige Zunge schnellt in Ameisen- und Termitenbauten.',
      fr: 'Il n’a pas de dents. Une longue langue collante plonge dans les nids de fourmis et de termites.',
    },
  },
  {
    scientificName: 'Heteropoda maxima',
    commonName: 'Giant huntsman spider',
    question: {
      en: 'Which spider has the longest leg span, about 30 centimetres?',
      de: 'Welche Spinne hat die größte Beinspannweite, etwa 30 Zentimeter?',
      fr: 'Quelle araignée a la plus grande envergure de pattes, environ 30 centimètres ?',
    },
    fact: {
      en: 'It was described in 2001 from a cave in Laos.',
      de: 'Sie wurde 2001 aus einer Höhle in Laos beschrieben.',
      fr: 'Elle a été décrite en 2001 à partir d’une grotte au Laos.',
    },
  },
  {
    scientificName: 'Phyllobates terribilis',
    commonName: 'Golden poison frog',
    question: {
      en: 'Which frog’s skin carries enough poison to kill a person who handles it?',
      de: 'Welcher Frosch trägt auf der Haut genug Gift, um einen Menschen zu töten, der ihn anfasst?',
      fr: 'Quelle grenouille a sur la peau assez de poison pour tuer une personne qui la manipule ?',
    },
    fact: {
      en: 'In the wild the poison comes from its diet. Frogs raised on other food are not toxic.',
      de: 'In der Natur stammt das Gift aus der Nahrung. Frösche mit anderem Futter sind nicht giftig.',
      fr: 'Dans la nature, le poison vient de sa nourriture. Élevées avec un autre régime, ces grenouilles ne sont pas toxiques.',
    },
  },
  {
    scientificName: 'Hapalochlaena lunulata',
    commonName: 'Greater blue-ringed octopus',
    question: {
      en: 'Which octopus flashes blue rings when it is alarmed?',
      de: 'Welcher Oktopus zeigt blaue Ringe, wenn er alarmiert ist?',
      fr: 'Quelle pieuvre montre des anneaux bleus quand elle est alarmée ?',
    },
    fact: {
      en: 'Its bite carries tetrodotoxin, and there is no antivenom.',
      de: 'Sein Biss enthält Tetrodotoxin, und es gibt kein Gegengift.',
      fr: 'Sa morsure contient de la tétrodotoxine, et il n’existe pas d’antidote.',
    },
  },
  {
    scientificName: 'Harpia harpyja',
    commonName: 'Harpy eagle',
    question: {
      en: 'Which eagle is the largest in the Americas and often hunts sloths and monkeys?',
      de: 'Welcher Adler ist der größte Amerikas und jagt oft Faultiere und Affen?',
      fr: 'Quel aigle est le plus grand des Amériques et chasse souvent des paresseux et des singes ?',
    },
    fact: {
      en: 'Its rear talons can be as long as a grizzly bear’s claws.',
      de: 'Seine hinteren Krallen können so lang sein wie die Krallen eines Grizzlybären.',
      fr: 'Ses serres arrière peuvent être aussi longues que les griffes d’un grizzli.',
    },
  },
  {
    scientificName: 'Dosidicus gigas',
    commonName: 'Humboldt squid',
    question: {
      en: 'Which squid hunts in schools and can flash from red to white?',
      de: 'Welcher Kalmar jagt in Schwärmen und kann von Rot zu Weiß aufblitzen?',
      fr: 'Quel calmar chasse en bancs et peut passer du rouge au blanc en un éclair ?',
    },
    fact: {
      en: 'The colour change comes from pigment cells in the skin.',
      de: 'Der Farbwechsel kommt von Farbzellen in der Haut.',
      fr: 'Ce changement de couleur vient de cellules pigmentaires de la peau.',
    },
  },
  {
    scientificName: 'Macrocheira kaempferi',
    commonName: 'Japanese spider crab',
    question: {
      en: 'Which crab has the longest legs of any living crab?',
      de: 'Welche Krabbe hat die längsten Beine aller lebenden Krabben?',
      fr: 'Quel crabe a les plus longues pattes de tous les crabes vivants ?',
    },
    fact: {
      en: 'From claw to claw the span can reach about 3.7 metres.',
      de: 'Von Schere zu Schere kann die Spannweite etwa 3,7 Meter erreichen.',
      fr: 'D’une pince à l’autre, l’envergure peut atteindre environ 3,7 mètres.',
    },
  },
  {
    scientificName: 'Chelus fimbriata',
    commonName: 'Mata mata',
    question: {
      en: 'Which turtle sucks prey in by opening its wide mouth, instead of snapping at it?',
      de: 'Welche Schildkröte saugt Beute ein, indem sie das breite Maul öffnet, statt zuzuschnappen?',
      fr: 'Quelle tortue aspire sa proie en ouvrant sa large bouche, au lieu de la happer ?',
    },
    fact: {
      en: 'Flaps of skin make its head look like dead leaves in the water.',
      de: 'Hautlappen lassen den Kopf im Wasser wie abgestorbenes Laub aussehen.',
      fr: 'Des lambeaux de peau font ressembler sa tête à des feuilles mortes dans l’eau.',
    },
  },
  {
    scientificName: 'Pachydactylus rangei',
    commonName: 'Namib sand gecko',
    question: {
      en: 'Which gecko has webbed feet for running on loose desert sand?',
      de: 'Welcher Gecko hat Schwimmhäute an den Füßen, um auf lockerem Wüstensand zu laufen?',
      fr: 'Quel gecko a les pattes palmées pour courir sur le sable meuble du désert ?',
    },
    fact: {
      en: 'It lives in the Namib and can drink dew that condenses on its body.',
      de: 'Er lebt in der Namib und kann Tau trinken, der sich auf seinem Körper niederschlägt.',
      fr: 'Il vit dans le Namib et peut boire la rosée qui se condense sur son corps.',
    },
  },
  {
    scientificName: 'Chrysopelea paradisi',
    commonName: 'Paradise flying snake',
    question: {
      en: 'Which snake flattens its body and glides from tree to tree?',
      de: 'Welche Schlange plattet den Körper ab und gleitet von Baum zu Baum?',
      fr: 'Quel serpent aplatit son corps et plane d’arbre en arbre ?',
    },
    fact: {
      en: 'In the air it forms a moving S-shape and can travel farther than the height it drops.',
      de: 'In der Luft bildet sie ein bewegtes S und kann weiter gleiten, als sie an Höhe verliert.',
      fr: 'En l’air, il forme un S mobile et peut parcourir plus de distance qu’il ne perd de hauteur.',
    },
  },
  {
    scientificName: 'Chlamyphorus truncatus',
    commonName: 'Pink fairy armadillo',
    question: {
      en: 'Which armadillo is the smallest and has a pink shell?',
      de: 'Welches Gürteltier ist das kleinste und hat einen rosa Panzer?',
      fr: 'Quel tatou est le plus petit et a une carapace rose ?',
    },
    fact: {
      en: 'It spends most of its life underground in dry parts of Argentina.',
      de: 'Er verbringt den größten Teil seines Lebens unter der Erde in trockenen Gegenden Argentiniens.',
      fr: 'Il passe la plus grande partie de sa vie sous terre dans des régions sèches d’Argentine.',
    },
  },
  {
    scientificName: 'Narcine entemedor',
    commonName: 'Giant electric ray',
    question: {
      en: 'Which ray can give a strong electric shock?',
      de: 'Welcher Rochen kann einen starken elektrischen Schlag abgeben?',
      fr: 'Quelle raie peut donner une forte décharge électrique ?',
    },
    fact: {
      en: 'The shock comes from organs on the sides of the head, made of modified muscle.',
      de: 'Der Schlag kommt von Organen an den Kopfseiten, die aus umgewandelter Muskulatur bestehen.',
      fr: 'La décharge vient d’organes sur les côtés de la tête, faits de muscle modifié.',
    },
  },
  {
    scientificName: 'Condylura cristata',
    commonName: 'Star-nosed mole',
    question: {
      en: 'Which mole has a star of fleshy tentacles around its nose?',
      de: 'Welcher Maulwurf hat einen Stern aus fleischigen Tentakeln um die Nase?',
      fr: 'Quelle taupe a une étoile de tentacules charnus autour du nez ?',
    },
    fact: {
      en: 'The 22 tentacles can identify prey in a fraction of a second.',
      de: 'Die 22 Tentakel können Beute in einem Bruchteil einer Sekunde erkennen.',
      fr: 'Les 22 tentacules peuvent identifier une proie en une fraction de seconde.',
    },
  },
  {
    scientificName: 'Nycticebus coucang',
    commonName: 'Sunda slow loris',
    question: {
      en: 'Which primate has a venomous bite?',
      de: 'Welcher Primat hat einen giftigen Biss?',
      fr: 'Quel primate a une morsure venimeuse ?',
    },
    fact: {
      en: 'It licks a gland on its arm, and that oil mixes with saliva to make the venom.',
      de: 'Er leckt eine Drüse am Arm, und dieses Öl vermischt sich mit dem Speichel zum Gift.',
      fr: 'Il lèche une glande sur son bras, et cette huile se mêle à la salive pour former le venin.',
    },
  },
  {
    scientificName: 'Sarcophilus harrisii',
    commonName: 'Tasmanian devil',
    question: {
      en: 'Which marsupial is the largest living meat-eater and is found only in Tasmania?',
      de: 'Welches Beuteltier ist der größte lebende Fleischfresser und kommt nur auf Tasmanien vor?',
      fr: 'Quel marsupial est le plus grand carnivore vivant et ne se trouve qu’en Tasmanie ?',
    },
    fact: {
      en: 'Its jaws can crush bone.',
      de: 'Seine Kiefer können Knochen zerbrechen.',
      fr: 'Ses mâchoires peuvent broyer des os.',
    },
  },
  {
    scientificName: 'Galeopterus variegatus',
    commonName: 'Sunda flying lemur',
    question: {
      en: 'Which animal is called a flying lemur but is not a lemur and glides between trees?',
      de: 'Welches Tier wird fliegender Lemur genannt, ist aber kein Lemur und gleitet von Baum zu Baum?',
      fr: 'Quel animal est appelé lémur volant sans être un lémur, et plane d’arbre en arbre ?',
    },
    fact: {
      en: 'A skin membrane runs from the neck to the tail and includes the fingers.',
      de: 'Eine Hautmembran reicht vom Hals bis zum Schwanz und schließt die Finger ein.',
      fr: 'Une membrane de peau va du cou à la queue et englobe les doigts.',
    },
  },
  {
    scientificName: 'Varanus komodoensis',
    commonName: 'Komodo dragon',
    question: {
      en: 'Which lizard can produce young from eggs that a male never fertilised?',
      de: 'Welche Echse kann Junge aus Eiern hervorbringen, die nie von einem Männchen befruchtet wurden?',
      fr: 'Quel lézard peut produire des petits à partir d’œufs qu’un mâle n’a jamais fécondés ?',
    },
    fact: {
      en: 'It also has venom glands in the lower jaw. The venom lowers blood pressure and slows clotting.',
      de: 'Er hat außerdem Giftdrüsen im Unterkiefer. Das Gift senkt den Blutdruck und verlangsamt die Gerinnung.',
      fr: 'Il a aussi des glandes à venin dans la mâchoire inférieure. Ce venin baisse la pression sanguine et ralentit la coagulation.',
    },
  },
];

export function quizFactText(text: QuizFactText, language: Language): string {
  return text[language];
}
