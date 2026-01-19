import type { DialogueNode } from '../systems/GameState.js';

export interface NPCData {
  id: string;
  name: string;
  locationTag: string;
  spriteKey: string;
  portraitKey: string;
  suspect: boolean;
  dialogueLines: DialogueNode[];
  questHooks?: string[];
  spawnPoint?: { x: number; y: number };
}

export const NPC_DATA: Record<string, NPCData> = {
  'edwin_clarke': {
    id: 'edwin_clarke',
    name: 'Edwin Clarke',
    locationTag: 'police_station',
    spriteKey: 'detective',
    portraitKey: 'portrait_edwin',
    suspect: false,
    dialogueLines: [
      {
        id: 'edwin_greeting',
        speaker: 'Edwin Clarke',
        text: 'The body was found in the woods. But the killer remains in the shadows.',
        nextNodeId: 'edwin_options',
      },
      {
        id: 'edwin_options',
        speaker: 'Edwin Clarke',
        text: 'What would you like to know?',
        choices: [
          {
            text: 'Tell me about the case',
            nextNodeId: 'edwin_case',
          },
          {
            text: 'Where should I start?',
            nextNodeId: 'edwin_direction',
          },
        ],
      },
      {
        id: 'edwin_case',
        speaker: 'Edwin Clarke',
        text: 'Lillian Harrow. 16 years old. Her body was discovered near the old asylum. No witnesses... or so they claim.',
      },
      {
        id: 'edwin_direction',
        speaker: 'Edwin Clarke',
        text: 'Begin at Harrowford High. Interview the suspects. Then investigate the woods. But be careful.',
      },
    ],
  },

  'arthur_kosminski': {
    id: 'arthur_kosminski',
    name: 'Arthur Kosminski',
    locationTag: 'police_station',
    spriteKey: 'npc_1',
    portraitKey: 'portrait_arthur',
    suspect: true,
    dialogueLines: [
      {
        id: 'arthur_greeting',
        speaker: 'Arthur Kosminski',
        text: 'Good to see you, Edwin. I\'ve been gathering information.',
        nextNodeId: 'arthur_options',
      },
      {
        id: 'arthur_options',
        speaker: 'Arthur Kosminski',
        text: 'The evidence points in multiple directions.',
        choices: [
          {
            text: 'Who are the main suspects?',
            nextNodeId: 'arthur_suspects',
          },
          {
            text: 'What do you know about Whitcombe?',
            nextNodeId: 'arthur_whitcombe',
            requirements: { charisma: 3 },
          },
        ],
      },
      {
        id: 'arthur_suspects',
        speaker: 'Arthur Kosminski',
        text: 'Headmaster Whitcombe has a secret. Finch was tutoring her privately. And her classmates... well, teenagers have their secrets.',
      },
      {
        id: 'arthur_whitcombe',
        speaker: 'Arthur Kosminski',
        text: 'Whitcombe\'s been seen meeting with someone from the city. Information... or something else?',
      },
    ],
  },

  'aaron_kosminski': {
    id: 'aaron_kosminski',
    name: 'Aaron Kosminski',
    locationTag: 'woods',
    spriteKey: 'npc_2',
    portraitKey: 'portrait_aaron',
    suspect: true,
    dialogueLines: [
      {
        id: 'aaron_meet',
        speaker: 'Aaron Kosminski',
        text: 'You... found me. Arthur said you would.',
      },
    ],
  },

  'lillian_harrow': {
    id: 'lillian_harrow',
    name: 'Lillian Harrow',
    locationTag: 'school',
    spriteKey: 'npc_3',
    portraitKey: 'portrait_lillian',
    suspect: false,
    dialogueLines: [],
  },

  'headmaster_whitcombe': {
    id: 'headmaster_whitcombe',
    name: 'Headmaster Reginald Whitcombe',
    locationTag: 'school',
    spriteKey: 'npc_4',
    portraitKey: 'portrait_whitcombe',
    suspect: true,
    dialogueLines: [
      {
        id: 'whitcombe_greeting',
        speaker: 'Headmaster Whitcombe',
        text: 'Ah, Detective. Tragic business. Lillian was... a troubled student.',
        nextNodeId: 'whitcombe_options',
      },
      {
        id: 'whitcombe_options',
        speaker: 'Headmaster Whitcombe',
        text: 'I have classes to oversee.',
        choices: [
          {
            text: 'Was she really troubled?',
            nextNodeId: 'whitcombe_troubled',
          },
          {
            text: 'Why were you tutoring her?',
            nextNodeId: 'whitcombe_tutoring',
            requirements: { intimidation: 2 },
          },
        ],
      },
      {
        id: 'whitcombe_troubled',
        speaker: 'Headmaster Whitcombe',
        text: 'Her grades were slipping. She was... distracted. By boys, mainly.',
      },
      {
        id: 'whitcombe_tutoring',
        speaker: 'Headmaster Whitcombe',
        text: 'I... I was trying to help her improve. Nothing more!',
      },
    ],
  },

  'mr_finch': {
    id: 'mr_finch',
    name: 'Mr. Tobias Finch',
    locationTag: 'school',
    spriteKey: 'npc_5',
    portraitKey: 'portrait_finch',
    suspect: true,
    dialogueLines: [
      {
        id: 'finch_greeting',
        speaker: 'Mr. Finch',
        text: 'I only wanted to help her with her studies. Detective, you understand how students need extra attention sometimes.',
        nextNodeId: 'finch_options',
      },
      {
        id: 'finch_options',
        speaker: 'Mr. Finch',
        text: 'I have nothing to hide.',
        choices: [
          {
            text: 'Why the late sessions?',
            nextNodeId: 'finch_late',
          },
          {
            text: 'Did Lillian have feelings for you?',
            nextNodeId: 'finch_feelings',
            requirements: { charisma: 4 },
          },
        ],
      },
      {
        id: 'finch_late',
        speaker: 'Mr. Finch',
        text: 'Her grades were... suffering. I stayed to tutor her. It was innocent.',
      },
      {
        id: 'finch_feelings',
        speaker: 'Mr. Finch',
        text: 'I... she was just a student. Any feelings were entirely onesided.',
      },
    ],
  },

  'evie_moreland': {
    id: 'evie_moreland',
    name: 'Evelyn "Evie" Moreland',
    locationTag: 'school',
    spriteKey: 'npc_6',
    portraitKey: 'portrait_evie',
    suspect: true,
    dialogueLines: [
      {
        id: 'evie_greeting',
        speaker: 'Evelyn Moreland',
        text: 'Lillian... she was my best friend. Until she stopped talking to me.',
        nextNodeId: 'evie_options',
      },
      {
        id: 'evie_options',
        speaker: 'Evelyn Moreland',
        text: 'I don\'t want to talk about it.',
        choices: [
          {
            text: 'Why did she stop talking to you?',
            nextNodeId: 'evie_stopped',
          },
          {
            text: 'I understand this is difficult',
            nextNodeId: 'evie_empathy',
            requirements: { empathy: 3 },
          },
        ],
      },
      {
        id: 'evie_stopped',
        speaker: 'Evelyn Moreland',
        text: 'She started hanging out with Samuel. Then she changed.',
      },
      {
        id: 'evie_empathy',
        speaker: 'Evelyn Moreland',
        text: 'Thank you. We used to share everything. But then... she had secrets she wouldn\'t tell me.',
      },
    ],
  },

  'samuel_atwell': {
    id: 'samuel_atwell',
    name: 'Samuel Atwell',
    locationTag: 'school',
    spriteKey: 'npc_7',
    portraitKey: 'portrait_samuel',
    suspect: true,
    dialogueLines: [
      {
        id: 'samuel_greeting',
        speaker: 'Samuel Atwell',
        text: 'She loved me. I know she did. She just... needed time.',
        nextNodeId: 'samuel_options',
      },
      {
        id: 'samuel_options',
        speaker: 'Samuel Atwell',
        text: 'She was going to say yes.',
        choices: [
          {
            text: 'Did she reject you?',
            nextNodeId: 'samuel_rejected',
          },
          {
            text: 'Where were you the night she died?',
            nextNodeId: 'samuel_alibi',
            requirements: { intimidation: 2 },
          },
        ],
      },
      {
        id: 'samuel_rejected',
        speaker: 'Samuel Atwell',
        text: 'She was playing hard to get. That\'s all.',
      },
      {
        id: 'samuel_alibi',
        speaker: 'Samuel Atwell',
        text: 'I was at home. My mother can confirm it.',
      },
    ],
  },

  'beatrice_holloway': {
    id: 'beatrice_holloway',
    name: 'Beatrice Holloway',
    locationTag: 'school',
    spriteKey: 'npc_8',
    portraitKey: 'portrait_beatrice',
    suspect: false,
    dialogueLines: [
      {
        id: 'beatrice_greeting',
        speaker: 'Beatrice Holloway',
        text: 'Miss Harrow was... well-behaved. I never expected something like this.',
      },
    ],
  },

  'clara_redford': {
    id: 'clara_redford',
    name: 'Clara Redford',
    locationTag: 'school',
    spriteKey: 'npc_9',
    portraitKey: 'portrait_clara',
    suspect: false,
    dialogueLines: [
      {
        id: 'clara_greeting',
        speaker: 'Clara Redford',
        text: 'Lillian was the smartest in our class. It doesn\'t make sense.',
      },
    ],
  },

  'james_calder': {
    id: 'james_calder',
    name: 'James Calder',
    locationTag: 'school',
    spriteKey: 'npc_10',
    portraitKey: 'portrait_james',
    suspect: false,
    dialogueLines: [
      {
        id: 'james_greeting',
        speaker: 'James Calder',
        text: 'I saw her arguing with someone a few days ago. In the hall.',
      },
    ],
  },

  'mrs_loxley': {
    id: 'mrs_loxley',
    name: 'Mrs. Agnes Loxley',
    locationTag: 'school',
    spriteKey: 'npc_11',
    portraitKey: 'portrait_loxley',
    suspect: false,
    dialogueLines: [
      {
        id: 'loxley_greeting',
        speaker: 'Mrs. Loxley',
        text: 'Children can be cruel. But murder? In our school?',
      },
    ],
  },

  'mr_cobb': {
    id: 'mr_cobb',
    name: 'Mr. Alfred Cobb',
    locationTag: 'pennyworth_lane',
    spriteKey: 'npc_12',
    portraitKey: 'portrait_cobb',
    suspect: false,
    dialogueLines: [
      {
        id: 'cobb_greeting',
        speaker: 'Mr. Cobb',
        text: 'I keep my shop clean. Don\'t cause trouble.',
      },
    ],
  },

  'mary_henshaw': {
    id: 'mary_henshaw',
    name: 'Mary Henshaw',
    locationTag: 'pennyworth_lane',
    spriteKey: 'npc_13',
    portraitKey: 'portrait_mary',
    suspect: false,
    dialogueLines: [
      {
        id: 'mary_greeting',
        speaker: 'Mary Henshaw',
        text: 'I heard screams that night. From the woods direction.',
      },
    ],
  },

  'old_willy': {
    id: 'old_willy',
    name: 'Will "Old Willy" McGann',
    locationTag: 'pennyworth_lane',
    spriteKey: 'npc_14',
    portraitKey: 'portrait_willy',
    suspect: false,
    dialogueLines: [
      {
        id: 'willy_greeting',
        speaker: 'Old Willy',
        text: 'THE WOODS! I SAW THEM! TOOK HER INTO THE WOODS!',
        nextNodeId: 'willy_options',
      },
      {
        id: 'willy_options',
        speaker: 'Old Willy',
        text: 'I KNOW WHAT I SAW!',
        choices: [
          {
            text: 'What did you see?',
            nextNodeId: 'willy_saw',
          },
          {
            text: 'You\'re under arrest for vagrancy',
            nextNodeId: 'willy_arrest',
            requirements: { intimidation: 3 },
          },
        ],
      },
      {
        id: 'willy_saw',
        speaker: 'Old Willy',
        text: 'A MAN! TALL! CARRIED HER! DEEP INTO THE WOODS!',
        unlocks: {
          clueIds: ['clue_willy_witness'],
        },
      },
      {
        id: 'willy_arrest',
        speaker: 'Old Willy',
        text: 'NO! I WAS JUST THERE! I SAW! PLEASE!',
      },
    ],
    questHooks: ['talk_to_willy'],
  },

  'mr_harrow': {
    id: 'mr_harrow',
    name: 'Mr. Thomas Harrow',
    locationTag: 'harrow_residence',
    spriteKey: 'npc_15',
    portraitKey: 'portrait_mrharrow',
    suspect: false,
    dialogueLines: [
      {
        id: 'mrharrow_greeting',
        speaker: 'Mr. Harrow',
        text: 'My daughter... why did this happen?',
      },
    ],
  },

  'mrs_harrow': {
    id: 'mrs_harrow',
    name: 'Mrs. Rose Harrow',
    locationTag: 'harrow_residence',
    spriteKey: 'npc_16',
    portraitKey: 'portrait_mrsharrow',
    suspect: false,
    dialogueLines: [
      {
        id: 'mrsharrow_greeting',
        speaker: 'Mrs. Harrow',
        text: 'She was so happy. Why would someone hurt her?',
      },
    ],
  },

  'peter_harrow': {
    id: 'peter_harrow',
    name: 'Peter Harrow',
    locationTag: 'harrow_residence',
    spriteKey: 'npc_17',
    portraitKey: 'portrait_peter',
    suspect: false,
    dialogueLines: [
      {
        id: 'peter_greeting',
        speaker: 'Peter Harrow',
        text: 'I miss her. She was my big sister.',
      },
    ],
  },

  'ada_merriweather': {
    id: 'ada_merriweather',
    name: 'Ada Merriweather',
    locationTag: 'risky_passage',
    spriteKey: 'npc_18',
    portraitKey: 'portrait_ada',
    suspect: false,
    dialogueLines: [
      {
        id: 'ada_greeting',
        speaker: 'Ada Merriweather',
        text: 'You\'re not from around here. Watch yourself in the passage.',
      },
    ],
  },

  'mr_ashcombe': {
    id: 'mr_ashcombe',
    name: 'Mr. Lionel Ashcombe',
    locationTag: 'police_station',
    spriteKey: 'npc_19',
    portraitKey: 'portrait_ashcombe',
    suspect: false,
    dialogueLines: [
      {
        id: 'ashcombe_greeting',
        speaker: 'Mr. Ashcombe',
        text: 'The Chief wants this case solved quickly. Don\'t disappoint us, Clarke.',
      },
    ],
  },
};

export function getNPCById(id: string): NPCData | undefined {
  return NPC_DATA[id];
}

export function getNPCsByLocation(location: string): NPCData[] {
  return Object.values(NPC_DATA).filter(npc => npc.locationTag === location);
}

export function getAllSuspects(): NPCData[] {
  return Object.values(NPC_DATA).filter(npc => npc.suspect);
}
