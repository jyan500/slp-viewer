// Vendored from Slippi Lab (MIT, see THIRD_PARTY_NOTICES.md)
// https://github.com/frankborden/slippilab/blob/ba4e09172344d1e7957de2d8a6eebab31632d92f/src/common/ids.ts

export const itemNamesById = [
    // Basic Items
    "Capsule", // 0x00
    "Box", // 0x01
    "Barrel (Taru)", // 0x02
    "Egg", // 0x03
    "Party Ball (Kusudama)", // 0x04
    "Barrel Cannon (TaruCann)", // 0x05
    "Bob-omb (BombHei)", // 0x06
    "Mr. Saturn (Dosei)", // 0x07
    "Heart Container", // 0x08
    "Maxim Tomato", // 0x09
    "Starman (Super Star)", // 0x0A
    "Home-Run Bat", // 0x0B
    "Beam Sword", // 0x0C
    "Parasol", // 0x0D
    "Green Shell (G Shell)", // 0x0E
    "Red Shell (R Shell)", // 0x0F
    "Ray Gun (L Gun)", // 0x10
    "Freezie (Freeze)", // 0x11
    "Food", // 0x12
    "Proximity Mine (MSBomb)", // 0x13
    "Flipper", // 0x14
    "Super Scope (S Scope)", // 0x15
    "Star Rod", // 0x16
    "Lip's Stick", // 0x17
    "Fan (Harisen)", // 0x18
    "Fire Flower (F Flower)", // 0x19
    "Super Mushroom (Kinoko)", // 0x1A
    "", // 0x1B
    "", // 0x1C
    "Warp Star (WStar)", // 0x1D
    "Screw Attack (ScBall)", // 0x1E
    "Bunny Hood (RabbitC)", // 0x1F
    "Metal Box (MetalB)", // 0x20
    "Cloaking Device (SpyCloak)", // 0x21
    "Poké Ball (M Ball)", // 0x22

    // Item Related
    "Ray Gun recoil effect", // 0x23
    "Star Rod Star", // 0x24
    "Lips Stick Dust", // 0x25
    "Super Scope Beam", // 0x26
    "Ray Gun Beam", // 0x27
    "Hammer Head", // 0x28
    "Flower", // 0x29
    "Yoshi's egg (Event)", // 0x2A

    // Monsters Part 1
    "Goomba (DKuriboh)", // 0x2B
    "Redead (Leadead)", // 0x2C
    "Octarok (Octarock)", // 0x2D
    "Ottosea", // 0x2E
    "Stone(Octarok Projectile)", // 0x2F

    // Character Related
    "Mario's fire", // 0x30
    "", // 0x31
    "Kirby's Cutter beam", // 0x32
    "Kirby's Hammer", // 0x33
    "", // 0x34
    "", // 0x35
    "Fox's Laser", // 0x36
    "Falco's Laser", // 0x37
    "Fox's shadow", // 0x38
    "Falco's shadow", // 0x39
    "Link's bomb", // 0x3A
    "Young Link's bomb", // 0x3B
    "Link's boomerang", // 0x3C
    "Young Link's boomerang", // 0x3D
    "Link's Hookshot", // 0x3E
    "Young Link's Hookshot", // 0x3F
    "Arrow", // 0x40
    "Fire Arrow", // 0x41
    "PK Fire", // 0x42
    "PK Flash", // 0x43
    "PK Flash", // 0x44
    "PK Thunder (Primary)", // 0x45
    "PK Thunder", // 0x46
    "PK Thunder", // 0x47
    "PK Thunder", // 0x48
    "PK Thunder", // 0x49
    "Fox's Blaster", // 0x4A
    "Falco's Blaster", // 0x4B
    "Link's Arrow", // 0x4C
    "Young Link's arrow", // 0x4D
    "PK Flash (explosion)", // 0x4E
    "Needle(thrown)", // 0x4F
    "Needle", // 0x50
    "Pikachu's Thunder", // 0x51
    "Pichu's Thunder", // 0x52
    "Mario's cape", // 0x53
    "Dr.Mario's cape", // 0x54
    "Smoke (Sheik)", // 0x55
    "Yoshi's egg(thrown)", // 0x56
    "Yoshi's Tongue??", // 0x57
    "Yoshi's Star", // 0x58
    "Pikachu's thunder (B)", // 0x59
    "Pikachu's thunder (B)", // 0x5A
    "Pichu's thunder (B)", // 0x5B
    "Pichu's thunder (B)", // 0x5C
    "Samus's bomb", // 0x5D
    "Samus's chargeshot", // 0x5E
    "Missile", // 0x5F
    "Grapple beam", // 0x60
    "Sheik's chain", // 0x61
    "", // 0x62
    "Turnip", // 0x63
    "Bowser's flame", // 0x64
    "Ness's bat", // 0x65
    "Yoyo", // 0x66
    "Peach's parasol", // 0x67
    "Toad", // 0x68
    "Luigi's fire", // 0x69
    "Ice(Iceclimbers)", // 0x6A
    "Blizzard", // 0x6B
    "Zelda's fire", // 0x6C
    "Zelda's fire (explosion)", // 0x6D
    "", // 0x6E
    "Toad's spore", // 0x6F
    "Mewtwo's Shadowball", // 0x70
    "Iceclimbers' UpB", // 0x71
    "Pesticide", // 0x72
    "Manhole", // 0x73
    "Fire(G&W)", // 0x74
    "Parashute", // 0x75
    "Turtle", // 0x76
    "Sperky", // 0x77
    "Judge", // 0x78
    "", // 0x79
    "Sausage", // 0x7A
    "Milk (Young Link)", // 0x7B
    "Firefighter(G&W)", // 0x7C
    "Masterhand's Laser", // 0x7D
    "Masterhand's Bullet", // 0x7E
    "Crazyhand's Laser", // 0x7F
    "Crazyhand's Bullet", // 0x80
    "Crazyhand's Bomb", // 0x81
    "Kirby copy Mario's Fire (B)", // 0x82
    "Kirby copy Dr. Mario's Capsule (B)", // 0x83
    "Kirby copy Luigi's Fire (B)", // 0x84
    "Kirby copy IceClimber's IceCube (B)", // 0x85
    "Kirby copy Peach's Toad (B)", // 0x86
    "Kirby copy Toad's Spore (B)", // 0x87
    "Kirby copy Fox's Laser (B)", // 0x88
    "Kirby copy Falco's Laser (B)", // 0x89
    "Kirby copy Fox's Blaster (B)", // 0x8A
    "Kirby copy Falco's Blaster (B)", // 0x8B
    "Kirby copy Link's Arrow (B)", // 0x8C
    "Kirby copy Young Link's Arrow (B)", // 0x8D
    "Kirby copy Link's Arrow (B)", // 0x8E
    "Kirby copy Young Link's Arrow (B)", // 0x8F
    "Kirby copy Mewtwo's Shadowball (B)", // 0x90
    "Kirby copy PK Flash (B)", // 0x91
    "Kirby copy PK Flash Explosion (B)", // 0x92
    "Kirby copy Pikachu's Thunder (B)", // 0x93
    "Kirby copy Pikachu's Thunder (B)", // 0x94
    "Kirby copy Pichu's Thunder (B)", // 0x95
    "Kirby copy Pichu's Thunder (B)", // 0x96
    "Kirby copy Samus' Chargeshot (B)", // 0x97
    "Kirby copy Sheik's Needle (thrown) (B)", // 0x98
    "Kirby copy Sheik's Needle (ground) (B)", // 0x99
    "Kirby copy Bowser's Flame (B)", // 0x9A
    "Kirby copy Mr. Game & Watch's Sausage (B)", // 0x9B
    "(unique)", // 0x9C
    "Yoshi's Tongue?? (B)", // 0x9D
    "(unique)", // 0x9E
    "Coin", // 0x9F

    // Pokemon
    "Random Pokemon", // 0xA0
    "Goldeen (Tosakinto)", // 0xA1
    "Chicorita", // 0xA2
    "Snorlax", // 0xA3
    "Blastoise", // 0xA4
    "Weezing (Matadogas)", // 0xA5
    "Charizard (Lizardon)", // 0xA6
    "Moltres", // 0xA7
    "Zapdos", // 0xA8
    "Articuno", // 0xA9
    "Wobbuffet", // 0xAA
    "Scizor", // 0xAB
    "Unown", // 0xAC
    "Entei", // 0xAD
    "Raikou", // 0xAE
    "Suicune", // 0xAF
    "Bellossom (Kireihana)", // 0xB0
    "Electrode (Marumine)", // 0xB1
    "Lugia", // 0xB2
    "Ho-oh", // 0xB3
    "Ditto (Metamon)", // 0xB4
    "Clefairy", // 0xB5
    "Togepi", // 0xB6
    "Mew", // 0xB7
    "Celebi", // 0xB8
    "Staryu (Hitodeman)", // 0xB9
    "Chansey", // 0xBA
    "Porygon2", // 0xBB
    "Cyndaquil (Hinoarashi)", // 0xBC
    "Marill", // 0xBD
    "Venusaur (Fushigibana)", // 0xBE

    // Pokemon Related
    "Chicorita's Leaf", // 0xBF
    "Blastoise's Water", // 0xC0
    "Weezing's Gas", // 0xC1
    "Weezing's Gas", // 0xC2
    "Charizard's Breath", // 0xC3
    "Charizard's Breath", // 0xC4
    "Charizard's Breath", // 0xC5
    "Charizard's Breath", // 0xC6
    "Mini-Unowns", // 0xC7
    "Lugia's Aeroblast", // 0xC8
    "Lugia's Aeroblast", // 0xC9
    "Lugia's Aeroblast", // 0xCA
    "Ho-Oh's Flame", // 0xCB
    "Staryu's Star", // 0xCC
    "Healing Egg", // 0xCD
    "Cyndaquil's Fire", // 0xCE
    "", // 0xCF

    // Monsters Part 2
    "Old Goomba (Old-Kuri)", // 0xD0
    "Target (Mato)", // 0xD1
    "Shyguy (Heiho)", // 0xD2
    "Koopa(Green) (Nokonoko)", // 0xD3
    "Koopa(Red) (PataPata)", // 0xD4
    "Likelile", // 0xD5
    "Old Redead (old-lead) [invalid]", // 0xD6
    "Old Octorok(old-octa) [invalid]", // 0xD7
    "Old Ottosea (old-otto)", // 0xD8
    "White Bear (whitebea)", // 0xD9
    "Klap", // 0xDA
    "Green Shell (zgshell)", // 0xDB
    "Red Shell (green act) (zrshell)", // 0xDC

    // Stage Specific
    "Tingle (on balloon)", // 0xDD
    "[Invalid]", // 0xDE
    "[Invalid]", // 0xDF
    "[Invalid]", // 0xE0
    "Apple", // 0xE1
    "Healing Apple", // 0xE2
    "[Invalid]", // 0xE3
    "[Invalid]", // 0xE4
    "[Invalid]", // 0xE5
    "Tool (Flatzone)", // 0xE6
    "[Invalid]", // 0xE7
    "[Invalid]", // 0xE8
    "Birdo", // 0xE9
    "Arwing Laser", // 0xEA
    "Great Fox's Laser", // 0xEB
    "Birdo's Egg", // 0xEC
] as const;
export type ItemName = typeof itemNamesById[number];
