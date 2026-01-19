/**
 * Quest Registry
 * Stores quest states, tutorial flags, and dialogue injection rules
 * 
 * Structure:
 * - questId: Unique quest identifier
 * - state: 'inactive' | 'active' | 'completed'
 * - tutorialShown: Flag for tutorial prompts
 * - buttonPrompt: Dynamic button mapping for quest actions
 * - objectives: List of objectives with dialogue injection rules
 */

export const QUEST_REGISTRY = {
  // Day 1: Initial Investigation
  'day_1_investigation': {
    questId: 'day_1_investigation',
    state: 'active',
    tutorialShown: false,
    buttonPrompt: {
      primary: '[A]',
      fallback: '[SPACE]',
      pc: '[Z]',
      action: 'accept'
    },
    objectives: {
      'obj_interview_finch': {
        injectPrompt: true,
        promptText: 'Please deliver this parcel!',
        action: 'to investigate'
      },
      'obj_interview_whitcombe': {
        injectPrompt: true,
        promptText: 'I have an urgent matter to discuss.',
        action: 'for details'
      },
      'obj_interview_evie': {
        injectPrompt: true,
        promptText: 'I need to ask you about Lillian.',
        action: 'to inquire'
      },
      'talk_willy': {
        injectPrompt: true,
        promptText: 'Tell me what you saw that night!',
        action: 'to question'
      }
    }
  },

  // Day 2: Deep Investigation Paths
  'path_finch': {
    questId: 'path_finch',
    state: 'active',
    tutorialShown: false,
    buttonPrompt: {
      primary: '[A]',
      fallback: '[SPACE]',
      pc: '[Z]',
      action: 'to search'
    },
    objectives: {
      'finch_search_school': {
        injectPrompt: true,
        promptText: 'I need to find evidence of his relationship with Lillian.',
        action: 'to investigate'
      },
      'finch_find_letter': {
        injectPrompt: true,
        promptText: 'This letter could be crucial evidence!',
        action: 'to collect'
      },
      'finch_confront': {
        injectPrompt: true,
        promptText: 'I have proof of your secret meetings!',
        action: 'to confront'
      }
    }
  },

  'path_evie': {
    questId: 'path_evie',
    state: 'active',
    tutorialShown: false,
    buttonPrompt: {
      primary: '[A]',
      fallback: '[SPACE]',
      pc: '[Z]',
      action: 'to search'
    },
    objectives: {
      'evie_search_residence': {
        injectPrompt: true,
        promptText: 'The diary might reveal what happened between them.',
        action: 'to find'
      },
      'evie_find_diary': {
        injectPrompt: true,
        promptText: 'Lillian\'s diary could hold the truth!',
        action: 'to read'
      },
      'evie_confront': {
        injectPrompt: true,
        promptText: 'I know what really happened to Lillian!',
        action: 'to reveal'
      }
    }
  },

  'path_samuel': {
    questId: 'path_samuel',
    state: 'active',
    tutorialShown: false,
    buttonPrompt: {
      primary: '[A]',
      fallback: '[SPACE]',
      pc: '[Z]',
      action: 'to investigate'
    },
    objectives: {
      'samuel_search_risky': {
        injectPrompt: true,
        promptText: 'Something feels off about this passage.',
        action: 'to search'
      },
      'samuel_find_weapon': {
        injectPrompt: true,
        promptText: 'This item could be the murder weapon!',
        action: 'to collect'
      },
      'samuel_confront': {
        injectPrompt: true,
        promptText: 'Your obsession with Lillian led to this!',
        action: 'to accuse'
      }
    }
  },

  'path_whitcombe': {
    questId: 'path_whitcombe',
    state: 'active',
    tutorialShown: false,
    buttonPrompt: {
      primary: '[A]',
      fallback: '[SPACE]',
      pc: '[Z]',
      action: 'to investigate'
    },
    objectives: {
      'whitcombe_search_lions_den': {
        injectPrompt: true,
        promptText: 'The Lions Den might contain his secrets.',
        action: 'to search'
      },
      'whitcombe_find_ledger': {
        injectPrompt: true,
        promptText: 'The blackmail ledger! This proves his guilt!',
        action: 'to expose'
      },
      'whitcombe_confront': {
        injectPrompt: true,
        promptText: 'Your secret is out, Whitcombe!',
        action: 'to arrest'
      }
    }
  },

  // Final Accusation
  'final_accusation': {
    questId: 'final_accusation',
    state: 'active',
    tutorialShown: false,
    buttonPrompt: {
      primary: '[A]',
      fallback: '[SPACE]',
      pc: '[Z]',
      action: 'to accuse'
    },
    objectives: {
      'accuse_killer': {
        injectPrompt: true,
        promptText: 'I\'m ready to name the killer!',
        action: 'to solve'
      }
    }
  }
};

