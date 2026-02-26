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
    # ===== New series for Phase 10171+ =====
    "aurora-v2": [
        "solar-particle", "magnetic-reconnect", "substorm-onset", "oval-shift", "proton-arc", "diffuse-glow",
        "discrete-arc", "pulsating-patch", "theta-aurora", "cusp-precipitate", "black-aurora", "steve-glow", "polar-rain", "conjugate-point",
    ],
    "cascade-v2": [
        "plunge-pool", "tiered-fall", "mist-rising", "bedrock-carved", "log-jam", "fish-ladder",
        "spray-zone", "erosion-notch", "hanging-lip", "curtain-fall", "horsetail-drop", "punchbowl", "ribbon-fall", "block-fall",
    ],
    "tempest-v2": [
        "wall-cloud", "mesocyclone", "hook-echo", "bear-cage", "inflow-jet", "flanking-line",
        "anvil-crawl", "mammatus-hang", "overshooting-top", "bounded-weak", "rear-flank", "forward-flank", "tail-end", "bow-echo",
    ],
    "ember-v2": [
        "smolder-slow", "char-edge", "heat-flux", "radiant-ember", "convection-plume", "fire-whirl",
        "spot-fire", "crown-fire", "ground-fire", "ladder-fuel", "backburn", "fire-line", "retardant-drop", "burnout-zone",
    ],
    "helix-v2": [
        "double-strand", "base-pair", "codon-read", "anticodon-match", "ribosome-bind", "polymerase-chain",
        "transcription-start", "translation-frame", "splicing-site", "promoter-region", "enhancer-loop", "silencer-block", "telomere-cap", "centromere-link",
    ],
    "nexus-v2": [
        "hub-central", "spoke-radial", "mesh-complete", "star-topology", "ring-connected", "bus-shared",
        "tree-branched", "hybrid-mesh", "point-to-point", "multi-drop", "daisy-chain", "backbone-linked", "peer-to-peer", "client-server",
    ],
    "prism-v2": [
        "refraction-angle", "dispersion-spread", "total-internal", "critical-angle", "brewster-angle", "snell-law",
        "birefringent-split", "dichroic-filter", "achromat-lens", "apochromat-corrected", "fresnel-zone", "abbe-number", "cauchy-equation", "sellmeier-fit",
    ],
    "dynamo-v2": [
        "armature-wound", "field-coil", "commutator-split", "brush-contact", "back-emf", "torque-constant",
        "speed-constant", "flux-linkage", "reluctance-gap", "hysteresis-loop", "eddy-suppressed", "laminated-core", "series-wound", "shunt-wound",
    ],
    "orbit-v2": [
        "perigee-low", "apogee-high", "inclination-set", "eccentricity-tuned", "epoch-fixed", "mean-anomaly",
        "true-anomaly", "argument-periapsis", "ascending-node", "hohmann-transfer", "bi-elliptic", "gravity-assist", "lagrange-point", "halo-orbit",
    ],
    "crystal-v2": [
        "lattice-cubic", "unit-cell", "miller-index", "bragg-diffract", "debye-scherrer", "laue-pattern",
        "point-defect", "line-dislocation", "planar-fault", "grain-boundary", "twinning-plane", "cleavage-face", "habit-form", "polymorphic-transition",
    ],
    # ===== New series for Phase 10871+ =====
    "magma": [
        "chamber-deep", "viscosity-high", "volatile-rich", "crystal-mush", "dike-injected", "sill-intruded",
        "plume-driven", "hotspot-fed", "rift-sourced", "partial-melt", "fractionated", "assimilated", "degassed", "eruption-ready",
    ],
    "vanguard": [
        "forward-scout", "advance-guard", "point-lead", "trailhead", "pathfinder-grade", "recon-swift",
        "spearhead", "outrider", "flank-secure", "column-front", "sortie-bound", "skirmish-ready", "picket-post", "vanguard-elite",
    ],
    "pylon": [
        "tower-mounted", "cable-strung", "steel-lattice", "cross-arm", "insulator-hung", "foundation-deep",
        "span-wide", "conductor-clad", "grounding-rod", "strain-tower", "angle-turn", "terminal-end", "suspension-hung", "dead-end",
    ],
    "apex": [
        "peak-altitude", "summit-grade", "crest-line", "ridge-top", "pinnacle-set", "crown-point",
        "high-mark", "zenith-reached", "vertex-placed", "acme-level", "climax-point", "tip-top", "capstone-set", "keystone-locked",
    ],
    "meridian-v2": [
        "prime-line", "antimeridian", "great-circle", "geodetic-datum", "projection-mapped", "graticule-set",
        "isogonic-line", "agonic-traced", "magnetic-declination", "true-north-v2", "grid-convergence", "transverse-mercator", "utm-zone", "gauss-kruger",
    ],
    "tundra-v2": [
        "polygon-ground", "solifluction-lobe", "frost-boil", "stone-circle", "ice-lens", "needle-ice",
        "patterned-ground", "cryoturbation", "gelisol-deep", "nivation-hollow", "blockfield", "felsenmeer", "rock-glacier", "protalus-rampart",
    ],
    "typhoon-v2": [
        "super-typhoon", "central-dense", "cloud-top", "dvorak-intensity", "saffir-simpson", "accumulated-cyclone",
        "power-dissipation", "potential-intensity", "rapid-decay", "extratropical-transition", "fujiwhara-effect", "binary-interaction", "concentric-eyewall", "vortex-rossby",
    ],
    "sequoia-v2": [
        "sierra-grove", "montane-belt", "fire-regime", "seed-cone", "bark-spongy", "buttress-root",
        "snag-standing", "nurse-log", "mycorrhizal", "understory-shade", "gap-dynamic", "succession-late", "crown-spread", "dbh-massive",
    ],
    "bastion-v2": [
        "trace-italienne", "star-fort", "ravelin-front", "demilune-placed", "tenaille-set", "hornwork-extended",
        "crownwork-built", "covered-way", "countermine", "caponier-flanked", "embankment-raised", "firing-step", "powder-magazine", "garrison-quartered",
    ],
    "trident-v2": [
        "harpoon-thrown", "whale-road", "kraken-deep", "leviathan-vast", "siren-call", "maelstrom-spun",
        "scylla-guard", "charybdis-pull", "triton-horn", "poseidon-wrath", "amphitrite-calm", "nereid-swift", "thalassic", "pelagic-zone",
    ],
    # ===== New series for Phase 11571+ =====
    "kraken": [
        "tentacle-reach", "ink-cloud", "depth-lurking", "sucker-grip", "beak-crushing", "camouflage-shift",
        "jet-propelled", "chromatophore", "bioluminescent-lure", "colossal-scale", "mantle-strong", "siphon-blast", "arm-regenerate", "abyssal-hunt",
    ],
    "monolith": [
        "slab-hewn", "obelisk-tall", "megalithic", "dolmen-capped", "menhir-stood", "trilithon-framed",
        "sarsen-dragged", "lintel-placed", "henge-circled", "cairn-stacked", "stele-carved", "pillar-monumental", "bedrock-rooted", "age-defiant",
    ],
    "nomad": [
        "caravan-led", "steppe-roaming", "yurt-pitched", "trade-route", "oasis-bound", "dune-crossing",
        "silk-road", "pastoral-drift", "camp-mobile", "horizon-chasing", "star-navigated", "sandstorm-braved", "water-wise", "territory-vast",
    ],
    "raptor": [
        "talon-sharp", "dive-strike", "thermal-soaring", "eyrie-perched", "prey-spotted", "wing-tucked",
        "beak-hooked", "feather-streamlined", "kill-zone", "territory-claimed", "nest-defended", "dawn-hunter", "dusk-patrol", "sky-sovereign",
    ],
    "crucible": [
        "molten-core", "alloy-fused", "slag-skimmed", "flux-added", "pour-ready", "ingot-cast",
        "temper-quenched", "anneal-slow", "forge-bright", "crucible-grade", "refractory-lined", "heat-soaked", "melt-point", "reduction-fired",
    ],
    "obelisk": [
        "granite-hewn", "sun-aligned", "hieroglyph-carved", "pyramidion-topped", "quarry-cut", "barge-floated",
        "temple-placed", "shadow-cast", "solstice-marked", "cartouche-inscribed", "capstone-gilded", "avenue-flanked", "dynasty-raised", "desert-standing",
    ],
    "leviathan": [
        "ocean-spanning", "hull-plated", "keel-deep", "bow-wave", "stern-wake", "ballast-trimmed",
        "cargo-laden", "bridge-commanded", "engine-room-v2", "propeller-driven", "anchor-set", "bulkhead-sealed", "draft-marked", "tonnage-vast",
    ],
    "steppe": [
        "grass-sea", "horseback-range", "kurgan-mound", "felt-tent", "eagle-hunt", "ferment-brewed",
        "frost-plain", "black-soil", "wind-corridor", "migration-path", "river-bend", "plateau-edge", "salt-lake", "sky-dome",
    ],
    "atoll": [
        "ring-reef", "lagoon-center", "coral-built-v2", "palm-fringed", "tide-pool", "pass-channel",
        "motu-island", "coconut-grove", "turquoise-shallow", "barrier-outer", "sand-cay", "bird-colony", "mangrove-inner", "current-swept-v2",
    ],
    "ridgeline": [
        "spine-sharp", "divide-water", "trail-narrow", "vista-wide", "wind-exposed", "tree-stunted",
        "rock-spine", "saddle-dip", "false-summit-v2", "knife-edge-v2", "scramble-grade", "exposure-high", "weather-side", "lee-sheltered",
    ],
    # ===== New series for Phase 12271+ =====
    "citadel": [
        "keep-fortified", "portcullis-barred", "watchtower-tall", "garrison-strong", "siege-proof", "moat-deep",
        "battlement-wide", "arrow-loop", "murder-hole", "gatehouse-guarded", "curtain-thick", "dungeon-sealed", "chapel-vaulted", "great-hall",
    ],
    "avalanche": [
        "snow-slab", "trigger-point", "fracture-line", "debris-field", "runout-zone", "crown-face",
        "stauchwall", "powder-cloud", "wet-slide", "dry-slab", "cornice-drop", "gully-channeled", "deposit-fan", "burial-deep",
    ],
    "pangaea": [
        "supercontinent", "rift-valley", "craton-core", "shield-area", "orogen-belt", "suture-zone",
        "terrane-docked", "plate-margin", "seafloor-spread", "hotspot-track", "mantle-plume", "lithosphere-thick", "asthenosphere-flow", "isostatic-balance",
    ],
    "solaris": [
        "heliocentric", "corona-mass", "solar-cycle", "sunspot-pair", "flare-class", "prominence-loop",
        "photosphere-grain", "convection-cell-v2", "radiation-belt", "magnetogram", "irradiance-total", "spectroheliograph", "coronagraph-v2", "ecliptic-plane",
    ],
    "labyrinth": [
        "maze-walled", "dead-end", "passage-narrow", "chamber-hidden", "thread-guided", "minotaur-deep",
        "turn-blind", "corridor-long", "exit-distant", "branching-path", "loop-back", "false-door", "pit-trap", "torch-lit",
    ],
    "tectonic": [
        "plate-boundary", "convergent-zone", "divergent-rift", "transform-fault", "subduction-angle", "collision-front",
        "seismic-gap", "stress-field", "strain-rate", "fault-plane", "focal-mechanism", "moment-tensor", "aftershock-sequence", "foreshock-cluster",
    ],
    "maelstrom": [
        "whirlpool-center", "vortex-pull", "spiral-current", "tidal-bore", "eddy-spin", "gyre-vast",
        "turbulence-zone", "undertow-force", "cavitation-bubble", "standing-wave", "rotor-cell", "shear-layer", "kelvin-helmholtz", "bernoulli-effect",
    ],
    "cerberus": [
        "three-headed", "gate-guardian", "underworld-bound", "chain-linked", "fang-bared", "shadow-lurking",
        "sentinel-post", "passage-denied", "howl-echoing", "iron-collared", "flame-breathed", "styx-guarding", "hades-loyal", "soul-watcher",
    ],
    "colosseum": [
        "arena-vast", "tier-stacked", "arch-vaulted", "column-ringed", "velarium-shade", "hypogeum-below",
        "podium-front", "cavea-seated", "ambulacrum-wide", "vomitorium-exit", "travertine-clad", "opus-caementicium", "reticulatum-faced", "spina-central",
    ],
    "siberia": [
        "taiga-endless", "permafrost-bound", "river-frozen", "mammoth-steppe", "diamond-pipe", "gulag-remote",
        "baikal-deep", "yenisei-flow", "larch-forest", "sable-fur", "frost-cracked-v2", "tundra-edge", "meteor-crater", "aurora-belt",
    ],
    # ===== New series for Phase 12971+ =====
    "obsidian-fortress": [
        "bastion-walled", "iron-gate", "keep-stone", "portcullis-heavy", "arrow-slotted", "rampart-crowned",
        "siege-hardened", "drawbridge-chain", "turret-watch", "garrison-held", "moat-circled", "battlement-sharp", "tower-capped", "vault-sealed",
    ],
    "aurora-veil": [
        "shimmer-curtain", "polar-glow", "ribbon-light", "green-arc", "solar-kissed", "magnetic-dance",
        "night-veil", "sky-drape", "ion-stream", "corona-wisp", "photon-shower", "particle-rain", "dawn-haze", "spectrum-fold",
    ],
    "tempest-crown": [
        "storm-king", "gale-throne", "thunder-reign", "cyclone-peak", "whirlwind-crest", "squall-helm",
        "lightning-scepter", "cloud-palace", "rain-sovereign", "hail-crown", "tornado-spire", "monsoon-rule", "blizzard-court", "typhoon-seat",
    ],
    "crystal-depths": [
        "abyss-clear", "deep-facet", "trench-prism", "pressure-gem", "fathom-shine", "ocean-lattice",
        "hydro-crystal", "brine-diamond", "seabed-quartz", "coral-gem", "pearl-matrix", "abyssal-shard", "sapphire-deep", "aqua-refract",
    ],
    "ember-throne": [
        "flame-seat", "ash-crown", "cinder-reign", "blaze-rule", "inferno-peak", "char-throne",
        "spark-scepter", "molten-hall", "fire-court", "smolder-king", "pyre-gate", "hearth-sovereign", "coal-vault", "magma-seat",
    ],
    "glacier-peak": [
        "ice-summit", "snow-cap", "frost-ridge", "berg-crown", "crevasse-edge", "firn-peak",
        "glacial-spire", "rime-crest", "polar-summit", "frozen-apex", "ice-field-top", "neve-ridge", "serac-tower", "moraine-peak",
    ],
    "thunder-vale": [
        "bolt-valley", "storm-glen", "rumble-gorge", "flash-canyon", "crack-ravine", "echo-dale",
        "charge-basin", "spark-hollow", "voltage-vale", "arc-gulch", "static-dell", "plasma-gap", "ion-cleft", "surge-valley",
    ],
    "nebula-gate": [
        "star-portal", "cloud-arch", "cosmic-door", "dust-gateway", "plasma-entry", "nova-threshold",
        "void-passage", "stellar-lock", "gas-bridge", "ion-gate", "photon-arch", "quasar-portal", "dark-entry", "emission-gate",
    ],
    "titan-forge": [
        "anvil-giant", "hammer-colossal", "furnace-vast", "bellows-roar", "ingot-titan", "crucible-massive",
        "slag-mountain", "tong-iron", "quench-deep", "temper-strong", "alloy-prime", "smelt-core", "cast-monolith", "weld-titan",
    ],
    "phantom-reef": [
        "ghost-coral", "wraith-lagoon", "specter-atoll", "shade-reef", "mist-barrier", "vanish-shoal",
        "haunt-tide", "ether-reef", "mirage-bank", "shadow-cay", "phantom-pass", "spirit-shelf", "void-reef", "unseen-bar",
    ],
    # ===== New series for Phase 13671+ =====
    "iron-canyon": [
        "iron-veined", "rust-banded", "ore-layered", "anvil-hewn", "canyon-scarped", "gorge-carved",
        "butte-guarded", "mesa-rimmed", "slot-narrow", "talus-choked", "rim-traced", "cliff-ironbound", "iron-bridge", "redrock-layered",
    ],
    "jade-forest": [
        "jade-polished", "nephrite-green", "verdant-canopy", "moss-draped-v2", "fern-carpeted", "resin-scented",
        "grove-emerald", "leaf-glossed", "bough-shadowed", "understory-deep", "canopy-filtered", "dew-laden", "stone-lantern", "shrine-hidden",
    ],
    "silver-storm": [
        "argent-squall", "silver-lined", "quicksilver-arc", "cloud-metallic", "sleet-bright", "hail-gleam",
        "thunder-glint", "lightning-filament", "gale-plated", "squall-polished", "storm-lustrous", "rain-mercurial", "stratus-silvered", "vortex-argent",
    ],
    "copper-ridge": [
        "copper-veined", "patina-green", "verdigris-rimmed", "ridgeback-cast", "spine-coppered", "hogback-formed",
        "cuesta-tilted", "escarp-copper", "anticline-crest", "faulted-ridge", "knoll-banded", "rim-oxidized", "ore-scarp", "cuprite-capped",
    ],
    "amber-coast": [
        "amber-washed", "resin-cast", "honeyed-shore", "dune-gilded", "beach-ambered", "tideline-gold",
        "driftwood-glow", "sea-polished", "cove-sunned", "kelp-amber", "surf-warmed", "bay-amberlit", "shell-bright", "sunset-resin",
    ],
    "onyx-spire": [
        "onyx-dark", "jet-gloss", "spire-needled", "needle-steepled", "gothic-risen", "black-faceted",
        "tower-obscured", "shadow-etched", "night-polished", "pinnacle-onyx", "steeple-inked", "basalt-anchored", "ebon-lustrous", "obsidian-kissed",
    ],
    "ruby-depths": [
        "ruby-lit", "carmine-abyss", "crimson-pressure", "gem-sunken", "trench-rubied", "abyss-ruby",
        "deep-scarlet", "lode-crimson", "chamber-ruby", "mantle-glow", "vein-jewel", "magma-rouge", "dark-cabochon", "pressure-lucent",
    ],
    "bronze-summit": [
        "bronze-cast", "summit-burnished", "crest-bronzed", "peak-patinaed", "ridge-medaled", "cairn-bronze",
        "scree-gleaming", "cornice-bronze", "alpine-burnished", "col-bronze", "plateau-bronzed", "spire-burnished", "rock-cast", "summit-verdigris",
    ],
    "pearl-harbor": [
        "pearl-lustrous", "nacre-sheen", "oyster-borne", "quay-calm", "berth-deep", "breakwater-white",
        "lantern-buoy", "harbor-misted", "dock-polished", "tide-sheltered", "cove-moored", "jetty-lined", "sail-pearl", "marina-quiet",
    ],
    "diamond-glacier": [
        "diamond-cut", "facet-ice", "crystal-ablated", "blue-ice", "serac-spark", "crevasse-glistened",
        "firn-faceted", "rime-jewel", "berg-brilliant", "moraine-gleam", "albedo-high", "icefield-prismatic", "lattice-diamond", "diamond-hard",
    ],
    # ===== New series for Phase 14371+ =====
    "malachite-gorge": [
        "banded-green", "copper-carbonate", "stalactitic-form", "botryoidal-mass", "gorge-veined", "azurite-paired",
        "lapidary-grade", "matrix-rough", "cabochon-polished", "bull-eye", "silk-banded", "congo-mine", "ural-sourced", "patina-aged",
    ],
    "titanium-shelf": [
        "alloy-light", "corrosion-free", "aerospace-grade", "biocompatible", "anodized-color", "grade-five",
        "shelf-stable", "oxide-layer", "sponge-refined", "rutile-ore", "ilmenite-source", "kroll-process", "beta-phase", "alpha-structure",
    ],
    "obsidian-drift": [
        "glass-drift", "lava-stream", "edge-razor", "flake-tooled", "snowflake-spec", "mahogany-hued",
        "rainbow-sheen-v2", "fire-polished", "tear-drop", "flow-banded-v2", "conchoidal-v2", "perlitic-crack", "vitrophyre", "devitrified",
    ],
    "rhodium-peak": [
        "catalyst-pure", "reflective-max", "oxidation-proof", "plating-bright", "group-nine", "rare-extract",
        "crucible-melt", "acid-resistant", "thermocouple-fit", "spectra-line", "isotope-stable", "alloy-hardened", "electro-deposited", "peak-lustrous",
    ],
    "lapis-canyon": [
        "lazurite-blue", "pyrite-flecked", "calcite-veined", "ultramarine-ground", "afghan-sourced", "canyon-strata",
        "gilding-grade", "pigment-crushed", "cabochon-domed", "inlay-set", "royal-blue", "celestial-stone", "metamorphic-formed", "lazuward-named",
    ],
    "platinum-reef": [
        "noble-metal", "catalyst-grade", "hallmark-pure", "troy-weighed", "reef-deposited", "placer-found",
        "nugget-form", "sponge-platinum", "crucible-cast", "acid-proof", "ductile-drawn", "wire-gauge", "thermocouple-pair", "isotope-rich",
    ],
    "bismuth-spire": [
        "rainbow-oxide", "crystal-hopper", "diamagnetic", "pepto-pink", "low-toxicity", "spire-grown",
        "staircase-crystal", "iridescent-layer", "melt-cast", "alloy-fusible", "cosmetic-grade", "pharmaceutical", "telluride-ore", "geometric-form",
    ],
    "tourmaline-cove": [
        "elbaite-green", "rubellite-pink", "indicolite-blue", "watermelon-slice", "paraiba-neon", "schorl-black",
        "cove-sheltered", "dravite-brown", "liddicoatite", "piezo-charged", "pyro-electric", "trigonal-prism", "striated-face", "gem-tourmaline",
    ],
    "beryllium-ridge": [
        "emerald-bearing", "aquamarine-tint", "light-alloy", "stiff-modulus", "x-ray-window", "neutron-reflect",
        "ridge-crystalline", "hexagonal-close", "chrysoberyl-hard", "goshenite-clear", "morganite-peach", "heliodor-gold", "phenakite-rare", "bertrandite-ore",
    ],
    "zirconium-vale": [
        "reactor-clad", "corrosion-shield", "hafnium-free", "oxide-ceramic", "cubic-zirconia", "vale-deposited",
        "baddeleyite-ore", "zircon-sand", "plasma-sprayed", "thermal-barrier", "prosthetic-grade", "getter-active", "pyrophoric-fine", "alloy-naval",
    ],
    # ===== New series for Phase 15071+ =====
    "selenite-arch": [
        "gypsum-clear", "moon-stone", "desert-rose", "twin-crystal", "tabular-form", "prismatic-habit",
        "cleavage-perfect", "satin-spar", "cave-grown", "evaporite-born", "fibrous-silk", "selenite-plate", "water-soluble", "optical-grade",
    ],
    "chromium-basin": [
        "stainless-alloy", "chrome-plated", "emerald-dopant", "ferrochrome", "refractory-lined", "passivation-film",
        "hexavalent-free", "trivalent-state", "specular-finish", "hardface-weld", "catalyst-carrier", "pigment-oxide", "corrosion-immune", "basin-smelted",
    ],
    "feldspar-mesa": [
        "orthoclase-pink", "plagioclase-white", "twinning-striped", "weathered-clay", "perthite-intergrown", "anorthite-calcic",
        "albite-sodic", "labradorite-flash", "moonstone-sheen", "sanidine-clear", "microcline-green", "mesa-exposed", "granitic-host", "pegmatite-coarse",
    ],
    "antimony-gorge": [
        "stibnite-metallic", "flame-retardant", "alloy-hardener", "trioxide-white", "sulfide-gray", "gorge-mined",
        "brittle-fracture", "lead-battery", "semiconductor-doped", "antimonial-lead", "type-metal", "bearing-alloy", "vermillion-base", "glass-fining",
    ],
    "apatite-ridge": [
        "phosphate-rich", "fluorapatite", "hydroxy-form", "bone-mineral", "fertilizer-source", "hexagonal-prism",
        "ridge-outcrop", "igneous-accessory", "sedimentary-layer", "bio-apatite", "laser-host", "rare-earth-doped", "francolite-crypto", "collophane-massive",
    ],
    "vermiculite-pass": [
        "mica-exfoliated", "heat-expanded", "insulation-fill", "soil-conditioner", "fire-barrier", "acoustic-dampen",
        "pass-quarried", "lightweight-aggregate", "asbestos-free", "hydroponic-medium", "packing-material", "friction-liner", "refractory-filler", "absorbent-grade",
    ],
    "cassiterite-bluff": [
        "tin-ore", "placer-deposit", "alluvial-worked", "smelter-feed", "bronze-age", "bluff-exposed",
        "tetragonal-crystal", "adamantine-luster", "heavy-mineral", "greisenized", "pegmatite-hosted", "wood-tin", "stream-tin", "vein-mined",
    ],
    "sphalerite-hollow": [
        "zinc-blende", "wurtzite-hex", "resinous-luster", "cleavage-six", "hollow-mined", "galena-associated",
        "cadmium-trace", "indium-source", "germanium-carrier", "marmatite-iron", "schalenblende", "fluorescent-orange", "triboluminescent-spark", "metamorphic-skarn",
    ],
    "dolomite-terrace": [
        "calcium-magnesium", "rhombohedral-form", "saddle-shaped", "terrace-layered", "reef-builder", "dolostone-massive",
        "hydrothermal-replaced", "pearl-spar", "ferroan-variety", "ankerite-iron", "huntite-white", "stromatolite-bound", "burial-diagenetic", "sabkha-evaporite",
    ],
    "molybdenite-peak": [
        "disulfide-layer", "lubricant-dry", "steel-alloy", "catalyst-hydro", "peak-porphyry", "rhenium-host",
        "hexagonal-plate", "metallic-sheen", "high-melting-v2", "superlubricant", "photovoltaic-contact", "nitrogen-fixation", "electrode-material", "quantum-emitter",
    ],
    # ===== New series for Phase 15771+ =====
    "chalcedony-ridge": [
        "microcrystalline", "agate-banded", "carnelian-red", "chrysoprase-green", "jasper-opaque", "onyx-layered",
        "ridge-silicified", "botryoidal-crust", "geode-lined", "chalcedonic-vein", "flint-nodule", "chert-bedded", "moss-agate", "dendritic-pattern",
    ],
    "magnetite-basin": [
        "iron-oxide", "lodestone-polar", "octahedral-form", "magnetite-sand", "skarn-hosted", "banded-iron",
        "basin-concentrated", "titano-magnetite", "detrital-grain", "biogenic-magnetite", "curie-point", "spinel-structure", "ilmenite-inter", "hematite-martite",
    ],
    "fluorite-arch": [
        "calcium-fluoride", "cubic-habit", "octahedral-cleave", "fluorspar-grade", "arch-mineralized", "purple-zone",
        "green-fluorite", "blue-john", "thermoluminescent-v2", "flux-agent", "optical-window", "rare-earth-host", "gangue-mineral", "hydrothermal-vein",
    ],
    "bauxite-mesa": [
        "alumina-rich", "laterite-weathered", "gibbsite-form", "boehmite-phase", "diaspore-hard", "mesa-capped",
        "bayer-process", "red-mud", "pisolitic-texture", "karst-bauxite", "tropical-leached", "iron-stained", "residual-deposit", "refinery-grade",
    ],
    "celestite-gorge": [
        "strontium-sulfate", "sky-blue", "tabular-crystal", "evaporite-hosted", "gorge-deposited", "geode-cluster",
        "orthorhombic-form", "celestine-nodule", "fibrous-vein", "replacement-origin", "sedimentary-bed", "concretion-core", "dogtooth-spar", "karstic-fill",
    ],
    "wolframite-pass": [
        "tungsten-ore", "iron-manganese", "monoclinic-form", "pass-vein", "greisen-hosted", "quartz-associated",
        "scheelite-paired", "hubnerite-end", "ferberite-dark", "alluvial-placer", "gravity-separated", "flotation-concentrate", "high-density", "strategic-mineral",
    ],
    "cinnabar-bluff": [
        "mercury-sulfide", "vermillion-red", "trigonal-crystal", "bluff-outcrop", "hot-spring-deposited", "epithermal-vein",
        "retort-smelted", "native-mercury", "metacinnabar-black", "livingstonite-mix", "fumarole-sublimate", "silica-sinter", "opalized-host", "stockwork-ore",
    ],
    "nepheline-hollow": [
        "feldspathoid", "hexagonal-prismatic", "silica-undersaturated", "hollow-intrusive", "syenite-host", "phonolite-rock",
        "sodalite-group", "leucite-related", "cancrinite-altered", "analcime-replaced", "ceramic-flux", "alumina-source", "alkali-rich", "peralkaline-melt",
    ],
    "kyanite-terrace": [
        "aluminum-silicate", "triclinic-blade", "blue-bladed", "terrace-metamorphic", "high-pressure", "andalusite-polymorph",
        "sillimanite-transition", "eclogite-facies", "mullite-converted", "refractory-cast", "abrasive-grain", "indicator-mineral", "garnet-schist", "staurolite-paired",
    ],
    "galena-peak": [
        "lead-sulfide", "cubic-crystal", "galena-cleavage", "silver-bearing", "peak-lode", "mississippi-valley",
        "replacement-body", "skarn-contact", "anglesite-weathered", "cerussite-crust", "flotation-recovered", "smelter-concentrate", "isotope-dated", "ore-shoot",
    ],
    # ===== New series for Phase 16471+ =====
    "rutile-canyon": [
        "titanium-dioxide", "tetragonal-prism", "needle-crystal", "beach-placer", "ilmenite-altered", "anatase-polymorph",
        "brookite-ortho", "canyon-bedrock", "refractory-pigment", "photocatalyst", "rutile-twin", "geniculated", "sagenite-net", "epitaxial-growth",
    ],
    "spodumene-vale": [
        "lithium-bearing", "pyroxene-chain", "kunzite-pink", "hiddenite-green", "pegmatite-crystal", "vale-quarried",
        "monoclinic-prism", "cleavage-perfect-v2", "alpha-phase", "beta-converted", "glass-ceramic", "battery-grade", "flotation-pure", "concentrate-refined",
    ],
    "wollastonite-arch": [
        "calcium-silicate", "acicular-habit", "contact-metamorphic", "skarn-mineral", "arch-outcrop", "fibrous-mass",
        "ceramic-filler", "friction-material", "paint-extender", "plastics-reinforcer", "low-shrinkage", "alkaline-flux", "deinking-agent", "fireproof-board",
    ],
    "prehnite-mesa": [
        "calcium-aluminum", "botryoidal-habit", "zeolite-facies", "mesa-volcanic", "pipe-vesicle", "green-translucent",
        "fan-spherulite", "epidote-associated", "pumpellyite-paired", "low-grade-meta", "cavity-lining", "reniform-crust", "tabular-aggregate", "vein-filling",
    ],
    "enstatite-gorge": [
        "magnesium-silicate", "ortho-pyroxene", "bronzite-sheen", "hypersthene-dark", "gorge-ultramafic", "mantle-xenolith",
        "meteorite-phase", "chondrite-common", "bowen-series", "cumulate-layer", "harzburgite-host", "lherzolite-bound", "norite-component", "corona-texture",
    ],
    "andalusite-pass": [
        "aluminum-silicate-v2", "chiastolite-cross", "contact-aureole", "hornfels-grade", "pass-metamorphic", "prismatic-square",
        "viridine-manganese", "porcelain-jasper", "refractory-brick", "mullite-precursor", "pelite-porphyroblast", "cordierite-paired-v2", "biotite-zone", "spotted-slate",
    ],
    "chrysoberyl-bluff": [
        "beryllium-aluminate", "cyclic-twin", "alexandrite-color", "cymophane-chatoyant", "bluff-pegmatite", "orthorhombic-dipyramid",
        "color-change", "cats-eye-v2", "trillings-form", "hard-gemstone", "alluvial-gem", "chrysoberyl-green", "iron-chromium", "sixling-twin",
    ],
    "staurolite-hollow": [
        "iron-aluminum", "cruciform-twin", "fairy-cross", "garnet-grade", "hollow-schist", "monoclinic-pseudo",
        "penetration-twin", "sixty-degree", "ninety-degree", "kyanite-associated", "regional-meta", "barrovian-zone", "pelitic-index", "medium-grade",
    ],
    "epidote-terrace": [
        "calcium-iron-aluminum", "pistachio-green", "clinozoisite-iron-free", "zoisite-ortho", "terrace-greenschist", "prismatic-striated",
        "saussurite-mass", "unakite-rock", "pistacite-end", "pleochroic-strong", "anomalous-interference", "vein-epidote", "skarn-accessory", "retrograde-product",
    ],
    "cordierite-peak": [
        "magnesium-alumino", "iolite-gem", "sector-twin", "peak-granulite", "dichroic-strong", "pinite-altered",
        "sekaninaite-iron", "indialite-hex", "water-bearing", "cordierite-gneiss", "hornfels-mineral", "emery-associated", "buckling-fold", "osumilite-group",
    ],
    # ===== New series for Phase 17171+ =====
    "siderite-canyon": [
        "carbonate-iron", "rhombohedral-cleavage", "clay-ironstone", "blackband-ore", "bog-iron", "canyon-bedded",
        "spathic-crystal", "siderite-concretion", "coal-measure", "chalybite-old", "vivianite-stained", "ankerite-mixed", "goethite-weathered", "limonite-crust",
    ],
    "anorthite-bluff": [
        "calcic-plagioclase", "triclinic-twin", "labradorescence-sheen", "bytownite-range", "bluff-volcanic", "gabbro-hosted",
        "anorthosite-massive", "schiller-effect", "exsolution-lamella", "bowen-continuous", "lunar-highland-v2", "refractory-calcium", "zoning-oscillatory", "albite-rim",
    ],
    "garnierite-vale": [
        "nickel-silicate", "serpentine-derived", "laterite-zone", "saprolite-rich", "vale-tropical", "limonite-cap",
        "nontronite-clay", "chlorite-green-v2", "magnetite-remnant", "chrysoprase-trace", "weathering-profile", "oxide-enriched", "supergene-zone", "karst-hosted",
    ],
    "zinnwaldite-pass": [
        "lithium-mica", "iron-rich-v2", "greisen-associated", "pass-granitic", "fluorine-bearing", "lepidolite-related",
        "pegmatite-margin", "tin-tungsten", "topaz-paired", "masutomilite-rare", "polylithionite-end", "siderophyllite-iron", "tetraferriphlogopite", "protolithionite",
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
