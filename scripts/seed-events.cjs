require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const events = [
  {
    title: "Unstop Igniters Club Orientation 2025",
    description: "Welcome to the Unstop Igniters Club! Join us for our orientation to learn about our goals, upcoming events, and how you can be a part of our growing community.",
    short_description: "Orientation session for new members.",
    event_date: "2025-10-15T10:00:00Z",
    venue: "Main Auditorium",
    is_online: false,
    max_participants: 500,
    is_published: true,
  },
  {
    title: "Hackathon Skills and Strategies Workshop",
    description: "Learn how to brainstorm, build, and pitch your ideas effectively in a 24-hour hackathon environment. We will cover team building, tech stacks, and presentation skills.",
    short_description: "Master the art of winning hackathons.",
    event_date: "2025-11-10T14:00:00Z",
    venue: "Lab 3",
    is_online: false,
    max_participants: 100,
    is_published: true,
  },
  {
    title: "What Do Companies Expect From Students",
    description: "An interactive seminar with industry leaders discussing the skills and mindset required to thrive in modern tech and business roles.",
    short_description: "Industry insights and expectations.",
    event_date: "2025-12-05T16:00:00Z",
    venue: "Online",
    is_online: true,
    meeting_link: "https://unstop.com/events/example",
    max_participants: 300,
    is_published: true,
  },
  {
    title: "Build Unstop 2k26",
    description: "Our flagship annual buildathon. Form teams, solve real-world problems, and win exciting prizes while getting noticed by top recruiters.",
    short_description: "The ultimate 48-hour buildathon.",
    event_date: "2026-04-20T09:00:00Z",
    venue: "Campus Ground",
    is_online: false,
    max_participants: 1200,
    is_published: true,
  },
  {
    title: "Solve the Case Unstop",
    description: "A business case study competition designed to test your analytical and problem-solving skills. Analyze, strategize, and present your solutions to a panel of experts.",
    short_description: "Business case study challenge.",
    event_date: "2026-02-15T10:00:00Z",
    venue: "Seminar Hall",
    is_online: false,
    max_participants: 200,
    is_published: true,
  }
];

async function seed() {
  console.log("Seeding events...");

  // Get categories first
  const { data: categories } = await supabase.from('event_categories').select('*');
  
  const getCategoryId = (name) => {
    if (!categories) return null;
    const cat = categories.find(c => c.name.toLowerCase().includes(name.toLowerCase()));
    return cat ? cat.id : null;
  };

  const enrichedEvents = events.map(event => {
    let category_id = null;
    if (event.title.includes("Orientation")) category_id = getCategoryId("Networking") || getCategoryId("Workshop");
    else if (event.title.includes("Workshop") || event.title.includes("Expect")) category_id = getCategoryId("Workshop");
    else category_id = getCategoryId("Hackathon");

    return {
      ...event,
      category_id,
    };
  });

  const { data, error } = await supabase.from('events').insert(enrichedEvents);

  if (error) {
    console.error("Error inserting events:", error);
  } else {
    console.log("Events successfully seeded!");
  }
}

seed();
