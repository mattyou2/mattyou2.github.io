// ============================================================================
// MATTYOU CRAFT - MASSIVE RECIPES DATABASE (recipes.js)
// ============================================================================

const RECIPES = [
    // --- BASIS MATERIALEN ---
    {
        name: "Houten Planken",
        result: 6, resultCount: 4,
        ingredients: { 4: 1 }, // 1x Hout Stam
        pattern2x2: [4, null, null, null],
        pattern3x3: [4, null, null, null, null, null, null, null, null],
        is3x3: false, description: "Gemaakt van boomstammen."
    },
    {
        name: "Stokken",
        result: 8, resultCount: 4,
        ingredients: { 6: 2 }, // 2x Planken
        pattern2x2: [6, null, 6, null],
        pattern3x3: [null, 6, null, null, 6, null, null, null, null],
        is3x3: false, description: "Houten stokken voor gereedschap."
    },
    {
        name: "Crafting Table",
        result: 7, resultCount: 1,
        ingredients: { 6: 4 }, // 4x Planken
        pattern2x2: [6, 6, 6, 6],
        pattern3x3: [6, 6, null, 6, 6, null, null, null, null],
        is3x3: false, description: "Laat je geavanceerde 3x3 recepten maken."
    },

    // --- HOUTEN GEREEDSCHAP (3x3) ---
    {
        name: "Houten Pickaxe",
        result: 9, resultCount: 1,
        ingredients: { 6: 3, 8: 2 },
        pattern3x3: [6, 6, 6, null, 8, null, null, 8, null],
        is3x3: true, description: "Hakt steen en ertsen."
    },
    {
        name: "Houten Zwaard",
        result: 11, resultCount: 1,
        ingredients: { 6: 2, 8: 1 },
        pattern3x3: [null, 6, null, null, 6, null, null, 8, null],
        is3x3: true, description: "Doet extra schade tegen monsters."
    },
    {
        name: "Houten Bijl (Axe)",
        result: 13, resultCount: 1,
        ingredients: { 6: 3, 8: 2 },
        pattern3x3: [6, 6, null, 6, 8, null, null, 8, null],
        is3x3: true, description: "Hakt hout sneller om."
    },
    {
        name: "Houten Schep (Shovel)",
        result: 15, resultCount: 1,
        ingredients: { 6: 1, 8: 2 },
        pattern3x3: [null, 6, null, null, 8, null, null, 8, null],
        is3x3: true, description: "Graaft aarde en gras snel weg."
    },

    // --- STEEN GEREEDSCHAP (3x3) ---
    {
        name: "Steen Pickaxe",
        result: 10, resultCount: 1,
        ingredients: { 41: 3, 8: 2 }, // Cobblestone
        pattern3x3: [41, 41, 41, null, 8, null, null, 8, null],
        is3x3: true, description: "Hakt ijzererts en steen snel."
    },
    {
        name: "Steen Zwaard",
        result: 12, resultCount: 1,
        ingredients: { 41: 2, 8: 1 },
        pattern3x3: [null, 41, null, null, 41, null, null, 8, null],
        is3x3: true, description: "Een stevig stenen zwaard."
    },
    {
        name: "Steen Bijl",
        result: 14, resultCount: 1,
        ingredients: { 41: 3, 8: 2 },
        pattern3x3: [41, 41, null, 41, 8, null, null, 8, null],
        is3x3: true, description: "Hakt bomen met gemak."
    },
    {
        name: "Steen Schep",
        result: 16, resultCount: 1,
        ingredients: { 41: 1, 8: 2 },
        pattern3x3: [null, 41, null, null, 8, null, null, 8, null],
        is3x3: true, description: "Graaft zeer snel."
    },

    // --- IJZER GEREEDSCHAP (3x3) ---
    {
        name: "IJzeren Pickaxe",
        result: 48, resultCount: 1,
        ingredients: { 25: 3, 8: 2 }, // IJzer Ingot
        pattern3x3: [25, 25, 25, null, 8, null, null, 8, null],
        is3x3: true, description: "Kan goud en diamant minen!"
    },
    {
        name: "IJzeren Zwaard",
        result: 51, resultCount: 1,
        ingredients: { 25: 2, 8: 1 },
        pattern3x3: [null, 25, null, null, 25, null, null, 8, null],
        is3x3: true, description: "Zeer sterk zwaard."
    },

    // --- DIAMANT GEREEDSCHAP (3x3) ---
    {
        name: "Diamanten Pickaxe",
        result: 50, resultCount: 1,
        ingredients: { 27: 3, 8: 2 }, // Diamant
        pattern3x3: [27, 27, 27, null, 8, null, null, 8, null],
        is3x3: true, description: "Het allersterkste gereedschap!"
    },
    {
        name: "Diamanten Zwaard",
        result: 53, resultCount: 1,
        ingredients: { 27: 2, 8: 1 },
        pattern3x3: [null, 27, null, null, 27, null, null, 8, null],
        is3x3: true, description: "Doodt monsters in een paar klappen."
    },

    // --- IJZEREN ARMOR (3x3) ---
    {
        name: "IJzeren Helm",
        result: 60, resultCount: 1,
        ingredients: { 25: 5 },
        pattern3x3: [25, 25, 25, 25, null, 25, null, null, null],
        is3x3: true, description: "Beschermt je hoofd."
    },
    {
        name: "IJzeren Borstplaat",
        result: 63, resultCount: 1,
        ingredients: { 25: 8 },
        pattern3x3: [25, null, 25, 25, 25, 25, 25, 25, 25],
        is3x3: true, description: "Geeft veel defensieve punten."
    },
    {
        name: "IJzeren Broek",
        result: 66, resultCount: 1,
        ingredients: { 25: 7 },
        pattern3x3: [25, 25, 25, 25, null, 25, 25, null, 25],
        is3x3: true, description: "IJzeren beenbescherming."
    },
    {
        name: "IJzeren Laarzen",
        result: 69, resultCount: 1,
        ingredients: { 25: 4 },
        pattern3x3: [25, null, 25, 25, null, 25, null, null, null],
        is3x3: true, description: "Beschermt je voeten."
    },

    // --- DIAMANTEN ARMOR (3x3) ---
    {
        name: "Diamanten Helm",
        result: 62, resultCount: 1,
        ingredients: { 27: 5 },
        pattern3x3: [27, 27, 27, 27, null, 27, null, null, null],
        is3x3: true, description: "Ultieme hoofdbescherming."
    },
    {
        name: "Diamanten Borstplaat",
        result: 65, resultCount: 1,
        ingredients: { 27: 8 },
        pattern3x3: [27, null, 27, 27, 27, 27, 27, 27, 27],
        is3x3: true, description: "De beste armor in de game."
    },

    // --- ETEN & UTILITEIT ---
    {
        name: "Brood",
        result: 74, resultCount: 1,
        ingredients: { 73: 3 }, // 3x Tarwe (Wheat)
        pattern3x3: [null, null, null, 73, 73, 73, null, null, null],
        is3x3: true, description: "Lekker vers gebakken brood."
    },
    {
        name: "Gouden Appel",
        result: 76, resultCount: 1,
        ingredients: { 75: 1, 26: 8 }, // 1x Appel, 8x Goud Ingot
        pattern3x3: [26, 26, 26, 26, 75, 26, 26, 26, 26],
        is3x3: true, description: "Geeft je tijdelijk superkrachten!"
    },
    {
        name: "Fakkels (4x)",
        result: 77, resultCount: 4,
        ingredients: { 24: 1, 8: 1 }, // Coal + Stick
        pattern2x2: [24, null, 8, null],
        pattern3x3: [null, 24, null, null, 8, null, null, null, null],
        is3x3: false, description: "Verlicht de diepe, donkere grotten."
    }
];