/**
 * Get button prompt based on platform/input mapping
 */
export function getActionButtonPrompt() {
  // Check for keyboard layout first
  const keyE = Phaser.Input.Keyboard.KeyCodes.E;
  const keyZ = Phaser.Input.Keyboard.KeyCodes.Z;
  const keySpace = Phaser.Input.Keyboard.KeyCodes.SPACE;
  const keyA = Phaser.Input.Keyboard.KeyCodes.A;

  // Return appropriate button prompt
  return '[A]';
}

/**
 * Quest Registry Helper Functions
 */

export function getQuestState(questId) {
  const quest = QUEST_REGISTRY[questId];
  return quest ? quest.state : null;
}

export function isQuestActive(questId) {
  return getQuestState(questId) === 'active';
}

export function hasTutorialShown(questId) {
  const quest = QUEST_REGISTRY[questId];
  return quest ? quest.tutorialShown : true;
}

export function setTutorialShown(questId, shown) {
  const quest = QUEST_REGISTRY[questId];
  if (quest) {
    quest.tutorialShown = shown;
  }
}

export function getQuestButtonPrompt(questId) {
  const quest = QUEST_REGISTRY[questId];
  return quest ? quest.buttonPrompt : null;
}

export function shouldInjectPrompt(questId, objectiveId) {
  const quest = QUEST_REGISTRY[questId];
  if (!quest || !quest.objectives) return false;
  
  const objective = quest.objectives[objectiveId];
  return objective ? objective.injectPrompt : false;
}

export function getInjectedDialogue(questId, objectiveId, baseDialogue) {
  const quest = QUEST_REGISTRY[questId];
  if (!quest || !quest.objectives) return null;
  
  const objective = quest.objectives[objectiveId];
  if (!objective || !objective.injectPrompt) return null;
  
  const buttonPrompt = quest.buttonPrompt;
  const promptText = objective.promptText;
  
  // Construct Pokémon-style dialogue
  return `${promptText} (Press ${buttonPrompt.primary} ${buttonPrompt.action}).`;
}

/**
 * Pathfinding Routes for Day 1 Investigation
 * Based on PATHFINDING_ANALYSIS.md - 3 optimal routes with milestone coordinates
 */
