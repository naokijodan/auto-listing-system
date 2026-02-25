#!/usr/bin/env python3
"""Generate eBay Phase series route + UI files. Reusable for any series."""

import os
import sys

ROUTES_DIR = "/Users/naokijodan/Desktop/rakuda/apps/api/src/routes"
UI_DIR = "/Users/naokijodan/Desktop/rakuda/apps/web/src/app/ebay"
OUTPUT_DIR = "/Users/naokijodan/Desktop/rakuda/codex/output"
ROUTES_FILE = "/Users/naokijodan/Desktop/rakuda/apps/api/src/routes/ebay-routes.ts"

API_TEMPLATE = '''import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));

// Resources (6)
router.get('/resources', (_req: Request, res: Response) => res.json({ section: 'resources', action: 'list' }));
router.get('/resources/:id', (_req: Request, res: Response) => res.json({ section: 'resources', action: 'detail' }));
router.post('/resources', (_req: Request, res: Response) => res.json({ section: 'resources', action: 'create' }));
router.put('/resources/:id', (_req: Request, res: Response) => res.json({ section: 'resources', action: 'update' }));
router.delete('/resources/:id', (_req: Request, res: Response) => res.json({ section: 'resources', action: 'delete' }));
router.post('/resources/:id/process', (_req: Request, res: Response) => res.json({ section: 'resources', action: 'process' }));

// Variants (4)
router.get('/variants', (_req: Request, res: Response) => res.json({ section: 'variants', action: 'list' }));
router.get('/variants/:id', (_req: Request, res: Response) => res.json({ section: 'variants', action: 'detail' }));
router.post('/variants', (_req: Request, res: Response) => res.json({ section: 'variants', action: 'create' }));
router.put('/variants/:id', (_req: Request, res: Response) => res.json({ section: 'variants', action: 'update' }));

// Listings (4)
router.get('/listings', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'list' }));
router.get('/listings/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'detail' }));
router.post('/listings', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'create' }));
router.put('/listings/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/overview', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/trends', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'trends' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;
'''

COLORS = [
    "indigo-600", "orange-600", "pink-600", "slate-600", "red-600",
    "fuchsia-600", "green-600", "blue-600", "yellow-600", "purple-600",
    "cyan-600", "lime-600", "emerald-600", "sky-600", "amber-600",
    "violet-600", "rose-600", "teal-600",
]

CATEGORIES = ["listing", "order", "inventory", "seller", "product"]
CAT_NOUNS = {
    "listing": "engine",
    "order": "routing",
    "inventory": "planning",
    "seller": "dashboard",
    "product": "analysis",
}
CAT_UI_TABS = {
    "listing": [
        ("dashboard", "ダッシュボード", "dashboard/summary"),
        ("listings", "出品", "resources"),
        ("templates", "テンプレート", "variants"),
        ("optimization", "最適化", "listings"),
        ("analytics", "分析", "analytics/overview"),
        ("settings", "設定", "settings"),
    ],
    "order": [
        ("dashboard", "ダッシュボード", "dashboard/summary"),
        ("orders", "注文", "resources"),
        ("processing", "処理", "variants"),
        ("tracking", "追跡", "listings"),
        ("analytics", "分析", "analytics/overview"),
        ("settings", "設定", "settings"),
    ],
    "inventory": [
        ("dashboard", "ダッシュボード", "dashboard/summary"),
        ("inventory", "在庫", "resources"),
        ("operations", "オペレーション", "variants"),
        ("forecasting", "予測", "listings"),
        ("analytics", "分析", "analytics/overview"),
        ("settings", "設定", "settings"),
    ],
    "seller": [
        ("dashboard", "ダッシュボード", "dashboard/summary"),
        ("sellers", "セラー", "resources"),
        ("performance", "パフォーマンス", "variants"),
        ("management", "管理", "listings"),
        ("analytics", "分析", "analytics/overview"),
        ("settings", "設定", "settings"),
    ],
    "product": [
        ("dashboard", "ダッシュボード", "dashboard/summary"),
        ("products", "商品", "resources"),
        ("operations", "オペレーション", "variants"),
        ("quality", "クオリティ", "listings"),
        ("analytics", "分析", "analytics/overview"),
        ("settings", "設定", "settings"),
    ],
}

