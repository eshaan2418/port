/**
 * The projects in the normal website's curved row, in display order. Website
 * only: the city gallery and the agent files keep reading data/projects.ts
 * (quorumkv and wasmlet are deliberately not added there). Imports nothing.
 *
 * `image` is the project's 16:10 screen-print poster under /public/projects/site/
 * (website only, so the city's gallery, which reads /public/projects/<slug>.webp,
 * doesn't pick them up). If a file is missing the build falls back to a
 * temporary tile (see lib/website-project-images.ts).
 * Every repoUrl was fetched and resolves publicly; the seven that are also in
 * data/projects.ts use the same repo names.
 */
export type WebsiteProject = {
  slug: string;
  name: string;
  /** shown on the flipped card, exactly as given (split at the commas into chips) */
  technicalFocus: string;
  image: string;
  repoUrl: string;
};

const gh = (repo: string) => `https://github.com/eshaan2418/${repo}`;

export const websiteProjects: WebsiteProject[] = [
  // ordered so the posters alternate: white background, black, white, black… (5 white, 4 black, so the loop's
  // seam puts the last and first, both white, side by side once per lap)
  { slug: "aegisfabric", name: "AegisFabric", technicalFocus: "Distributed AI infrastructure, networking, fault tolerance", image: "/projects/site/aegisfabric.webp", repoUrl: gh("AegisFabric") },
  { slug: "agentflow", name: "AgentFlow", technicalFocus: "Distributed AI agent orchestration, PostgreSQL, Kafka", image: "/projects/site/agentflow.webp", repoUrl: gh("agentflow") },
  { slug: "qshield-x", name: "QShield-X", technicalFocus: "Quantum error correction, FPGA, formal verification", image: "/projects/site/qshield-x.webp", repoUrl: gh("qshield-x") },
  { slug: "kubeml", name: "KubeML", technicalFocus: "Kubernetes-native ML orchestration, GPU scheduling", image: "/projects/site/kubeml.webp", repoUrl: gh("KubeML") },
  { slug: "edge-ai", name: "Edge AI", technicalFocus: "Neural network compression, quantization, C++ inference", image: "/projects/site/edge-ai.webp", repoUrl: gh("Edge-AI-Model-Compression-Deployment") },
  { slug: "distdata", name: "DistData", technicalFocus: "Distributed databases, replication, consensus, transactions", image: "/projects/site/distdata.webp", repoUrl: gh("DIstData") },
  { slug: "quorumkv", name: "quorumkv", technicalFocus: "Raft consensus, distributed storage, linearizability", image: "/projects/site/quorumkv.webp", repoUrl: gh("quorumkv") },
  { slug: "recall", name: "Recall", technicalFocus: "On-device computer vision, episodic memory, privacy", image: "/projects/site/recall.webp", repoUrl: gh("Recall") },
  { slug: "wasmlet", name: "wasmlet", technicalFocus: "WebAssembly interpreter, Rust, runtime engineering", image: "/projects/site/wasmlet.webp", repoUrl: gh("wasmlet") },
];