export const PATHFINDING_ROUTES = {
  /**
   * Route 1: THE SPEEDRUN
   * Strategic Intent: Complete Day 1 objectives in minimum time by prioritizing direct NPC paths.
   * Efficiency Score: 92/100
   * Estimated Time: 8-10 minutes
   */
  route_1_speedrun: {
    routeId: 'route_1_speedrun',
    name: 'The Speedrun',
    description: 'Complete Day 1 objectives in minimum time',
    efficiencyScore: 92,
    estimatedTime: '8-10 minutes',
    milestones: [
      {
        id: 'start',
        name: 'Police Station',
        coordinates: { x: 1100, y: 1100 },
        description: 'Starting point'
      },
      {
        id: 'school_zone',
        name: 'School Zone',
        coordinates: { x: 1600, y: 1600 }, // Center of 1400-1800 range
        description: 'Target: mr_finch, headmaster_whitcombe, evie_moreland',
        npcs: ['mr_finch', 'headmaster_whitcombe', 'evie_moreland']
      },
      {
        id: 'pennyworth_lane',
        name: 'Pennyworth Lane',
        coordinates: { x: 2200, y: 2200 }, // Center of 2000-2400 range
        description: 'Talk to Old Willy (quest-critical witness)',
        npcs: ['old_willy']
      },
      {
        id: 'return',
        name: 'Police Station Return',
        coordinates: { x: 1100, y: 1100 },
        description: 'Return to submit findings'
      }
    ],
    stops: 6, // NPCs + 1 return trip
    backtracking: false,
    riskAssessment: {
      schoolZone: {
        level: 'medium',
        hazard: 'School zone may have 8+ NPCs causing collision delays',
        mitigation: 'Sprint through crowds, use interaction zones'
      },
      routeMemory: {
        level: 'medium',
        hazard: 'Pennyworth Lane requires remembering Old Willy\'s location',
        mitigation: 'Mark location on minimap (press M)'
      },
      combat: {
        level: 'safe',
        hazard: 'No combat, only dialogue interactions',
        mitigation: 'Use E to interact, follow dialogue trees'
      }
    }
  },

  /**
   * Route 2: THE BALANCED
   * Strategic Intent: Systematic investigation with evidence collection, balancing speed and information gathering.
   * Efficiency Score: 78/100
   * Estimated Time: 15-18 minutes
   */
  route_2_balanced: {
    routeId: 'route_2_balanced',
    name: 'The Balanced',
    description: 'Systematic investigation with evidence collection',
    efficiencyScore: 78,
    estimatedTime: '15-18 minutes',
    milestones: [
      {
        id: 'start',
        name: 'Police Station',
        coordinates: { x: 1100, y: 1100 },
        description: 'Starting point'
      },
      {
        id: 'desk_evidence',
        name: 'Desk Evidence',
        coordinates: { x: 1152, y: 1120 },
        description: 'Collect evidence from desk (96x64)',
        interactable: 'desk_evidence'
      },
      {
        id: 'school_interviews',
        name: 'School Zone',
        coordinates: { x: 1600, y: 1600 }, // Center of 1400-1800 range
        description: 'Interview 3 key suspects',
        npcs: ['mr_finch', 'headmaster_whitcombe', 'evie_moreland']
      },
      {
        id: 'pennyworth_lane',
        name: 'Pennyworth Lane',
        coordinates: { x: 2200, y: 2200 }, // Center of 2000-2400 range
        description: 'Investigate witness, collect evidence from Mary Henshaw',
        npcs: ['old_willy', 'mary_henshaw']
      },
      {
        id: 'woods_edge',
        name: 'Woods Edge (Optional)',
        coordinates: { x: 1800, y: 2600 },
        description: 'Optional: glimpse Aaron Kosminski',
        npcs: ['aaron_kosminski'],
        optional: true
      },
      {
        id: 'return',
        name: 'Police Station Return',
        coordinates: { x: 1100, y: 1100 },
        description: 'Submit initial report'
      }
    ],
    stops: 6, // NPCs + 1 evidence + 1 optional
    backtracking: false,
    riskAssessment: {
      timeCost: {
        level: 'medium',
        hazard: 'Notebook documentation adds 2-3 minutes',
        mitigation: 'Use hotkey (N) for quick notes'
      },
      optionalObjective: {
        level: 'low',
        hazard: 'Woods edge may waste time if skipped',
        mitigation: 'Skip if pressed for time'
      },
      informationRich: {
        level: 'safe',
        hazard: 'Collects maximum evidence for Day 2 decisions',
        mitigation: 'Optimal for decision making'
      },
      narrativeFlow: {
        level: 'safe',
        hazard: 'Follows natural detective progression',
        mitigation: 'Better story immersion'
      }
    }
  },

  /**
   * Route 3: THE SAFE/RESOURCE-HEAVY
   * Strategic Intent: Maximize evidence collection, unlock dialogue options, and prepare for all Day 2 branching paths.
   * Efficiency Score: 55/100
   * Estimated Time: 25-35 minutes
   */
  route_3_safe: {
    routeId: 'route_3_safe',
    name: 'The Safe/Resource-Heavy',
    description: 'Maximize evidence collection and unlock all dialogue options',
    efficiencyScore: 55,
    estimatedTime: '25-35 minutes',
    milestones: [
      {
        id: 'start',
        name: 'Police Station',
        coordinates: { x: 1100, y: 1100 },
        description: 'Complete all 3 Edwin Clarke dialogues',
        npcs: ['edwin_clarke', 'arthur_kosminski', 'mr_ashcombe']
      },
      {
        id: 'desk_evidence',
        name: 'Desk Evidence',
        coordinates: { x: 1152, y: 1120 },
        description: 'Collect evidence from desk',
        interactable: 'desk_evidence'
      },
      {
        id: 'school_full',
        name: 'School (Full Investigation)',
        coordinates: { x: 1600, y: 1600 }, // Center of 1400-1800 range
        description: 'Full 8 NPC interviews + dialogue trees',
        npcs: ['mr_finch', 'headmaster_whitcombe', 'evie_moreland', 'samuel_atwell', 'lillian', 'finch', 'whitcombe'],
        statRequirements: {
          charisma: { min: 3, max: 4 },
          intimidation: { min: 2, max: 3 }
        }
      },
      {
        id: 'pennyworth_harrow',
        name: 'Pennyworth Lane + Harrow Residence',
        coordinates: { x: 2200, y: 2600 }, // Center of combined ranges
        description: '2+ witnesses, complete Willy\'s quest chain, optional: Harrow Residence for diary',
        npcs: ['old_willy', 'mary_henshaw', 'mr_cobb', 'mr_harrow', 'mrs_harrow', 'peter'],
        interactables: ['diary_clue']
      },
      {
        id: 'risky_lions',
        name: 'Risky Passage + Lions Den',
        coordinates: { x: 3000, y: 2200 }, // Center of combined ranges
        description: 'Investigate Samuel\'s connection, Lions Den reconnaissance',
        npcs: ['ada_merriweather', 'samuel_atwell'],
        interactables: ['whitcombe_blackmail_ledger']
      },
      {
        id: 'return',
        name: 'Police Station Return',
        coordinates: { x: 1100, y: 1100 },
        description: 'Prepare Day 2 accusation'
      }
    ],
    stops: 15, // 15+ NPCs, 4+ locations
    backtracking: false,
    riskAssessment: {
      timeCost: {
        level: 'medium',
        hazard: 'Highest time cost, but unlocks all dialogue branches',
        mitigation: 'Set aside dedicated play session'
      },
      dialogueRequirements: {
        level: 'medium',
        hazard: 'Some options need stats (charisma 3-4, intimidation 2-3)',
        mitigation: 'Plan stat allocation before replay'
      },
      statPreparation: {
        level: 'low',
        hazard: 'May need to replay for optimal dialogue choices',
        mitigation: 'Accept non-optimal paths on first run'
      },
      maxEvidence: {
        level: 'safe',
        hazard: 'Complete case file for final accusation',
        mitigation: 'Best chance of correct accusation'
      },
      branchCoverage: {
        level: 'safe',
        hazard: 'Prepares for all 4 Day 2 suspect paths',
        mitigation: 'No missed content'
      },
      achievementUnlocks: {
        level: 'safe',
        hazard: 'Full completion bonus',
        mitigation: '100% achievement progress'
      }
    }
  }
};

/**
 * Get route by ID
 * @param {string} routeId - Route identifier
 * @returns {Object|null} Route configuration
 */
export function getRoute(routeId) {
  return PATHFINDING_ROUTES[routeId] || null;
}

/**
 * Get all available routes
 * @returns {Object} All route configurations
 */
export function getAllRoutes() {
  return PATHFINDING_ROUTES;
}

/**
 * Get recommended route for playthrough type
 * @param {string} playthroughType - 'qa_testing' | 'speedrun' | 'completionist'
 * @returns {Object|null} Recommended route
 */
export function getRecommendedRoute(playthroughType) {
  const recommendations = {
    'qa_testing': 'route_2_balanced',
    'speedrun': 'route_1_speedrun',
    'completionist': 'route_3_safe'
  };
  
  const routeId = recommendations[playthroughType];
  return routeId ? PATHFINDING_ROUTES[routeId] : null;
}

export default QUEST_REGISTRY;