# Adjective sets for each series
SERIES_ADJECTIVES = {
    "blaze": [
        "autonomous", "cognitive", "generative", "semantic", "contextual",
        "adaptive-ai", "neural", "deep", "reinforced", "evolutionary",
        "probabilistic", "heuristic", "algorithmic", "computational",
    ],
    "storm": [
        "resilient", "fault-tolerant", "redundant", "recoverable", "durable",
        "persistent", "consistent", "available", "partitioned", "replicated",
        "sharded", "clustered", "federated", "synchronized",
    ],
    "wave": [
        "event-driven", "stream", "pipeline", "workflow", "orchestrated",
        "choreographed", "message", "queue", "pub-sub", "broadcast",
        "multicast", "unicast", "bidirectional", "asynchronous",
    ],
    "prism": [
        "observable", "traceable", "auditable", "loggable", "monitorable",
        "measurable", "quantifiable", "benchmarkable", "profileable", "debuggable",
        "inspectable", "diagnosable", "analyzable", "reportable",
    ],
    "nexus": [
        "composable-v2", "modular-v2", "pluggable-v2", "extensible-v2", "configurable-v2",
        "customizable", "themeable", "localizable", "accessible", "responsive-v2",
        "progressive", "isomorphic", "universal", "hybrid-v2",
    ],
    "forge": [
        "secure", "encrypted", "authenticated", "authorized", "validated",
        "sanitized", "hardened", "isolated", "sandboxed", "containerized",
        "immutable", "versioned", "cacheable", "optimizable",
    ],
    "drift": [
        "temporal", "scheduled", "periodic", "recurring", "triggered",
        "delayed", "throttled", "debounced", "batched", "queued",
        "prioritized", "weighted", "balanced", "distributed-v2",
    ],
    "arc": [
        "graph-based", "tree-based", "node-based", "edge-based", "mesh-based",
        "hierarchical", "flat", "nested", "recursive", "iterative",
        "parallel", "sequential", "concurrent", "transactional",
    ],
    "vortex": [
        "data-driven", "model-driven", "domain-driven", "event-sourced", "cqrs-based",
        "saga-based", "state-machine", "finite-state", "reactive-v2", "functional",
        "declarative", "imperative", "procedural", "object-oriented",
    ],
    "echo": [
        "cloud-native", "serverless", "microservice", "monolithic", "modular-v3",
        "layered", "hexagonal", "clean-arch", "onion-arch", "vertical-slice",
        "feature-based", "domain-based", "service-based", "component-based",
    ],
    "cipher": [
        "zero-trust", "end-to-end", "blockchain", "tokenized", "obfuscated",
        "decentralized", "verifiable", "trustless", "permissioned", "multi-sig",
        "zero-knowledge", "homomorphic", "post-quantum", "threshold",
    ],
    "helix": [
        "genomic", "evolutionary-v2", "mutagenic", "phenotypic", "epigenetic",
        "proteomic", "metabolic", "symbiotic", "biometric", "enzymatic",
        "catalytic", "polymorphic", "recombinant", "transgenic",
    ],
    "orbit": [
        "orbital", "celestial", "gravitational", "interstellar", "planetary",
        "asteroidal", "cometary", "galactic", "nebular", "stellar",
        "pulsar", "quasar-based", "solar", "lunar",
    ],
    "matrix": [
        "tensor", "vectorized", "matrix-based", "scalar", "eigenvalue",
        "stochastic", "deterministic", "gradient", "bayesian", "markov",
        "fourier", "laplacian", "gaussian", "poisson",
    ],
    "crystal": [
        "crystalline", "amorphous", "polymeric", "ceramic", "metallic",
        "composite", "nano-scale", "micro-scale", "macro-scale", "atomic",
        "molecular", "ionic", "covalent", "quantum-dot",
    ],
    "dynamo": [
        "kinetic", "potential", "thermal", "electromagnetic", "photovoltaic",
        "piezoelectric", "thermoelectric", "hydroelectric", "geothermal", "nuclear",
        "fusion-based", "fission-based", "plasma", "superconducting",
    ],
    "fusion": [
        "cross-platform", "multi-tenant", "polyglot", "interoperable", "bridged",
        "federated-v2", "gateway", "mesh", "sidecar", "proxy-based",
        "load-balanced", "circuit-breaker", "bulkhead", "retry-based",
    ],
    "photon": [
        "light-speed", "fiber-optic", "holographic", "spectral", "chromatic",
        "infrared", "ultraviolet", "x-ray", "gamma", "terahertz",
        "microwave", "radio-freq", "laser", "coherent",
    ],
    "quasar": [
        "high-energy", "ultra-dense", "relativistic", "quantum-field", "string-theory",
        "dark-matter", "dark-energy", "antimatter", "neutrino", "boson",
        "fermion", "hadron", "lepton", "photonic",
    ],
    "nebula": [
        "cloud-burst", "fog-computing", "edge-native", "mist-computing", "dew-computing",
        "ambient", "ubiquitous", "pervasive", "context-aware", "location-aware",
        "proximity", "geofenced", "beacon", "mesh-networked",
    ],
    "astral": [
        "astral-plane", "dimensional", "transcendent", "ethereal", "celestial-v2",
        "metaphysical", "quantum-leap", "hyperdimensional", "multiverse", "singularity",
        "wormhole", "tesseract", "hyperspace", "subspace",
    ],
    "cosmic": [
        "cosmic-ray", "supernova", "black-hole", "white-dwarf", "red-giant",
        "neutron-star", "magnetar", "cosmic-web", "dark-flow", "cosmic-string",
        "inflation", "big-bang", "cosmic-dawn", "recombination",
    ],
    "phantom": [
        "stealth", "invisible", "cloaked", "shadow", "ghost",
        "spectral-v2", "wraithlike", "ephemeral", "transient", "volatile",
        "phantom-zone", "null-space", "void", "liminal",
    ],
    "thunder": [
        "electrostatic", "lightning", "thunderbolt", "capacitive", "inductive",
        "resonant", "oscillating", "pulsating", "surging", "cascading",
        "avalanche", "breakdown", "discharge", "ionized",
    ],
    "glacier": [
        "cryogenic", "frozen", "permafrost", "glacial", "icecore",
        "snowflake", "crystallized", "frost", "subzero", "polar",
        "arctic", "tundra", "alpine", "boreal",
    ],
    "ember": [
        "incandescent", "molten", "pyroclastic", "volcanic", "magmatic",
        "geothermal-v2", "hydrothermal", "fumarolic", "obsidian", "basaltic",
        "igneous", "metamorphic", "sedimentary", "tectonic",
    ],
    "torrent": [
        "fluvial", "deltaic", "estuarine", "riparian", "alluvial",
        "hydraulic", "hydrodynamic", "turbulent", "laminar", "vortical",
        "siphonic", "artesian", "aquifer", "watershed",
    ],
    "pinnacle": [
        "summit", "apex-v2", "zenith-v2", "meridian", "culmination",
        "acme", "paragon", "epitome", "archetype", "paradigm",
        "exemplar", "benchmark-v2", "criterion", "touchstone",
    ],
    "aurora": [
        "borealis", "australis", "solar-wind", "magnetospheric", "ionospheric",
        "thermospheric", "mesospheric", "stratospheric", "tropospheric", "exospheric",
        "chromospheric", "photospheric", "coronal", "heliospheric",
    ],
    "radiant": [
        "luminous", "phosphorescent", "fluorescent", "bioluminescent", "chemiluminescent",
        "triboluminescent", "electroluminescent", "cathodoluminescent", "radioluminescent", "sonoluminescent",
        "thermoluminescent", "photoluminescent", "scintillating", "iridescent",
    ],
    "zenith": [
        "apex-peak", "stratospheric-v2", "altitudinal", "summit-v2", "pinnacle-v2",
        "climactic", "culminating", "supreme", "paramount", "preeminent",
        "transcendental", "elevated", "ascendant", "sovereign",
    ],
    "cascade": [
        "waterfall", "torrent-v2", "downstream", "tributary", "confluent",
        "meandering", "cascading-v2", "overflowing", "spillway", "cataract",
        "rapids", "whirlpool", "maelstrom", "undercurrent",
    ],
    "horizon": [
        "panoramic", "wide-angle", "far-reaching", "boundary-v2", "frontier",
        "peripheral", "vantage", "scenic", "expansive", "limitless",
        "unbounded", "infinite-v2", "vast", "sweeping",
    ],
    "tempest": [
        "cyclonic", "typhonic", "monsoon", "squall", "gale-force",
        "hurricane", "tornado", "blizzard", "hailstorm", "downburst",
        "windshear", "microburst", "supercell", "derecho",
    ],
    "mirage": [
        "illusory", "phantasmal", "holographic-v2", "virtual-v2", "augmented",
        "simulated", "synthetic-v2", "rendered", "projected", "refracted",
        "diffracted", "scattered", "polarized", "prismatic",
    ],
    "vertex": [
        "geometric", "topological", "fractal-v2", "tessellated", "polytopal",
        "geodesic", "hyperbolic", "elliptic", "parabolic", "cylindrical",
        "spherical", "toroidal", "helical", "spiral-v2",
    ],
    "solstice": [
        "equinoctial", "diurnal", "nocturnal", "circadian", "seasonal-v2",
        "vernal", "autumnal", "hibernal", "aestival", "solstitial",
        "lunisolar", "sidereal-v2", "synodic", "tropical-v2",
    ],
    "nova": [
        "supernova-v2", "hypernova", "kilonova", "micronova", "thermonuclear-v2",
        "detonation", "deflagration", "implosion", "accretion", "ejection",
        "progenitor", "remnant", "afterglow", "precursor",
    ],
    "eclipse": [
        "penumbral", "umbral", "annular", "total", "partial",
        "hybrid-v3", "saros", "syzygy", "occultation", "transit-v2",
        "coronagraph", "limb-darkening", "baily-beads", "diamond-ring",
    ],
    "spectrum": [
        "chromatic-v2", "monochromatic", "polychromatic", "achromatic", "dichroic",
        "trichromatic", "tetrachromatic", "hyperspectral", "multispectral", "broadband",
        "narrowband", "wideband", "baseband", "passband",
    ],
    "sentinel": [
        "watchful", "warding", "vigilant", "stalwart", "ever-guard", "iron-bound", "hawk-eyed", "gate-keeping",
        "oath-kept", "shield-ready", "border-wise", "threat-aware", "fortress-bred", "sentry-grade",
    ],
    "comet": [
        "trail-blazing", "swift-arc", "hyper-velocity", "vector-driven", "streak-fast", "orbit-skirting",
        "tail-lit", "apex-aimed", "glide-true", "sky-rending", "fast-track", "zero-drag", "jet-streamed", "path-cut",
    ],
    "titan": [
        "ironclad", "heavy-forged", "mega-struct", "colossus-built", "steel-milled", "bulk-formed",
        "power-dense", "load-bearing", "foundry-born", "rigid-frame", "monolith-cast", "factory-grade", "engine-room", "overbuilt",
    ],
    "spark": [
        "ignite-ready", "fresh-lit", "idea-charged", "newly-minted", "start-up", "bold-forged",
        "invention-primed", "seed-fired", "proto-made", "flash-born", "creative-surge", "draft-cut", "blueprint-bright", "origin-mark",
    ],
    "pulse": [
        "beat-matched", "signal-clean", "rhythm-locked", "heart-timed", "wave-synced", "tempo-true",
        "metered", "cadence-set", "throb-plain", "tick-driven", "vibe-steady", "cycle-tuned", "frequency-set", "tone-pure",
    ],
    "meridian": [
        "map-aligned", "north-marked", "course-true", "grid-locked", "waypointed", "bearing-set",
        "chart-ready", "track-lined", "azimuth-fixed", "longitudinal", "latitude-bound", "route-certain", "compass-led", "coordinate-sure",
    ],
    "aegis": [
        "shielded", "barrier-built", "wall-borne", "fortified", "armor-plated", "defense-grade",
        "bastion-strong", "guard-stitched", "bulwark-set", "rampart-locked", "safe-keep", "counterstrike", "redoubt-ready", "vaulted",
    ],
    "catalyst": [
        "reaction-led", "transformative", "phase-shift", "accelerant", "chain-start", "change-forged",
        "mix-triggered", "rapid-turn", "conversion-ready", "flux-driven", "mutation-spun", "boost-primed", "shift-fueled", "rate-raised",
    ],
    "stratos": [
        "high-alt", "upper-layer", "sky-stacked", "airborne", "cloud-borne", "thin-air",
        "jet-level", "altitude-rich", "upper-atmo", "layered-sky", "strata-swept", "lifted", "aero-tier", "roofline",
    ],
    "quantum": [
        "probability-tuned", "entangle-linked", "superposed", "spin-aligned", "wavefunction", "micro-scale",
        "particle-sharp", "uncertainty-aware", "qubit-ready", "state-split", "phase-locked", "field-coupled", "collapse-bound", "tunneling",
    ],
    "obsidian": [
        "volcanic-glass", "razor-edged", "mirror-dark", "lava-born", "vitreous", "jet-black",
        "flint-hard", "silica-rich", "shard-keen", "gloss-smooth", "magma-forged", "tecton-cut", "flow-banded", "perlite",
    ],
    "tidal": [
        "spring-tide", "neap-bound", "lunar-drawn", "ebb-flowing", "surge-mapped", "coast-locked",
        "wave-carved", "reef-swept", "current-wise", "deep-pull", "swell-driven", "shore-bound", "bay-curved", "lagoon-still",
    ],
    "basalt": [
        "column-formed", "lava-laid", "flood-plain", "pillow-shaped", "vesicular", "porphyritic",
        "olivine-rich", "pyroxene-dark", "fine-grained", "extrusive", "mafic-dense", "plateau-built", "dike-cut", "sill-spread",
    ],
    "sapphire": [
        "corundum-pure", "blue-deep", "star-formed", "facet-cut", "clarity-graded", "carat-weighed",
        "padparadscha", "kashmir-hued", "heat-treated", "gem-set", "cabochon-round", "brilliant-cut", "pavilion-angled", "crown-faceted",
    ],
    "condor": [
        "high-soaring", "thermal-riding", "wing-spread", "peak-nesting", "updraft-borne", "ridge-gliding",
        "canyon-cruising", "alpine-dwelling", "keen-sighted", "cliff-perched", "wind-mastered", "sky-ruling", "range-crossing", "summit-bound",
    ],
    "tungsten": [
        "ultra-dense", "heat-proof", "arc-resistant", "filament-grade", "high-melting", "carbide-hard",
        "alloy-tough", "sintered", "refractory", "electrode-fit", "ballast-heavy", "tool-steel", "wear-proof", "spark-plug",
    ],
    "mangrove": [
        "root-tangled", "brackish-water", "salt-tolerant", "coast-guarding", "tide-adapted", "prop-rooted",
        "estuary-bound", "nursery-rich", "canopy-dense", "storm-buffer", "sediment-trap", "carbon-sink", "bio-diverse", "inter-tidal",
    ],
    "opal": [
        "fire-flash", "play-of-color", "silica-gel", "hydrated", "precious-grade", "boulder-set",
        "black-opal", "white-opal", "crystal-clear", "matrix-held", "doublet-backed", "triplet-capped", "pinfire", "broadflash",
    ],
    "falcon": [
        "stoop-diving", "raptor-swift", "talon-gripped", "prey-locked", "aerie-built", "hover-hunt",
        "kestrel-keen", "peregrine-fast", "merlin-sized", "gyrfalcon-white", "saker-strong", "lanner-lean", "hobby-agile", "caracara-bold",
    ],
    "graphene": [
        "mono-layer", "hex-lattice", "sp2-bonded", "zero-gap", "ballistic-transport", "flex-strong",
        "ultra-thin", "high-conduct", "sheet-rolled", "nano-ribbon", "oxide-form", "doped-layer", "edge-state", "dirac-cone",
    ],
    # ===== New series for Phase 7231+ =====
    "obsidian-v2": [
        "glass-sharp", "mirror-polish", "lava-cooled", "edge-honed", "shard-split", "obsid-core",
        "dark-gleam", "fracture-clean", "volcanic-born", "silica-dense", "smoke-black", "knap-ready", "flow-lined", "vitric-pure",
    ],
    "tundra": [
        "permafrost-deep", "lichen-grown", "windswept-flat", "frost-heaved", "snow-packed", "ice-wedged",
        "caribou-trail", "peat-rich", "taiga-edge", "polar-bare", "aurora-lit", "solstice-dark", "drift-covered", "melt-pooled",
    ],
    "monsoon": [
        "rain-heavy", "wind-shift", "cloud-burst-v2", "flood-prone", "season-turn", "tropic-wet",
        "delta-fed", "paddy-green", "river-swelled", "mud-slick", "thunder-drawn", "mist-wrapped", "storm-bred", "humidity-peak",
    ],
    "bastion": [
        "wall-thick", "tower-high", "moat-ringed", "gate-barred", "parapet-topped", "keep-central",
        "curtain-walled", "arrow-slit", "drawbridge-set", "turret-crowned", "sally-port", "barbican-front", "citadel-core", "rampart-edged",
    ],
    "typhoon": [
        "eye-wall", "spiral-band", "pressure-low", "wind-max", "rain-band", "surge-high",
        "track-curved", "intensity-peak", "feeder-band", "outflow-jet", "convection-deep", "shear-low", "warm-core", "rapid-intensify",
    ],
    "sequoia": [
        "bark-thick", "crown-tall", "root-deep", "ring-ancient", "fire-scarred", "grove-dense",
        "trunk-massive", "canopy-high", "needle-green", "cone-bearing", "heartwood-strong", "sapwood-fresh", "giant-scale", "old-growth",
    ],
    "compass": [
        "north-true", "bearing-fixed", "course-set", "declination-adj", "azimuth-read", "heading-locked",
        "waypoint-marked", "meridian-crossed", "rose-printed", "needle-steady", "calibrated", "deviation-free", "pole-seeking", "chart-plotted",
    ],
    "anvil": [
        "hammer-struck", "forge-heated", "steel-shaped", "horn-curved", "hardy-hole", "face-flat",
        "pritchel-cut", "swage-formed", "tong-gripped", "quench-ready", "temper-drawn", "billet-set", "scale-free", "spark-thrown",
    ],
    "delta-v2": [
        "sediment-rich", "fan-shaped", "channel-split", "alluvial-plain", "levee-built", "marsh-edged",
        "distributary", "backwater-calm", "silt-laden", "flood-plain-v2", "oxbow-curved", "meander-belt", "bar-formed", "deposit-layered",
    ],
    "kelvin": [
        "absolute-zero", "thermal-scale", "entropy-low", "heat-capacity", "conduction-rate", "blackbody-peak",
        "temperature-grad", "isothermal", "adiabatic-v2", "exothermic", "endothermic", "calorimetric", "boltzmann-const", "planck-law",
    ],
    "trident": [
        "three-pronged", "deep-sea", "coral-pierced", "current-split", "tide-master", "wave-breaker",
        "reef-guard", "abyss-reach", "brine-forged", "kelp-carved", "barnacle-tough", "nautical-grade", "fathom-deep", "hull-strong",
    ],
    "bramble": [
        "thorn-dense", "hedge-woven", "berry-ripe", "vine-tangled", "root-spread", "leaf-layered",
        "wild-grown", "path-blocked", "thicket-deep", "stem-arched", "bud-set", "pollen-rich", "seed-scattered", "canopy-low",
    ],
    "citrine": [
        "amber-hued", "quartz-clear", "golden-warm", "facet-bright", "gem-polished", "crystal-grown",
        "mineral-rich", "luster-high", "carat-fine", "deposit-found", "heat-formed", "matrix-set", "prism-split", "clarity-top",
    ],
    "magnet": [
        "pole-north", "field-strong", "flux-dense", "ferrite-core", "coil-wound", "gauss-high",
        "domain-aligned", "hysteresis-low", "eddy-free", "rare-earth", "neodymium-grade", "attraction-pull", "repulsion-push", "induction-fast",
    ],
    "glacier-v2": [
        "ice-shelf", "crevasse-deep", "moraine-left", "calving-front", "firn-packed", "glacial-lake",
        "erratic-placed", "striation-marked", "cirque-carved", "arête-sharp", "till-deposited", "drumlin-shaped", "esker-ridged", "kettle-formed",
    ],
    "voltage": [
        "amp-high", "ohm-matched", "watt-dense", "circuit-closed", "resistor-tuned", "capacitor-charged",
        "diode-gated", "transistor-switched", "relay-triggered", "fuse-rated", "breaker-set", "transformer-wound", "rectifier-clean", "inverter-driven",
    ],
    "prairie": [
        "grass-tall", "wind-bent", "horizon-wide", "bison-roamed", "loam-rich", "drought-hard",
        "wildfire-swept", "root-mat", "sod-thick", "bloom-spring", "frost-browned", "hawk-hunted", "creek-cut", "bluff-edged",
    ],
    "garnet": [
        "almandine-red", "pyrope-deep", "spessartine-orange", "grossular-green", "andradite-dark", "uvarovite-chrome",
        "cabochon-set", "inclusion-free", "refractive-high", "hardness-seven", "dodecahedral", "trapezohedral", "alluvial-found", "metamorphic-born",
    ],
    "rampart": [
        "battlement-crowned", "crenel-cut", "merlon-topped", "embrasure-set", "machicolation-hung", "chemin-de-ronde",
        "escarp-steep", "counterscarp-faced", "glacis-sloped", "postern-hidden", "casemate-vaulted", "revetment-stone", "terreplein-wide", "banquette-stepped",
    ],
    "helios": [
        "solar-flare", "corona-bright", "prominence-arced", "sunspot-dark", "photon-stream", "plasma-ejected",
        "magnetic-loop", "chromosphere-hot", "convection-zone", "radiation-core", "fusion-powered", "hydrogen-rich", "helium-born", "luminosity-peak",
    ],
    # ===== New series for Phase 8631+ =====
    "summit": [
        "peak-crowned", "ridge-line", "summit-view", "cairn-marked", "switchback-trail", "tree-line",
        "scree-slope", "col-passage", "saddle-point", "false-peak", "knife-edge", "cornice-hung", "windward-face", "leeward-calm",
    ],
    "coral": [
        "reef-built", "polyp-grown", "lagoon-sheltered", "atoll-ringed", "brain-coral", "staghorn-branched",
        "fan-spread", "table-flat", "pillar-tall", "elkhorn-wide", "fire-coral", "soft-swayed", "deep-water", "bleach-resistant",
    ],
    # ===== New series for Phase 8771+ =====
    "flint": [
        "strike-sparked", "chert-hard", "knapped-edge", "fire-starter", "conchoidal-break", "nodule-formed",
        "siliceous", "crypto-crystalline", "biface-shaped", "cortex-rimmed", "lithic-core", "flake-detached", "pressure-chipped", "micro-blade",
    ],
    "zephyr": [
        "west-blown", "breeze-light", "petal-carried", "dawn-stirred", "soft-gust", "vale-swept",
        "meadow-crossed", "reed-bent", "mist-borne", "dusk-fading", "warm-front", "gentle-drift", "sky-whisper", "cloud-nudged",
    ],
    "riptide": [
        "current-strong", "shore-pulling", "undertow-deep", "channel-carved", "sand-bar", "break-zone",
        "seaward-flow", "neck-narrow", "feeder-current", "escape-route", "foam-line", "surf-edge", "lateral-drift", "rip-head",
    ],
    "cobalt": [
        "blue-metallic", "alloy-grade", "magnetic-core", "catalyst-active", "pigment-deep", "oxide-layered",
        "electrode-coated", "battery-cell", "superalloy", "gamma-phase", "spinel-form", "arsenide-base", "valence-shift", "coordination-six",
    ],
    "granite": [
        "quartz-rich", "feldspar-white", "mica-flecked", "plutonic-deep", "batholithic", "coarse-grained",
        "porphyritic-v2", "pegmatite-vein", "aplite-dike", "rapakivi-texture", "gneiss-foliated", "migmatite-mixed", "tor-weathered", "inselberg-risen",
    ],
    "fjord": [
        "glacier-carved", "steep-walled", "deep-basin", "u-shaped", "threshold-shallow", "hanging-valley",
        "tidewater-front", "sill-blocked", "stratified-water", "anoxic-deep", "waterfall-fed", "cliff-flanked", "arm-branched", "sound-open",
    ],
    "ironwood": [
        "dense-grained", "axe-resistant", "heartwood-dark", "bark-furrowed", "slow-grown", "drought-hardy",
        "termite-proof", "fence-post", "charcoal-grade", "tool-handle", "ship-timber", "bridge-beam", "mill-wheel", "forge-fuel",
    ],
    "mariana": [
        "hadal-zone", "trench-deep", "abyssal-plain", "subduction-born", "pressure-extreme", "bioluminescent-v2",
        "vent-heated", "seep-cold", "xenophyophore", "amphipod-rich", "manganese-crust", "sediment-thick", "fault-scarped", "plate-converged",
    ],
    "boreal": [
        "taiga-vast", "spruce-dense", "moss-carpeted", "bog-pitted", "lake-dotted", "snow-laden",
        "fire-cycled", "lichen-draped", "muskeg-soft", "moose-browsed", "owl-hunted", "frost-cracked", "daylight-long", "winter-dark",
    ],
    "obsidian-v3": [
        "glass-flow", "rhyolite-born", "apache-tear", "snowflake-pattern", "rainbow-sheen", "mahogany-brown",
        "pele-hair", "marekanite", "pitchstone-gray", "tachylite-dark", "hyaloclastite", "pumice-light", "scoria-rough", "tephra-blast",
    ],
    # ===== New series for Phase 9471+ =====
    "caldera": [
        "magma-chamber", "collapse-rim", "crater-wide", "fumarole-vent", "resurgent-dome", "tephra-layer",
        "lava-lake", "hot-spring", "sulfur-crust", "ash-fall", "pyroclastic-flow", "caldera-fill", "ring-fault", "post-collapse",
    ],
    "cypress": [
        "swamp-rooted", "knee-high", "moss-draped", "evergreen-tall", "resin-rich", "bark-fibrous",
        "cone-scaled", "wind-resistant", "wetland-king", "bald-crowned", "timber-straight", "bayou-born", "flood-proof", "centuries-old",
    ],
    "quartz": [
        "silicon-pure", "piezo-active", "crystal-hexed", "vein-threaded", "milky-white", "rose-tinted",
        "smoky-dark", "amethyst-purple", "rutilated", "phantom-layered", "double-terminated", "druzy-coated", "geode-filled", "oscillator-grade",
    ],
    "peridot": [
        "olivine-green", "mantle-born", "gem-clarity", "iron-tinted", "volcanic-ejected", "meteorite-found",
        "basalt-hosted", "xenolith-carried", "facet-brilliant", "chrysolite-old", "hawaiite-set", "kimberlite-piped", "orthorhombic", "birefringent",
    ],
    "sandstone": [
        "grain-cemented", "cross-bedded", "wind-sculpted", "mesa-forming", "arch-carved", "canyon-walled",
        "red-ochre", "buff-yellow", "ripple-marked", "fossil-bearing", "aquifer-porous", "flagstone-split", "desert-varnished", "cliff-dwelling",
    ],
    "terracotta": [
        "kiln-fired", "earthen-warm", "clay-molded", "ochre-glazed", "pot-shaped", "tile-pressed",
        "sun-dried", "slip-coated", "coil-built", "wheel-thrown", "bisque-stage", "engobe-painted", "sgraffito-carved", "amphora-styled",
    ],
    "permafrost": [
        "ice-cemented", "ground-frozen", "pingo-mound", "thermokarst", "active-layer", "yedoma-rich",
        "syngenetic", "epigenetic", "talik-thawed", "palsa-raised", "cryopeg-briny", "ice-wedge-v2", "retrogressive-thaw", "solifluction",
    ],
    "stalactite": [
        "drip-formed", "cave-hung", "calcite-pure", "mineral-deposited", "column-merged", "speleothem",
        "flowstone-spread", "soda-straw", "curtain-draped", "helictite-twisted", "rim-stone", "cave-pearl", "bacon-strip", "gour-pool",
    ],
    "archipelago": [
        "island-chain", "volcanic-arc", "barrier-reef", "atoll-based", "continental-shelf", "strait-linked",
        "channel-deep", "lagoon-calm", "windward-exposed", "leeward-sheltered", "islet-dotted", "seamount-risen", "coral-fringed", "trade-wind",
    ],
    "monsoon-v2": [
        "inter-tropical", "hadley-cell", "jet-stream", "orographic-lift", "convective-burst", "dry-spell",
        "onset-surge", "withdrawal-phase", "monsoon-trough", "low-pressure", "cyclogenesis", "outflow-boundary", "gust-front", "squall-line",
    ],
}


