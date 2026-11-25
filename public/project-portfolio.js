const pages = (first,last) => Array.from({length:last-first+1},(_,i) => `design-page-${String(first+i).padStart(2,'0')}.webp`);
const camsScreen = name => `cams-website-${name}.jpg`;
const depthScreen = name => `depth-current-${name}.jpg`;
const kaoruScreen = name => `kaoru-${name}.jpg`;
export const projectWorks = [
  {
    slug: 'cams-website',
    accentColor: '#bd432b',
    category: 'CAMS',
    title: 'CAMS Website',
    medium: 'Website Design · Columbia Art Market Society',
    hero: camsScreen('home'),
    screenSize: [2200, 1422],
    previews: ['about', 'events-1'].map(camsScreen),
    documentation: [
      'about', 'events-1', 'events-2', 'executive-board-1', 'executive-board-2',
      'junior-board-1', 'junior-board-2', 'junior-board-3', 'junior-board-4',
      'newsletter', 'contact'
    ].map(camsScreen),
    description: [
      'A website design for the Columbia Art Market Society that brings its events, members, and newsletter together in one place.',
      'The homepage sets orange figures against oversized black lettering. The interior pages give the society’s programming and people a clear structure, from event listings and board profiles to newsletter and contact pages.'
    ]
  },
  {slug:'cams', accentColor:'#d44732', category:'CAMS', title:'Into the NYC Art World (Prototype)', medium:'CAMS Website Design', hero:'figma-exports-1333-185.png', previews:pages(5,6), documentation:pages(4,6), description:['A website prototype for CAMS (Columbia’s Art Marketing Society), designed as an interactive guide to New York City’s cultural ecosystem.','The prototype features an experimental, pixel-driven visual identity paired with clean, editorial layouts for content-heavy pages.'], links:[['Hero-section animation demo','https://youtu.be/PaVvbv_AHrs']]},
  {
    slug: 'depth',
    accentColor: '#176457',
    category: 'Depth',
    title: 'Depth',
    medium: '3D Hero Design Studio · Figma Plugin',
    hero: depthScreen('14-complete'),
    heroAlt: 'Depth studio with a generated 3D model, web publishing, PNG and GLB export, and Figma handoff',
    screenSize: [1280, 720],
    previews: ['03-photo-input', '10-motion'].map(depthScreen),
    documentation: [
      ['01-connect', 'Connect to the studio', 'The Meshy connection is managed by Depth’s server, so designers can begin without pasting an API key.'],
      ['02-prompt', 'Describe a shape', 'Text prompts, style hints, and technical constraints guide the shape-generation workflow.'],
      ['03-photo-input', 'Start from an image', 'Quick Generate accepts a photo or sketch and includes sample inputs.'],
      ['15-shape-processing', 'Follow shape generation', 'The processing screen keeps generation progress and credit usage visible.'],
      ['16-shape-ready', 'Open the generated shape', 'A completion screen leads into the interactive shape review.'],
      ['04-shape', 'Review the generated shape', 'Inspect the clay model in a live 3D viewer before continuing.'],
      ['05-fine-tune', 'Refine the form', 'Keep the previous prompt visible while adjusting the next generation.'],
      ['06-appearance', 'Describe the surface', 'Give the model a look with a texture prompt or continue to manual material controls.'],
      ['07-materials', 'Tune materials and colour', 'Compare Original, Metallic, Transparent, and Rough Matte finishes.'],
      ['17-render-processing', 'Follow texture generation', 'The texturing step reports progress while the model’s surface is prepared.'],
      ['18-render-ready', 'Open the textured model', 'Review the completed look before moving into scene design.'],
      ['08-render', 'Review the finished model', 'Preview the textured model before building the hero composition.'],
      ['09-templates', 'Choose a composition', 'Preview Studio Glow, Quiet Space, and Soft Studio with the generated model.'],
      ['10-motion', 'Give the object motion', 'Adjust movement, speed, direction, and intensity in the hero preview.'],
      ['11-scene', 'Set the scene', 'Explore camera behaviour, lighting, and background treatment.'],
      ['12-layout', 'Design the layout', 'Position the copy and model, edit typography, and choose desktop or mobile frames.'],
      ['13-confirm', 'Review the hero', 'Check the composition and settings before the final export and publishing screen.'],
      ['14-complete', 'Export, publish, and hand off', 'Download PNG and GLB files, publish an embeddable live hero, or send its layout to Figma.']
    ].map(([name, label, caption]) => ({ file: depthScreen(name), label, caption })),
    description: [
      'Depth is a working studio and Figma plugin for designing interactive 3D hero sections. It brings model generation, scene composition, motion, responsive layout, and handoff into one workflow.',
      'A Firebase backend connects text and image prompts to Meshy, generates shapes and textured looks, and stores the finished models. Designers can refine materials, cameras, lighting, and typography, then export PNG and GLB files, publish a live scene for the web, or place editable frames in Figma.'
    ],
    links: [['Open Depth studio · sign-in required', 'https://depth-plugin-demo-20261006.web.app/connect']]
  },
  {
    slug: 'kaoru',
    accentColor: '#716457',
    category: 'Kaoru',
    title: 'Kaoru',
    medium: 'Sensory Diary · Interactive Web App · Work in progress',
    hero: kaoruScreen('01-entries'),
    heroAlt: 'Kaoru sensory diary with journal, poem, and collage entries surrounded by interactive sensory objects',
    screenSize: [1280, 720],
    previews: ['05-senses', '06-smell-collection'].map(kaoruScreen),
    documentation: [
      ['01-entries', 'Keep what lingers', 'A personal diary brings journal pages, poems, and visual collages into one space.'],
      ['05-senses', 'Browse through the senses', 'Interactive objects connect Sight, Hearing, Touch, Smell, and Taste with saved memories.'],
      ['06-smell-collection', 'Follow a familiar scent', 'Smell collections bring memories together through cues such as orange peel and wet pavement.'],
      ['07-sense-ready', 'Carry a sense forward', 'A sensory cue can become the starting point for another diary page.'],
      ['08-create-new', 'Choose a way to begin', 'Start with a journal, poem, collage, or sensory memory.'],
      ['09-journal-input', 'Write or import a memory', 'Begin a journal directly or bring in an existing document.'],
      ['10-write-journal', 'Give the memory a page', 'A paper-like editor brings writing together with a date, weather, and feeling.'],
      ['11-poem-revision', 'Iterate on a poem', 'The poem revision prototype lets you refresh imagery, choose which lines to revise, adjust the rhythm, preserve a phrase, and undo the last revision.']
    ].map(([name, label, caption]) => ({ file: kaoruScreen(name), label, caption })),
    description: [
      'Kaoru is a sensory diary for the things that stay with you. It turns everyday memories into journal pages, poems, and visual collages, then lets you find them again through scent and the other senses. I’m currently refining its design and interactions.',
      'Sideways navigation connects Entries, Senses, and Create New. Paper-like pages, sensory objects, search, and bookmarks make memories feel like a personal collection, while writing and collage tools turn a line, an image, or a familiar scent into a new page.'
    ]
  },
  {slug:'aether', accentColor:'#26728e', category:'Aether %', title:'Aether %', year:'2023', medium:'UIUX Design / Conceptual / Experimental Design', hero:'figma-1423-111-img72Facaa0Ef91.png', previews:['design-page-12.webp','design-page-13.webp'], documentation:pages(8,13), description:['“Aether%” is a UI Project that sheds light on the connection and differences between the concepts of arts and design.','The project is a conceptual exploration of how arts and design are customizable and rather ambiguous, overlapping terms through the design of a personalized shopping app. The project starts from the inspiration of Chindogu, a grey concept that stands between arts and design.']},
  {slug:'extrusion', accentColor:'#79634a', category:'Extrusion', title:'Extrusion', medium:'Community Design / Arduino / Spatial Experimental Design', hero:'design-extrusion.webp', previews:['design-page-26.webp','design-page-27.webp'], documentation:pages(22,27), description:['An individual project raising awareness of Hong Kong’s subdivided housing, known as Tang Wuh, through spatial and experimental design.','Research, interviews, site inspection and material testing inform an installation combining Arduino and TouchDesigner projections. The work translates the pressures of confined living into a spatial experience.']},
  {slug:'yuan-fei-dian', accentColor:'#6ba70c', category:'Yuan Fei Dian', title:'Yuan Fei Dian 元沸点', medium:'AI Cloud Platform UI Design', hero:'design-yuan-fei-dian.webp', previews:['design-page-16.webp','design-page-20.webp'], documentation:pages(15,20), description:['Interactive UI prototypes for 99Cloud’s AI cloud platform program in partnership with NVIDIA.','Designed with Figma and Spline 3D, the platform supports enterprise AI applications, deep learning, big data and cloud gaming.']},
  {slug:'design-hour', accentColor:'#087e58', category:'Graphic Works', title:'Design Hour Event Poster', medium:'Poster Design / Design@Columbia', hero:'design-poster-529.webp', previews:['design-poster-529.webp','design-page-02.webp'], documentation:['design-poster-529.webp'], portrait:true, description:['An event poster for Design@Columbia’s weekly Design Hour, a space to work on projects, meet the design team and learn new tools.']},
  {slug:'palet', accentColor:'#bd2928', category:'Graphic Works', title:'Palet App Branding Poster', medium:'Branding / Poster Design / Design@Columbia', hero:'design-poster-521.webp', previews:['design-poster-521.webp','design-page-02.webp'], documentation:['design-poster-521.webp'], portrait:true, description:['A branding poster for Palet, a camera app project at Design@Columbia. The poster invites designers to help shape filters, improve branding, gather feedback and build features.']},
  {slug:'demo-night', accentColor:'#005747', category:'Graphic Works', title:'Design Demo Night Poster', medium:'Poster Design / Design@Columbia', hero:'design-poster-525.webp', previews:['design-poster-525.webp','design-page-02.webp'], documentation:['design-poster-525.webp'], portrait:true, description:['An event poster for Design@Columbia’s Design Demo Night, inviting students to explore professional UI/UX design and learn how to become a designer.']},
  {slug:'poem-collection', accentColor:'#8a795b', category:'Graphic Works', title:'Ziyou_’s Poem Collection', medium:'Editorial Book Design / Adobe Illustrator', hero:'design-poem-collection.webp', previews:pages(28,29), documentation:pages(28,29), portrait:true, description:['An editorial collection of poetry, photography and short prose.','A consistent typographic system and page grid connect the writing and images across the book’s spreads.'], links:[['Read the full collection','#/writing']]},
  {
    slug: 'wabi-sabi',
    accentColor: '#674e96',
    category: 'Case Studies',
    title: 'Wabi-Sabi in Japanese UI Design',
    medium: 'IB Extended Essay · Design Research · 2025',
    hero: 'wabi-sabi-yahoo-comparison.webp',
    heroAlt: 'Original Yahoo! Japan homepage alongside my final redesign prototype',
    screenSize: [1480, 516],
    detailImage: { file: 'wabi-sabi-yahoo-final.webp', alt: 'Final Yahoo! Japan redesign prototype', size: [898, 511] },
    essay: 'wabi-sabi-extended-essay.pdf',
    documentation: [
      { file: 'wabi-sabi-yahoo-wireframe.webp', label: 'Early wireframe', caption: 'I used wider gaps and clearer labels to organize the page. In expert review, removing familiar icons made some sections harder to navigate.' },
      { file: 'wabi-sabi-yahoo-final.webp', label: 'Final Figma prototype', caption: 'I kept the icons, lightened the category labels, and reduced the weather section to two columns.' }
    ],
    description: [
      'For my IB Extended Essay, I explored how the Japanese aesthetic of wabi-sabi could shape the experience of using a website.',
      'I prototyped new homepages for Yahoo! Japan, Kakaku, and Rakuten, then used expert feedback and user testing to refine the Yahoo! Japan design. In my tests, people responded well to simplicity and negative space, while irregular layouts could make information harder to find.'
    ]
  },
  {
    slug: 'qilin-life',
    accentColor: '#234583',
    category: 'Case Studies',
    title: 'Qilin Life',
    medium: 'Student Life Platform · 2023–2024 · Concluded',
    hero: 'qilin-life-student-dashboard.png',
    heroAlt: 'Qilin Life student dashboard with a society directory and recommendations',
    screenSize: [1418, 933],
    previewScreens: [
      { file: 'qilin-life-student-dashboard.png', label: 'Student dashboard' },
      { file: 'qilin-life-society-profile.png', label: 'Society profile' }
    ],
    documentation: [
      {
        label: 'Why we built Qilin Life',
        paragraphs: [
          'At our secondary school, students looked through Google Sites, Forms, email, and word of mouth to find societies, service initiatives, and CAS opportunities. Society leaders recruited through separate channels, and teachers had to piece together records across spreadsheets.',
          'We compared the tools already in use with LinkedIn and Moodle. LinkedIn offered a model for discovering opportunities, and Moodle was familiar for coursework. Neither was designed around how students found clubs, how leaders recruited, or how teachers oversaw activities. We set out to put discovery, applications, and oversight in one place.'
        ]
      },
      {
        file: 'qilin-life-account-flow.png',
        alt: 'Planning diagram for switching between student and society accounts',
        label: 'Three roles, three sets of tasks',
        paragraphs: [
          'In April and May 2023, we mapped the tasks for students, society leaders, and teachers. We used those maps to decide what to build first and what could wait for later versions.',
          'Students could browse societies and get recommendations based on their grade, availability, and interests. Society leaders could edit listings and review applications. Teachers could oversee societies and export records to a spreadsheet.'
        ]
      },
      {
        file: 'qilin-life-figma-flows.png',
        alt: 'Figma flows for signing in, browsing societies, editing profiles, and managing applications',
        label: 'Prototyping and testing',
        paragraphs: [
          'We built the first interface in Figma. We put account switching and key actions near the upper left so students could quickly tell whether they were browsing as a student or managing a society. The teacher view made its oversight role clear and gave teachers direct access to records.',
          'We tested the design in person with 15 students and through an online survey with 27 students across grades 6–12. We also sought feedback from UX professionals and teachers. We used that input to narrow the first release to the most important workflows and connected the revised screens in an interactive prototype.'
        ]
      },
      {
        file: 'qilin-life-architecture.png',
        alt: 'Architecture diagram connecting the Vue interface, Flask backend, PostgreSQL database, and Redis cache',
        label: 'From prototype to a working platform',
        paragraphs: [
          'We started with HTML and CSS exported from Figma, then moved the front end to Vue as more pages needed to show data from the API. We built the backend in Flask and used PostgreSQL for student and society records.',
          'Recommendations were slow in the first prototype. We added a Redis cache so returning students could load their recommendations without recalculating them each time. We also worked with school IT to let students sign in with their school Microsoft account and hosted the platform on a school server.'
        ]
      },
      {
        file: 'qilin-life-launch-grades.png',
        alt: 'Soft launch participation by grade, highest in grade 11 and lowest in grade 12',
        label: 'What the January 2024 soft launch showed',
        paragraphs: [
          'We started with existing societies, their leaders, and a group of secondary students. The team recorded about 150 first-day visitors and more than 120 applications across 31 societies in the first week. The project report says that 90% of surveyed students rated the experience very satisfactory.',
          'Grade 11 had the most participants. STEM drew the most student interest, and the team saw interest in service even though relatively few societies offered it. The launch gave us a clearer picture of which students and activities the directory was serving.'
        ]
      },
      {
        label: 'What we changed and learned',
        paragraphs: [
          'After launch, we fixed scrolling and layout issues, addressed missing icons, and added meeting venues to society pages after a leader asked for them.',
          'One student could not tell whether a profile edit had saved. That showed us where the interface needed a clear confirmation that the edit had saved. The team also documented plans for a wider rollout. Qilin Life has since concluded.'
        ]
      }
    ],
    description: [
      'Qilin Life brought scattered club listings and application forms into one school platform so students could discover, compare, and apply to societies.',
      'I worked with Harry Wang and Edwin Fang on a platform with separate views for students, society leaders, and teachers. We used Figma prototypes and student feedback to decide which features belonged in the first release.',
      'In the week after our January 2024 soft launch, students submitted over 120 applications across 31 societies.'
    ]
  }
];
