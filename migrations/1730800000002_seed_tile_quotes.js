/**
 * Seed 50 default tile quotes. Idempotent: insert only if no rows exist.
 */
exports.shorthands = undefined;

const QUOTES = [
  [0, "You are braver than you believe, stronger than you seem, and smarter than you think.", "A.A. Milne"],
  [1, "Believe you can and you're halfway there.", "Theodore Roosevelt"],
  [2, "Every accomplishment starts with the decision to try.", "Unknown"],
  [3, "You are never too old to set another goal or to dream a new dream.", "C.S. Lewis"],
  [4, "The only way to do great work is to love what you do.", "Steve Jobs"],
  [5, "Don't let what you cannot do interfere with what you can do.", "John Wooden"],
  [6, "Success is the sum of small efforts repeated day in and day out.", "Robert Collier"],
  [7, "It's okay to not know, but it's not okay to not try.", "Unknown"],
  [8, "You have brains in your head. You have feet in your shoes. You can steer yourself any direction you choose.", "Dr. Seuss"],
  [9, "The future belongs to those who believe in the beauty of their dreams.", "Eleanor Roosevelt"],
  [10, "Mistakes are proof that you are trying.", "Unknown"],
  [11, "You are capable of amazing things.", "Unknown"],
  [12, "Be yourself; everyone else is already taken.", "Oscar Wilde"],
  [13, "The only person you should try to be better than is the person you were yesterday.", "Unknown"],
  [14, "Dream big and dare to fail.", "Norman Vaughan"],
  [15, "You miss 100% of the shots you don't take.", "Wayne Gretzky"],
  [16, "Be the change you wish to see in the world.", "Mahatma Gandhi"],
  [17, "In a world where you can be anything, be kind.", "Unknown"],
  [18, "Your limitation—it's only your imagination.", "Unknown"],
  [19, "Great things never come from comfort zones.", "Unknown"],
  [20, "Dream it. Wish it. Do it.", "Unknown"],
  [21, "Success doesn't come from what you do occasionally. It comes from what you do consistently.", "Unknown"],
  [22, "Don't wait for opportunity. Create it.", "Unknown"],
  [23, "The expert in anything was once a beginner.", "Helen Hayes"],
  [24, "You don't have to be perfect to be amazing.", "Unknown"],
  [25, "Your attitude determines your direction.", "Unknown"],
  [26, "The only bad workout is the one that didn't happen.", "Unknown"],
  [27, "Progress, not perfection.", "Unknown"],
  [28, "You are stronger than you think.", "Unknown"],
  [29, "Today is your opportunity to build the tomorrow you want.", "Ken Poirot"],
  [30, "When you know better, you do better.", "Maya Angelou"],
  [31, "It always seems impossible until it's done.", "Nelson Mandela"],
  [32, "You are enough just as you are.", "Unknown"],
  [33, "Every expert was once a beginner. Every pro was once an amateur.", "Unknown"],
  [34, "The way to get started is to quit talking and begin doing.", "Walt Disney"],
  [35, "Don't let yesterday take up too much of today.", "Will Rogers"],
  [36, "You learn more from failure than from success.", "Unknown"],
  [37, "If you want to lift yourself up, lift up someone else.", "Booker T. Washington"],
  [38, "The only way to have a friend is to be one.", "Ralph Waldo Emerson"],
  [39, "Be curious, not judgmental.", "Walt Whitman"],
  [40, "You can't use up creativity. The more you use, the more you have.", "Maya Angelou"],
  [41, "Think big thoughts but relish small pleasures.", "H. Jackson Brown Jr."],
  [42, "It's not about being the best. It's about being better than you were yesterday.", "Unknown"],
  [43, "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", "Dr. Seuss"],
  [44, "You have to be odd to be number one.", "Dr. Seuss"],
  [45, "Today you are you, that is truer than true. There is no one alive who is youer than you.", "Dr. Seuss"],
  [46, "Why fit in when you were born to stand out?", "Dr. Seuss"],
  [47, "A person's a person, no matter how small.", "Dr. Seuss"],
  [48, "The more you give away, the happier you become.", "Unknown"],
  [49, "You are today where your thoughts have brought you. You will be tomorrow where your thoughts take you.", "James Allen"],
];

exports.up = (pgm) => {
  for (const [quote_index, quote_text, author] of QUOTES) {
    const escapedText = quote_text.replace(/'/g, "''");
    const escapedAuthor = (author || '').replace(/'/g, "''");
    pgm.sql(
      `INSERT INTO tile_quotes (quote_index, quote_text, author) VALUES (${quote_index}, '${escapedText}', '${escapedAuthor}')
       ON CONFLICT (quote_index) DO NOTHING`
    );
  }
};

exports.down = (pgm) => {
  pgm.sql("DELETE FROM tile_quotes WHERE quote_index >= 0 AND quote_index <= 49");
};