def to_camel(kebab: str) -> str:
    parts = kebab.split("-")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


def make_ui_page(route_name: str, color: str, category: str) -> str:
    tabs = CAT_UI_TABS[category]
    tabs_json = ",\n  ".join(
        f'{{"key":"{t[0]}","label":"{t[1]}","path":"{t[2]}"}}'
        for t in tabs
    )
    color_name = color.replace("-600", "")
    return f'''"use client";
import {{ useEffect, useState }} from "react";

type ApiResponse = {{ section: string; action: string }};

const TABS = [
  {tabs_json}
] as const;

const API_BASE = "/api/{route_name}/";

export default function Page() {{
  const [active, setActive] = useState<(typeof TABS)[number]["key"]>("dashboard");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {{
    const tab = TABS.find((t) => t.key === active);
    if (!tab) return;
    setError(null);
    fetch(API_BASE + tab.path)
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(e.message));
  }}, [active]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-{color} mb-4">
        {{API_BASE.replace("/api/", "").replace("/", "")}}
      </h1>
      <div className="flex gap-2 mb-6">
        {{TABS.map((t) => (
          <button
            key={{t.key}}
            onClick={{() => setActive(t.key)}}
            className={{`px-4 py-2 rounded ${{
              active === t.key
                ? "bg-{color_name}-100 text-{color} font-bold"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }}`}}
          >
            {{t.label}}
          </button>
        ))}}
      </div>
      {{error && <p className="text-red-500 mb-4">{{error}}</p>}}
      {{data && (
        <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
          {{JSON.stringify(data, null, 2)}}
        </pre>
      )}}
    </div>
  );
}}
'''


