/**
 * Single source of truth for projects.
 * - `image` is generated once by `scripts/generate-project-images.ts` from
 *   `imagePrompt` (the shared style prefix lives in that script). Until the
 *   file exists the tile renders an ink + accent gradient.
 * - The first four `featured` projects get the large tiles and a case-study route.
 */

export type Project = {
  slug: string;
  name: string;
  description: string;
  tags: string[];
  repoUrl: string;
  image: string;
  imagePrompt: string;
  accent: "orange" | "tiffany";
  featured: boolean;
  /** Projects Gallery floor (1 fintech & trading … 5 play & math), see PROJECT_FLOORS */
  floor: 1 | 2 | 3 | 4 | 5;
};

/** the gallery's floors, by theme */
export const PROJECT_FLOORS = [
  { floor: 1, theme: "Fintech & trading" },
  { floor: 2, theme: "Systems & embedded" },
  { floor: 3, theme: "ML & AI" },
  { floor: 4, theme: "Full-stack & apps" },
  { floor: 5, theme: "Play & math" },
] as const;

const gh = (repo: string) => `https://github.com/eshaan2418/${repo}`;
const img = (slug: string) => `/projects/${slug}.webp`;

export const projects: Project[] = [
  {
    slug: "financesimple",
    name: "FinanceSimple",
    description:
      "Full-stack fintech platform for tracking net worth, spending, debts, investments, crypto, real estate, and sandbox paper trading, with secure authentication, Row Level Security, financial analytics, report generation, and a polished dashboard.",
    tags: ["React", "Spring Boot", "Gemini", "PostgreSQL"],
    // TODO(confirm): no public repo named FinanceSimple on github.com/eshaan2418 yet.
    repoUrl: gh("FinanceSimple"),
    image: img("financesimple"),
    imagePrompt:
      "a floating glass-and-brass dashboard orb with luminous orange and tiffany ribbons of light flowing through it like growing coins and charts, abstract, no readable numbers",
    accent: "orange",
    featured: true,
    floor: 1,
  },
  {
    slug: "distdata",
    name: "DistData",
    description:
      "Fault-tolerant distributed database with consensus and transaction logic.",
    tags: ["C++"],
    repoUrl: gh("DIstData"), // repo name on GitHub uses a capital I
    image: img("distdata"),
    imagePrompt:
      "a constellation of glossy tiffany-blue spheres connected by thin orange threads, one sphere pulsing as the leader, suspended in dark space like a distributed network",
    accent: "tiffany",
    featured: true,
    floor: 2,
  },
  {
    slug: "eshaanos",
    name: "EshaanOS",
    description:
      "Educational operating system simulator exploring scheduling and memory management.",
    tags: ["C++"],
    repoUrl: gh("EshaanOS"),
    image: img("eshaanos"),
    imagePrompt:
      "a macro shot of an elegant retro circuit board and stacked memory blocks arranged like a tiny city, orange traces glowing on dark substrate",
    accent: "tiffany",
    featured: true,
    floor: 2,
  },
  {
    slug: "jobber",
    name: "Jobber",
    description: "Microservices job portal built with Spring Boot and React.",
    tags: ["TypeScript", "Java"],
    repoUrl: gh("Jobber"),
    image: img("jobber"),
    imagePrompt:
      "a row of small interlocking cream and tiffany modular boxes tied with orange ribbon, hinting at microservices as gift boxes",
    accent: "orange",
    featured: true,
    floor: 4,
  },
  {
    slug: "edge-ai-model-compression",
    name: "Edge AI Model Compression & Deployment",
    description: "Optimized deep learning models for efficient edge inference.",
    tags: ["Python"],
    repoUrl: gh("Edge-AI-Model-Compression-Deployment"),
    image: img("edge-ai-model-compression"),
    imagePrompt:
      "a large crystalline neural-network sculpture being compressed into a small glowing chip in an orange hand-sculpted vise, tiffany light",
    accent: "tiffany",
    featured: false,
    floor: 3,
  },
  {
    slug: "fitmind-ai",
    name: "FitMind-AI",
    description: "AI-powered fitness platform built using microservices architecture.",
    tags: ["JavaScript"],
    repoUrl: gh("FitMind-AI"),
    image: img("fitmind-ai"),
    imagePrompt:
      "an abstract glossy brain made of flowing orange and tiffany ribbon, merged with a dumbbell silhouette",
    accent: "orange",
    featured: false,
    floor: 3,
  },
  {
    slug: "morphunet",
    name: "MorphUNet",
    description: "PyTorch implementation of U-Net architectures for image segmentation.",
    tags: ["Python"],
    repoUrl: gh("MorphUNet"),
    image: img("morphunet"),
    imagePrompt:
      "a U-shaped sculpture of layered translucent glass slices, an image dissolving into segmented orange and tiffany regions",
    accent: "tiffany",
    featured: false,
    floor: 3,
  },
  {
    slug: "shopsmart-ai",
    name: "ShopSmart-AI",
    description: "Machine learning recommender system for e-commerce.",
    tags: ["Jupyter Notebook"],
    repoUrl: gh("ShopSmart-AI"),
    image: img("shopsmart-ai"),
    imagePrompt:
      "a minimal shopping bag floating above a swirl of product silhouettes sorted by glowing orange arcs",
    accent: "orange",
    featured: false,
    floor: 3,
  },
  {
    slug: "stockpredictor",
    name: "StockPredictor",
    description: "Experimental ML-based stock price prediction system.",
    tags: ["Python"],
    repoUrl: gh("StockPredictor"),
    image: img("stockpredictor"),
    imagePrompt:
      "a sculptural candlestick-chart landscape in glossy 3D, tiffany bars rising, an orange dotted forecast line fading into fog",
    accent: "tiffany",
    featured: false,
    floor: 1,
  },
  {
    slug: "mandelbrotexplorer",
    name: "MandelbrotExplorer",
    description: "MATLAB visualization of the Mandelbrot set.",
    tags: ["MATLAB"],
    repoUrl: gh("MandelbrotExplorer"),
    image: img("mandelbrotexplorer"),
    imagePrompt:
      "a macro of the Mandelbrot set rendered as polished enamel in orange and tiffany gradients on black",
    accent: "orange",
    featured: false,
    floor: 5,
  },
  {
    slug: "tetrisplay",
    name: "TetrisPlay",
    description: "Classic Tetris game in C++.",
    tags: ["C++"],
    repoUrl: gh("TetrisPlay"),
    image: img("tetrisplay"),
    imagePrompt:
      "stacked glossy tetromino blocks in orange, tiffany, and cream, falling into place against a dark grid",
    accent: "tiffany",
    featured: false,
    floor: 5,
  },
  {
    slug: "plantwateringsystem",
    name: "PlantWateringSystem",
    description: "Automated embedded system for plant irrigation.",
    tags: ["Java"],
    repoUrl: gh("PlantWateringSystem"),
    image: img("plantwateringsystem"),
    imagePrompt:
      "a small elegant potted plant with a sleek tiffany sensor and a single orange water droplet suspended mid-fall",
    accent: "orange",
    featured: false,
    floor: 2,
  },
  {
    slug: "book-store",
    name: "Book-Store",
    description: "Full-stack MERN application for managing book inventory.",
    tags: ["JavaScript"],
    repoUrl: gh("Book-Store"),
    image: img("book-store"),
    imagePrompt:
      "a stack of cloth-bound books with orange and tiffany spines, one open with soft light pouring out",
    accent: "tiffany",
    featured: false,
    floor: 4,
  },
  {
    slug: "cabieeee",
    name: "Cabieeee",
    description: "Real-time cab-ordering mobile application.",
    tags: ["JavaScript"],
    repoUrl: gh("Cabieeee"),
    image: img("cabieeee"),
    imagePrompt:
      "a minimal glossy toy-like taxi on a dark glowing road map with an orange route line and tiffany pin",
    accent: "orange",
    featured: false,
    floor: 4,
  },
  {
    slug: "gideon-ai-desktop-assistant",
    name: "Gideon-AI-Desktop-Assistant",
    description: "Voice-controlled desktop AI assistant.",
    tags: ["Python"],
    repoUrl: gh("Gideon-AI-Desktop-Assistant"),
    image: img("gideon-ai-desktop-assistant"),
    imagePrompt:
      "a floating glowing sound-wave orb above a sleek desk lamp-like device, orange waveform ring, tiffany core",
    accent: "tiffany",
    featured: false,
    floor: 3,
  },
  {
    slug: "webrtc-video-rooms",
    name: "WebRTC-Video-Rooms",
    description: "Real-time video chat with screen sharing using WebRTC.",
    tags: ["JavaScript"],
    repoUrl: gh("WebRTC-Video-Rooms"),
    image: img("webrtc-video-rooms"),
    imagePrompt:
      "several floating rounded-rectangle glass panes arranged in a grid, connected by thin orange lines, tiffany reflections",
    accent: "orange",
    featured: false,
    floor: 4,
  },
  {
    slug: "algorithmic-trading-bot",
    name: "algorithmic-trading-bot",
    description: "Algorithmic trading experiments.",
    tags: ["Python"],
    repoUrl: gh("algorithmic-trading-bot-"), // repo name on GitHub has a trailing dash
    image: img("algorithmic-trading-bot"),
    imagePrompt:
      "a small chrome clockwork robot hand placing a coin onto glowing chart lines, orange and tiffany accents",
    accent: "tiffany",
    featured: false,
    floor: 1,
  },
];

/** order within a floor: featured first, then as listed */
export const projectsOnFloor = (floor: number) =>
  projects.filter((p) => p.floor === floor).sort((a, b) => Number(b.featured) - Number(a.featured));

export const featuredProjects = projects.filter((p) => p.featured);
export const otherProjects = projects.filter((p) => !p.featured);
/** Featured projects with a placeholder case-study route at /projects/<slug>. */
export const caseStudySlugs = featuredProjects.map((p) => p.slug);
