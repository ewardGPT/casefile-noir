export const StoryData = {
    metadata: {
        title: "Captive Horror: Murder Mystery",
        author: "Jaylen Kweme",
        setting: "London, 1912",
        protagonist: "Detective Edwin Clarke"
    },
    characters: {
        "Edwin Clarke": { role: "Player", description: "Top detective, paralyzed, right eye injured in childhood tragedy." },
        "Arthur Kosminski": { role: "Assistant", description: "Childhood friend, Inspector, secret antagonist.", voicePitch: 0.9 },
        "Lillian Harrow": { role: "Victim", description: "16yo student, murdered. Pink dress, shaved hair." },
        "Reginald Whitcombe": { role: "Suspect", description: "Headmaster. Nervous. Connected to drug/info trade.", voicePitch: 1.1 },
        "Tobias Finch": { role: "Suspect", description: "Teacher. Had private sessions with victim to improve grades.", voicePitch: 1.0 },
        "Evelyn Moreland": { role: "Suspect", description: "Student. Victim's former best friend.", voicePitch: 1.3 },
        "Samuel Atwell": { role: "Suspect", description: "Student. Rejected by victim. Obsessed.", voicePitch: 1.4 },
        "Aaron Kosminski": { role: "Killer", description: "Arthur's older brother. Pseudodead. Lives in woods." },
        "Old Willy": { role: "NPC", description: "Homeless man. Witness to the woods abduction.", voicePitch: 0.7 },
        "Shard": { role: "NPC", description: "Drug dealer leader. Password protected.", voicePitch: 0.6 }
    },
    locations: {
        "Office": { description: "Your detective office. Determine your next move here." },
        "School": { description: "Harrowford High. The scene of the crime." },
        "Pennyworth Lane": { description: "Street near school. Shops and homeless witnesses." },
        "Risky Passage": { description: "Back alley. Drug trade hub." },
        "Harrow Residence": { description: "Home of the victim's family." },
        "The Woods": { description: "Forbidden area. The Killer's lair." }
    },
    evidence: {
        "Whitcombe's List": { id: "list_001", description: "List of students and teachers close to the victim." },
        "Victim Profile": { id: "profile_001", description: "Lillian Harrow. 16. Details of death." },
        "Old Willy's Jacket": { id: "item_jacket", description: "A smelly jacket, but the hood conceals your identity." },
        "Love Note": { id: "note_love", description: "Incriminating note from Lillian to Arthur." }
    },
    dialogueTree: {
        "Tobias Finch": {
            default: "I swear, Detective. I only gave her a bit of a boost.",
            topics: {
                "grades": "She begged me for help. I stayed late - tutoring only.",
                "lie": "I would never lie to you both. But there are some things I simply cannot say."
            }
        },
        "Old Willy": {
            default: "THE WOODS! THEY TOOK HER INTO THE WOODS!",
            topics: {
                "accuse_arthur": "IT WAS YOU! WITH THAT GIRL! YOU CAN'T RUN FOREVER!"
            }
        },
        "Shard": {
            passwordRequired: true,
            challenge: "Diamond", // "The one thing on earth that shatters not"
            default: "Who goes there?",
            success: "I assume you've come to question me about your assistant, Detective Clarke."
        }
    }
};