def generate_series(series_name: str, start_phase: int):
    adjectives = SERIES_ADJECTIVES[series_name]
    os.makedirs(ROUTES_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    imports = []
    registrations = []
    all_routes = []

    phase = start_phase
    for adj in adjectives:
        for cat in CATEGORIES:
            noun = CAT_NOUNS[cat]
            route_name = f"ebay-{cat}-{adj}-{noun}-{series_name}"
            color = COLORS[(phase - start_phase) % len(COLORS)]
            var_name = to_camel(route_name) + "Router"

            # API route file
            api_path = os.path.join(ROUTES_DIR, f"{route_name}.ts")
            with open(api_path, "w") as f:
                f.write(API_TEMPLATE)

            # UI page
            ui_folder_name = f"{cat}-{adj}-{noun}-{series_name}"
            ui_dir = os.path.join(UI_DIR, ui_folder_name)
            os.makedirs(ui_dir, exist_ok=True)
            ui_path = os.path.join(ui_dir, "page.tsx")
            with open(ui_path, "w") as f:
                f.write(make_ui_page(route_name, color, cat))

            imports.append(f"import {var_name} from './{route_name}';")
            registrations.append(f"  app.use('/api/{route_name}', {var_name});")
            all_routes.append((phase, route_name, cat, color))
            phase += 1

    # Write imports/registrations
    with open(os.path.join(OUTPUT_DIR, f"{series_name}-imports.txt"), "w") as f:
        f.write("\n".join(imports) + "\n")
    with open(os.path.join(OUTPUT_DIR, f"{series_name}-registrations.txt"), "w") as f:
        f.write("\n".join(registrations) + "\n")

    end_phase = phase - 1
    print(f"[{series_name}] Generated {len(all_routes)} files. Phase {start_phase}-{end_phase}")
    return end_phase


def update_routes(series_name: str, start_phase: int, end_phase: int):
    with open(ROUTES_FILE, "r") as f:
        content = f.read()

    with open(f"{OUTPUT_DIR}/{series_name}-imports.txt", "r") as f:
        imports = f.read().strip()

    with open(f"{OUTPUT_DIR}/{series_name}-registrations.txt", "r") as f:
        regs = f.read().strip()

    content = content.replace(
        "\nexport function registerEbayRoutes",
        f"\n// Phase {start_phase}-{end_phase} ({series_name.capitalize()} series)\n{imports}\n\nexport function registerEbayRoutes"
    )

    last_brace = content.rstrip().rfind("}")
    content = (
        content[:last_brace]
        + f"\n  // Phase {start_phase}-{end_phase} ({series_name.capitalize()} series)\n"
        + regs
        + "\n}\n"
    )

    with open(ROUTES_FILE, "w") as f:
        f.write(content)
    print(f"[{series_name}] Updated ebay-routes.ts")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 generate_series.py <series_name> <start_phase>")
        print(f"Available series: {', '.join(SERIES_ADJECTIVES.keys())}")
        sys.exit(1)

    series = sys.argv[1]
    start = int(sys.argv[2])

    if series not in SERIES_ADJECTIVES:
        print(f"Unknown series: {series}. Available: {', '.join(SERIES_ADJECTIVES.keys())}")
        sys.exit(1)

    end = generate_series(series, start)
    update_routes(series, start, end)
    print(f"Done! Phase {start}-{end} ({series.capitalize()} series)")
