/**
 * InVision Knowledge Base & Word Repository (kenniswoorden.js)
 * Bevat uitgebreide trefwoorden, categorisatiematrices, stopwoorden,
 * kleine-talk patronen, technische termen en ingebouwde kennis.
 * Ontwikkeld door Mattyou Studios™.
 */

const KENNISWOORDEN = {
  // Uitgebreide lijst met Nederlandse en Engelse stopwoorden
  stopwords: new Set([
    'de', 'het', 'een', 'en', 'of', 'van', 'voor', 'met', 'op', 'in', 'is', 'zijn', 'was', 'waren', 
    'wat', 'wie', 'hoe', 'waarom', 'welke', 'welk', 'naar', 'over', 'bij', 'als', 'dat', 'dit', 'die', 
    'deze', 'er', 'niet', 'ook', 'maar', 'om', 'te', 'door', 'uit', 'tot', 'aan', 'zo', 'me', 'mijn',
    'jouw', 'je', 'hij', 'zij', 'we', 'wij', 'jullie', 'ze', 'hun', 'hen', 'iets', 'niets', 'alles',
    'kan', 'kunnen', 'zal', 'zullen', 'moet', 'moeten', 'mag', 'mogen', 'wil', 'willen',
    'the', 'a', 'an', 'and', 'or', 'are', 'were', 'what', 'who', 'how', 'why', 'of', 'for', 'with', 
    'on', 'in', 'is', 'it', 'to', 'from', 'at', 'by', 'this', 'that', 'these', 'those', 'be', 'been'
  ]),

  // Technische sleutelwoorden voor Microsoft Learn & Developer routering
  techKeywords: [
    'azure', 'microsoft', 'windows', 'powershell', '.net', 'c#', 'c++', 'typescript', 'javascript', 
    'python', 'sql', 'mysql', 'postgresql', 'mongodb', 'api', 'rest', 'graphql', 'docker', 'kubernetes', 
    'visual studio', 'vscode', 'github', 'git', 'office 365', 'excel', 'sharepoint', 'teams', 'dotnet', 
    'asp.net', 'blazor', 'react', 'vue', 'angular', 'node.js', 'express', 'css', 'html', 'tailwind', 
    'bootstrap', 'linux', 'ubuntu', 'bash', 'ssh', 'devops', 'ci/cd', 'cloud', 'aws', 'gcp', 'server', 
    'database', 'orm', 'entity framework', 'prisma', 'json', 'yaml', 'xml', 'http', 'https', 'dns'
  ],

  // Rekenmachine woordmappings voor taalkundige wiskundevragen
  mathMappings: {
    'plus': '+',
    'optellen': '+',
    'erbij': '+',
    'min': '-',
    'aftrekken': '-',
    'eraf': '-',
    'keer': '*',
    'maal': '*',
    'vermenigvuldig': '*',
    'gedeeld door': '/',
    'delen door': '/',
    'procent': '%',
    'kwadraat': '^2',
    'tot de macht': '^',
    'wortel van': 'sqrt',
    'vierkantswortel': 'sqrt',
    'pi': 'pi',
    'euler': 'e'
  },

  // Kleine-talk patronen en antwoorden
  smalltalk: [
    {
      intent: 'greetings',
      patterns: ['hoi', 'hallo', 'hey', 'hi', 'goedemorgen', 'goeiemorgen', 'goedemiddag', 'goeiemiddag', 'goedenavond', 'goeienavond', 'yo', 'hola', 'joe', 'hey daar'],
      responses: [
        "Hoi {name}! Waar kan ik je vandaag mee helpen? Ik bereken sommen exact of zoek live het internet af voor je.",
        "Hey! Stel gerust je vraag — hoe specifieker, hoe beter ik 'm kan beantwoorden.",
        "Hallo daar 👋 Waar ben je nieuwsgierig naar? Gooi maar een onderwerp, een som of een begrip in het veld."
      ]
    },
    {
      intent: 'how_are_you',
      patterns: ['hoe gaat het', 'hoe is het', 'alles goed', 'hoe gaat ie', 'hoe voel je je', 'hoe vaart ge'],
      responses: [
        "Met mij gaat het uitstekend! Ik hoef niet te slapen of koffie te drinken 😄 Waar kan ik jou mee helpen?",
        "Goed, dank je! Ik sta helemaal klaar om informatie op te zoeken of een berekening uit te voeren."
      ]
    },
    {
      intent: 'identity',
      patterns: ['wie ben je', 'wie ben jij', 'wat ben je', 'wat voor bot ben je', 'ben je een ai', 'ben je chatgpt', 'ben je claude'],
      responses: [
        "Ik ben **InVision** — gebouwd door **Mattyou Studios™**. Ik draai op pure logica en live API-bronnen zonder traditioneel AI-taalmodel: ik reken sommen exact zelf uit via Math.js en doorzoek Wikipedia, DuckDuckGo en Microsoft Learn in real-time."
      ]
    },
    {
      intent: 'capabilities',
      patterns: ['wat kan je', 'wat kun je', 'wat doe je', 'help', 'hoe werk je', 'mogelijkheden'],
      responses: [
        "Ik help je op drie manieren:\n1️⃣ **Exacte Rekenmachine**: Sommen, machten, wortels en procenten direct uitrekenen.\n2️⃣ **Live Kenniszoeker**: Samenvoegen van Wikipedia, DuckDuckGo en Microsoft Learn tot één helder antwoord.\n3️⃣ **Snelkoppelingen**: Direct doorklikken naar Google, Bing of brondocumentatie."
      ]
    },
    {
      intent: 'creator',
      patterns: ['wie heeft je gemaakt', 'wie is je maker', 'wie maakt jou', 'mattyou studios', 'ontwikkelaar'],
      responses: [
        "Ik ben ontwikkeld door **Mattyou Studios™**! Een ontwikkelaar die bouwt aan innovatieve tools, webapplicaties en slimme zoeksystemen."
      ]
    },
    {
      intent: 'gratitude',
      patterns: ['dankje', 'dank je', 'dank u', 'bedankt', 'thanks', 'thx', 'top', 'nice', 'mooi zo', 'geweldig', 'super'],
      responses: [
        "Graag gedaan! Als je nog meer wilt weten of doorrekenen, vraag het gerust.",
        "Geen dank! Blij dat ik kon helpen. Heb je nog een andere vraag?"
      ]
    },
    {
      intent: 'farewell',
      patterns: ['doei', 'dag', 'tot ziens', 'bye', 'cya', 'later', 'fijne dag'],
      responses: [
        "Tot de volgende keer! 👋",
        "Doei! Kom gerust weer terug als je informatie of een berekening nodig hebt."
      ]
    }
  ],

  // Lokale kenniswoordenbank voor snelle definities & verrijking
  dictionary: {
    "kernfusie": {
      summary: "Kernfusie is het proces waarbij de kernen van lichte atomen (zoals waterstof) samensmelten tot zwaardere kernen (zoals helium), waarbij een reusachtige hoeveelheid energie vrijkomt. Dit is de energiebron van de zon en sterren.",
      category: "Natuurkunde"
    },
    "zwarte gat": {
      summary: "Een zwart gat is een gebied in de ruimte waar de zwaartekracht zo enorm sterk is dat niets, zelfs licht niet, eruit kan ontsnappen. Het ontstaat vaak na het instorten van een zware ster.",
      category: "Astronomie"
    },
    "quantum computing": {
      summary: "Quantum computing is een technologie die gebruikmaakt van de principes van de kwantummechanica (zoals superpositie en verstrengeling) om ingewikkelde berekeningen veel sneller uit te voeren dan klassieke supercomputers.",
      category: "Informatica"
    },
    "fotosynthese": {
      summary: "Fotosynthese is het biologische proces waarin planten, algen en sommige bacteriën zonlicht, water en koolstofdioxide (CO2) omzetten in glucose en zuurstof.",
      category: "Biologie"
    },
    "blockchain": {
      summary: "Een blockchain is een gedecentraliseerd, digitaal grootboek waarin transacties op een veilige, transparante en onveranderlijke manier worden vastgelegd over een netwerk van computers.",
      category: "Technologie"
    },
    "algoritme": {
      summary: "Een algoritme is een stapsgewijze procedure of een reeks instructies voor het oplossen van een specifiek probleem of het uitvoeren van een taak.",
      category: "Informatica"
    }
  },

  // Hulpfuncties voor verwerking
  extractTerms: function(text) {
    if (!text) return [];
    return text.toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3 && !this.stopwords.has(w));
  },

  isTechnical: function(term) {
    const lower = term.toLowerCase();
    return this.techKeywords.some(keyword => lower.includes(keyword));
  },

  matchSmalltalk: function(query, userName) {
    const q = query.trim().toLowerCase().replace(/[!?.]+$/, '');
    for (const group of this.smalltalk) {
      if (group.patterns.some(p => q === p || q.startsWith(p + ' ') || q.endsWith(' ' + p))) {
        const rawResponse = group.responses[Math.floor(Math.random() * group.responses.length)];
        return rawResponse.replace('{name}', userName ? userName : '');
      }
    }
    return null;
  }
};

// Exporteer naar window voor browsergebruik
if (typeof window !== 'undefined') {
  window.KENNISWOORDEN = KENNISWOORDEN;
}
