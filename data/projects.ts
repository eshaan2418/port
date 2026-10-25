/**
 * Single source of truth for projects (the list view, the 3D Projects
 * Gallery, the agent view and its .md / .json / llms.txt all read this).
 * - Array order is the display order everywhere (fixed, never shuffled).
 * - The `featured` four get the larger cards / frames and a case-study route.
 * - `image`: only shown if a real file exists at /public/projects/<slug>.webp;
 *   otherwise nothing is rendered (no placeholder). `imagePrompt` is kept for
 *   scripts/generate-project-images.ts, which no view depends on.
 */

export type Project = {
  slug: string;
  name: string;
  description: string;
  tags: string[];
  repoUrl: string;
  image: string;
  imagePrompt?: string;
  accent: "orange" | "tiffany";
  featured: boolean;
};

const gh = (repo: string) => `https://github.com/eshaan2418/${repo}`;
const img = (slug: string) => `/projects/${slug}.webp`;

export const projects: Project[] = [
  // newest five first (descriptions exactly as given; tags: the given language, else GitHub's main language)
  {
    slug: "recall",
    name: "Recall",
    description: "On-device episodic visual memory for egocentric video: learned trigger, compact event memory, calibrated answers.",
    tags: ["Python"],
    repoUrl: gh("Recall"),
    image: img("recall"),
    accent: "tiffany",
    featured: false,
  },
  {
    slug: "aegisfabric",
    name: "AegisFabric",
    description:
      "Network-aware, secure, multimodal training: joint placement/routing/checkpoint control on an emulated 3-site WAN (research artifact).",
    tags: ["Python"],
    repoUrl: gh("AegisFabric"),
    image: img("aegisfabric"),
    accent: "orange",
    featured: false,
  },
  {
    slug: "qshield-x",
    name: "qshield-x",
    description:
      "Formally verified, FPGA-targeted union-find decoder for the surface code: RTL, C++ golden model, Wasm runtime, V8 patch, and a measured hardware-vs-software answer.",
    tags: ["Python"],
    repoUrl: gh("qshield-x"),
    image: img("qshield-x"),
    accent: "tiffany",
    featured: false,
  },
  {
    slug: "kubeml",
    name: "KubeML",
    description: "Kubernetes-native orchestration for observable, recoverable ML workloads.",
    tags: ["Python"],
    repoUrl: gh("KubeML"),
    image: img("kubeml"),
    accent: "orange",
    featured: false,
  },
  {
    slug: "agentflow",
    name: "agentflow",
    description: "AI agent workflows with durable DAG scheduling, Python workers, Kafka, PostgreSQL, FastAPI, Prometheus, and Grafana.",
    tags: ["Go"],
    repoUrl: gh("agentflow"),
    image: img("agentflow"),
    accent: "tiffany",
    featured: false,
  },
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
  },
];

export const featuredProjects = projects.filter((p) => p.featured);
export const otherProjects = projects.filter((p) => !p.featured);
/** Featured projects with a placeholder case-study route at /projects/<slug>. */
export const caseStudySlugs = featuredProjects.map((p) => p.slug);
