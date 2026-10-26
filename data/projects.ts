/**
 * Single source of truth for projects (the list view, the 3D Projects
 * Gallery, the agent view and its .md / .json / llms.txt all read this).
 * - Array order is the display order everywhere (fixed, never shuffled).
 * - Every project is shown the same way (one tier, all equal).
 * - `image`: only shown if a real file exists at /public/projects/<slug>.webp;
 *   otherwise nothing is rendered (no placeholder). `imagePrompt` is kept for
 *   scripts/generate-project-images.ts, which no view depends on.
 */

export type Project = {
  slug: string;
  name: string;
  description: string;
  repoUrl: string;
  image: string;
  imagePrompt?: string;
  accent: "orange" | "tiffany";
  /** shown on the normal website (the 3D gallery and the agent files always list every project) */
  onWebsite?: boolean;
  /** the normal website's 2-line card text: a condensation of `description` using only its own words */
  shortDescription?: string;
};

const gh = (repo: string) => `https://github.com/eshaan2418/${repo}`;
const img = (slug: string) => `/projects/${slug}.webp`;

export const projects: Project[] = [
  // newest five first (descriptions exactly as given)
  {
    slug: "recall",
    onWebsite: true,
    shortDescription: "On-device episodic visual memory for egocentric video.",
    name: "Recall",
    description: "On-device episodic visual memory for egocentric video: learned trigger, compact event memory, calibrated answers.",
    repoUrl: gh("Recall"),
    image: img("recall"),
    accent: "tiffany",
  },
  {
    slug: "aegisfabric",
    onWebsite: true,
    shortDescription: "Network-aware, secure, multimodal training.",
    name: "AegisFabric",
    description:
      "Network-aware, secure, multimodal training: joint placement/routing/checkpoint control on an emulated 3-site WAN (research artifact).",
    repoUrl: gh("AegisFabric"),
    image: img("aegisfabric"),
    accent: "orange",
  },
  {
    slug: "qshield-x",
    onWebsite: true,
    shortDescription: "FPGA-targeted union-find decoder for the surface code.",
    name: "qshield-x",
    description:
      "Formally verified, FPGA-targeted union-find decoder for the surface code: RTL, C++ golden model, Wasm runtime, V8 patch, and a measured hardware-vs-software answer.",
    repoUrl: gh("qshield-x"),
    image: img("qshield-x"),
    accent: "tiffany",
  },
  {
    slug: "kubeml",
    onWebsite: true,
    shortDescription: "Kubernetes-native ML orchestration.",
    name: "KubeML",
    description: "Kubernetes-native orchestration for observable, recoverable ML workloads.",
    repoUrl: gh("KubeML"),
    image: img("kubeml"),
    accent: "orange",
  },
  {
    slug: "agentflow",
    onWebsite: true,
    shortDescription: "AI agent workflows with durable DAG scheduling.",
    name: "agentflow",
    description: "AI agent workflows with durable DAG scheduling, Python workers, Kafka, PostgreSQL, FastAPI, Prometheus, and Grafana.",
    repoUrl: gh("agentflow"),
    image: img("agentflow"),
    accent: "tiffany",
  },
  {
    slug: "financesimple",
    name: "FinanceSimple",
    description:
      "Full-stack fintech platform for tracking net worth, spending, debts, investments, crypto, real estate, and sandbox paper trading, with secure authentication, Row Level Security, financial analytics, report generation, and a polished dashboard.",
    // TODO(confirm): no public repo named FinanceSimple on github.com/eshaan2418 yet.
    repoUrl: gh("FinanceSimple"),
    image: img("financesimple"),
    imagePrompt:
      "a floating glass-and-brass dashboard orb with luminous orange and tiffany ribbons of light flowing through it like growing coins and charts, abstract, no readable numbers",
    accent: "orange",
  },
  {
    slug: "distdata",
    onWebsite: true,
    shortDescription: "Fault-tolerant distributed database with consensus.",
    name: "DistData",
    description:
      "Fault-tolerant distributed database with consensus and transaction logic.",
    repoUrl: gh("DIstData"), // repo name on GitHub uses a capital I
    image: img("distdata"),
    imagePrompt:
      "a constellation of glossy tiffany-blue spheres connected by thin orange threads, one sphere pulsing as the leader, suspended in dark space like a distributed network",
    accent: "tiffany",
  },
  {
    slug: "eshaanos",
    onWebsite: true,
    shortDescription: "Simulator exploring scheduling and memory.",
    name: "EshaanOS",
    description:
      "Educational operating system simulator exploring scheduling and memory management.",
    repoUrl: gh("EshaanOS"),
    image: img("eshaanos"),
    imagePrompt:
      "a macro shot of an elegant retro circuit board and stacked memory blocks arranged like a tiny city, orange traces glowing on dark substrate",
    accent: "tiffany",
  },
  {
    slug: "jobber",
    onWebsite: true,
    shortDescription: "Job portal built with Spring Boot and React.",
    name: "Jobber",
    description: "Microservices job portal built with Spring Boot and React.",
    repoUrl: gh("Jobber"),
    image: img("jobber"),
    imagePrompt:
      "a row of small interlocking cream and tiffany modular boxes tied with orange ribbon, hinting at microservices as gift boxes",
    accent: "orange",
  },
  {
    slug: "edge-ai-model-compression",
    onWebsite: true,
    shortDescription: "Optimized deep learning models for edge inference.",
    name: "Edge AI Model Compression & Deployment",
    description: "Optimized deep learning models for efficient edge inference.",
    repoUrl: gh("Edge-AI-Model-Compression-Deployment"),
    image: img("edge-ai-model-compression"),
    imagePrompt:
      "a large crystalline neural-network sculpture being compressed into a small glowing chip in an orange hand-sculpted vise, tiffany light",
    accent: "tiffany",
  },
  {
    slug: "fitmind-ai",
    onWebsite: true,
    shortDescription: "AI-powered fitness platform built using microservices.",
    name: "FitMind-AI",
    description: "AI-powered fitness platform built using microservices architecture.",
    repoUrl: gh("FitMind-AI"),
    image: img("fitmind-ai"),
    imagePrompt:
      "an abstract glossy brain made of flowing orange and tiffany ribbon, merged with a dumbbell silhouette",
    accent: "orange",
  },
  {
    slug: "morphunet",
    onWebsite: true,
    shortDescription: "PyTorch U-Net architectures for image segmentation.",
    name: "MorphUNet",
    description: "PyTorch implementation of U-Net architectures for image segmentation.",
    repoUrl: gh("MorphUNet"),
    image: img("morphunet"),
    imagePrompt:
      "a U-shaped sculpture of layered translucent glass slices, an image dissolving into segmented orange and tiffany regions",
    accent: "tiffany",
  },
  {
    slug: "shopsmart-ai",
    onWebsite: true,
    shortDescription: "Recommender system for e-commerce.",
    name: "ShopSmart-AI",
    description: "Machine learning recommender system for e-commerce.",
    repoUrl: gh("ShopSmart-AI"),
    image: img("shopsmart-ai"),
    imagePrompt:
      "a minimal shopping bag floating above a swirl of product silhouettes sorted by glowing orange arcs",
    accent: "orange",
  },
  {
    slug: "stockpredictor",
    onWebsite: true,
    shortDescription: "Experimental ML-based stock price prediction system.",
    name: "StockPredictor",
    description: "Experimental ML-based stock price prediction system.",
    repoUrl: gh("StockPredictor"),
    image: img("stockpredictor"),
    imagePrompt:
      "a sculptural candlestick-chart landscape in glossy 3D, tiffany bars rising, an orange dotted forecast line fading into fog",
    accent: "tiffany",
  },
  {
    slug: "mandelbrotexplorer",
    name: "MandelbrotExplorer",
    description: "MATLAB visualization of the Mandelbrot set.",
    repoUrl: gh("MandelbrotExplorer"),
    image: img("mandelbrotexplorer"),
    imagePrompt:
      "a macro of the Mandelbrot set rendered as polished enamel in orange and tiffany gradients on black",
    accent: "orange",
  },
  {
    slug: "tetrisplay",
    name: "TetrisPlay",
    description: "Classic Tetris game in C++.",
    repoUrl: gh("TetrisPlay"),
    image: img("tetrisplay"),
    imagePrompt:
      "stacked glossy tetromino blocks in orange, tiffany, and cream, falling into place against a dark grid",
    accent: "tiffany",
  },
  {
    slug: "plantwateringsystem",
    name: "PlantWateringSystem",
    description: "Automated embedded system for plant irrigation.",
    repoUrl: gh("PlantWateringSystem"),
    image: img("plantwateringsystem"),
    imagePrompt:
      "a small elegant potted plant with a sleek tiffany sensor and a single orange water droplet suspended mid-fall",
    accent: "orange",
  },
  {
    slug: "book-store",
    onWebsite: true,
    shortDescription: "Full-stack MERN application for managing book inventory.",
    name: "Book-Store",
    description: "Full-stack MERN application for managing book inventory.",
    repoUrl: gh("Book-Store"),
    image: img("book-store"),
    imagePrompt:
      "a stack of cloth-bound books with orange and tiffany spines, one open with soft light pouring out",
    accent: "tiffany",
  },
  {
    slug: "cabieeee",
    onWebsite: true,
    shortDescription: "Real-time cab-ordering mobile application.",
    name: "Cabieeee",
    description: "Real-time cab-ordering mobile application.",
    repoUrl: gh("Cabieeee"),
    image: img("cabieeee"),
    imagePrompt:
      "a minimal glossy toy-like taxi on a dark glowing road map with an orange route line and tiffany pin",
    accent: "orange",
  },
  {
    slug: "gideon-ai-desktop-assistant",
    onWebsite: true,
    shortDescription: "Voice-controlled desktop AI assistant.",
    name: "Gideon-AI-Desktop-Assistant",
    description: "Voice-controlled desktop AI assistant.",
    repoUrl: gh("Gideon-AI-Desktop-Assistant"),
    image: img("gideon-ai-desktop-assistant"),
    imagePrompt:
      "a floating glowing sound-wave orb above a sleek desk lamp-like device, orange waveform ring, tiffany core",
    accent: "tiffany",
  },
  {
    slug: "webrtc-video-rooms",
    onWebsite: true,
    shortDescription: "Real-time video chat with screen sharing using WebRTC.",
    name: "WebRTC-Video-Rooms",
    description: "Real-time video chat with screen sharing using WebRTC.",
    repoUrl: gh("WebRTC-Video-Rooms"),
    image: img("webrtc-video-rooms"),
    imagePrompt:
      "several floating rounded-rectangle glass panes arranged in a grid, connected by thin orange lines, tiffany reflections",
    accent: "orange",
  },
  {
    slug: "algorithmic-trading-bot",
    onWebsite: true,
    shortDescription: "Algorithmic trading experiments.",
    name: "algorithmic-trading-bot",
    description: "Algorithmic trading experiments.",
    repoUrl: gh("algorithmic-trading-bot-"), // repo name on GitHub has a trailing dash
    image: img("algorithmic-trading-bot"),
    imagePrompt:
      "a small chrome clockwork robot hand placing a coin onto glowing chart lines, orange and tiffany accents",
    accent: "tiffany",
  },
];

/** the normal website's cards, in this order (FinanceSimple's repo 404s, so Gideon-AI-Desktop-Assistant takes its place) */
const WEBSITE_ORDER = ["recall", "aegisfabric", "qshield-x", "kubeml", "agentflow", "distdata", "eshaanos", "edge-ai-model-compression", "gideon-ai-desktop-assistant", "morphunet", "fitmind-ai", "shopsmart-ai", "jobber", "webrtc-video-rooms", "algorithmic-trading-bot", "stockpredictor", "book-store", "cabieeee"];
export const websiteProjects = WEBSITE_ORDER.map((slug) => projects.find((p) => p.slug === slug && p.onWebsite)!).filter(Boolean);
