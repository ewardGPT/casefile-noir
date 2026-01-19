import type { Quest, Objective } from '../systems/GameState.js';

export const QUEST_DATA: Record<string, Quest> = {
  'day_1_investigation': {
    questId: 'day_1_investigation',
    title: 'Day 1: Initial Investigation',
    description: 'Interview suspects at Harrowford High and gather initial evidence.',
    stage: 0,
    objectives: [
      {
        id: 'obj_interview_finch',
        type: 'TALK_TO_NPC',
        description: 'Interview Mr. Finch at Harrowford High',
        targetId: 'mr_finch',
        completed: false,
      },
      {
        id: 'obj_interview_whitcombe',
        type: 'TALK_TO_NPC',
        description: 'Interview Headmaster Whitcombe',
        targetId: 'headmaster_whitcombe',
        completed: false,
      },
      {
        id: 'obj_interview_evie',
        type: 'TALK_TO_NPC',
        description: 'Talk to Evelyn Moreland',
        targetId: 'evie_moreland',
        completed: false,
      },
      {
        id: 'go_pennyworth',
        type: 'GO_TO_LOCATION',
        description: 'Travel to Pennyworth Lane',
        targetId: 'pennyworth_lane',
        completed: false,
      },
      {
        id: 'talk_willy',
        type: 'TALK_TO_NPC',
        description: 'Find Old Willy in Pennyworth Lane',
        targetId: 'old_willy',
        completed: false,
      },
      {
        id: 'return_station',
        type: 'GO_TO_LOCATION',
        description: 'Return to Police Station',
        targetId: 'police_station',
        completed: false,
      },
    ],
    completed: false,
  },

  'day_2_deep_dive': {
    questId: 'day_2_deep_dive',
    title: 'Day 2: Deep Investigation',
    description: 'Choose a suspect to interrogate further and search key locations.',
    stage: 0,
    objectives: [
      {
        id: 'obj_choose_path',
        type: 'ACCUSE_SUSPECT',
        description: 'Select a suspect for deep interrogation',
        targetId: '',
        completed: false,
      },
    ],
    completed: false,
  },

  'path_finch': {
    questId: 'path_finch',
    title: 'The Tutor\'s Secret',
    description: 'Investigate Mr. Finch\'s relationship with Lillian.',
    stage: 0,
    objectives: [
      {
        id: 'finch_search_school',
        type: 'GO_TO_LOCATION',
        description: 'Search Harrowford High for evidence',
        targetId: 'school',
        completed: false,
      },
      {
        id: 'finch_find_letter',
        type: 'COLLECT_CLUE',
        description: 'Find hidden letter from Finch',
        targetId: 'clue_finch_letter',
        completed: false,
      },
      {
        id: 'finch_confront',
        type: 'TALK_TO_NPC',
        description: 'Confront Mr. Finch with evidence',
        targetId: 'mr_finch',
        completed: false,
      },
    ],
    completed: false,
  },

  'path_evie': {
    questId: 'path_evie',
    title: 'The Former Best Friend',
    description: 'Uncover what caused the rift between Lillian and Evie.',
    stage: 0,
    objectives: [
      {
        id: 'evie_search_residence',
        type: 'GO_TO_LOCATION',
        description: 'Search Harrow Residence',
        targetId: 'harrow_residence',
        completed: false,
      },
      {
        id: 'evie_find_diary',
        type: 'COLLECT_CLUE',
        description: 'Find Lillian\'s diary',
        targetId: 'clue_diary',
        completed: false,
      },
      {
        id: 'evie_confront',
        type: 'TALK_TO_NPC',
        description: 'Confront Evelyn about the truth',
        targetId: 'evie_moreland',
        completed: false,
      },
    ],
    completed: false,
  },

  'path_samuel': {
    questId: 'path_samuel',
    title: 'The Rejected Lover',
    description: 'Investigate Samuel\'s obsession with Lillian.',
    stage: 0,
    objectives: [
      {
        id: 'samuel_search_risky',
        type: 'GO_TO_LOCATION',
        description: 'Investigate Risky Passage',
        targetId: 'risky_passage',
        completed: false,
      },
      {
        id: 'samuel_find_weapon',
        type: 'COLLECT_CLUE',
        description: 'Find suspicious item',
        targetId: 'clue_bloody_cloth',
        completed: false,
      },
      {
        id: 'samuel_confront',
        type: 'TALK_TO_NPC',
        description: 'Interrogate Samuel aggressively',
        targetId: 'samuel_atwell',
        completed: false,
      },
    ],
    completed: false,
  },

  'path_whitcombe': {
    questId: 'path_whitcombe',
    title: 'The Headmaster\'s Secret',
    description: 'Expose Headmaster Whitcombe\'s connection to the crime.',
    stage: 0,
    objectives: [
      {
        id: 'whitcombe_search_lions_den',
        type: 'GO_TO_LOCATION',
        description: 'Visit Lion\'s Den',
        targetId: 'lions_den',
        completed: false,
      },
      {
        id: 'whitcombe_find_ledger',
        type: 'COLLECT_CLUE',
        description: 'Find the blackmail ledger',
        targetId: 'clue_ledger',
        completed: false,
      },
      {
        id: 'whitcombe_confront',
        type: 'TALK_TO_NPC',
        description: 'Confront Headmaster Whitcombe',
        targetId: 'headmaster_whitcombe',
        completed: false,
      },
    ],
    completed: false,
  },

  'final_accusation': {
    questId: 'final_accusation',
    title: 'Final Accusation',
    description: 'Accuse the true killer based on your evidence.',
    stage: 0,
    objectives: [
      {
        id: 'accuse_killer',
        type: 'ACCUSE_SUSPECT',
        description: 'Make your final accusation',
        targetId: '',
        completed: false,
      },
    ],
    completed: false,
  },
};

export function getQuestById(questId: string): Quest | undefined {
  return QUEST_DATA[questId];
}

export function getAvailableQuests(day: number): Quest[] {
  if (day === 1) {
    return [QUEST_DATA['day_1_investigation']];
  }
  if (day === 2) {
    return [
      QUEST_DATA['day_2_deep_dive'],
      QUEST_DATA['path_finch'],
      QUEST_DATA['path_evie'],
      QUEST_DATA['path_samuel'],
      QUEST_DATA['path_whitcombe'],
    ];
  }
  return [QUEST_DATA['final_accusation']];
}

export function getActivePathQuest(pathId: string): Quest | undefined {
  return QUEST_DATA[`path_${pathId}`];
}
