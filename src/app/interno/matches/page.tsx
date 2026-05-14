/* eslint-disable @next/next/no-img-element */
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { LogoutButton } from "../logout-button";

export const dynamic = "force-dynamic";

type InternalMatchesProps = {
  searchParams?: Promise<{
    category?: string;
    status?: string;
  }>;
};

type ReviewOffer = Prisma.OfferGetPayload<{
  include: {
    product: true;
    store: true;
  };
}> & { brandKey?: string | null };

type MatchSuggestion = {
  candidate: ReviewOffer;
  reasons: string[];
  score: number;
  seed: ReviewOffer;
};

const SUGGESTION_LIMIT = 120;
const MATCH_REVIEW_THRESHOLD = 0.58;
const STRONG_MODEL_CATEGORIES = new Set([
  "Accesorios de extraccion",
  "Bandejas y ceniceros",
  "Bongs",
  "Encendedores y sopletes",
  "Moledores",
  "Pipas",
  "Repuestos para bongs y vaporizadores",
  "Vaporizadores herbales",
]);
const MATERIAL_TOKENS = new Set([
  "acrilico",
  "aluminio",
  "borosilicato",
  "ceramic",
  "ceramica",
  "ceramico",
  "cuarzo",
  "glass",
  "madera",
  "metal",
  "metalica",
  "metalico",
  "plastico",
  "pyrex",
  "quartz",
  "silicona",
  "silicone",
  "vidrio",
]);
const MATERIAL_KEYS = new Map([
  ["aluminio", "metal"],
  ["borosilicato", "glass"],
  ["ceramic", "ceramic"],
  ["ceramica", "ceramic"],
  ["ceramico", "ceramic"],
  ["cuarzo", "quartz"],
  ["metalica", "metal"],
  ["metalico", "metal"],
  ["pyrex", "glass"],
  ["quartz", "quartz"],
  ["silicona", "silicone"],
  ["silicone", "silicone"],
  ["vidrio", "glass"],
]);
const DESCRIPTOR_TOKENS = new Set([
  "amarillo",
  "azul",
  "black",
  "blanco",
  "blue",
  "classic",
  "clasica",
  "clasico",
  "clear",
  "dorado",
  "grande",
  "green",
  "mediana",
  "mediano",
  "mini",
  "negra",
  "negro",
  "pequena",
  "pequeno",
  "red",
  "rojo",
  "transparente",
  "verde",
  "white",
]);
const DESCRIPTOR_KEYS = new Map([
  ["black", "black"],
  ["negra", "black"],
  ["negro", "black"],
  ["blue", "blue"],
  ["azul", "blue"],
  ["clear", "clear"],
  ["transparente", "clear"],
  ["green", "green"],
  ["verde", "green"],
  ["red", "red"],
  ["rojo", "red"],
  ["white", "white"],
  ["blanco", "white"],
  ["clasica", "classic"],
  ["clasico", "classic"],
  ["mediano", "mediana"],
  ["pequena", "mini"],
  ["pequeno", "mini"],
]);
const MODEL_TOKENS = new Set([
  "45",
  "90",
  "artesano",
  "automatico",
  "bamboo",
  "brazilian",
  "bucket",
  "classic",
  "clasica",
  "clasico",
  "crafty",
  "diamond",
  "emerald",
  "flight",
  "flat",
  "full",
  "girl",
  "honeycomb",
  "king-size",
  "macho",
  "mighty",
  "organic",
  "prepare",
  "pro",
  "regular",
  "slurper",
  "venty",
  "weld",
]);
const KNOWN_MODEL_PHRASES = [
  "baby cake",
  "beaker plus",
  "beaker tree perc",
  "big blow",
  "big eye",
  "bongbastic",
  "bubbler kush",
  "color cube",
  "classic ice",
  "diamond",
  "doble cuerno",
  "doble inline",
  "dream rig",
  "fat candy",
  "glycerin thicc",
  "glycerin the yeti",
  "handy rig",
  "headshot",
  "heavy bubbler",
  "heavy trash",
  "honey waffle",
  "jelly drop",
  "jelly fish",
  "k276",
  "k306",
  "k41",
  "k47 medusa",
  "k99 octopus",
  "km8 viper",
  "little buchner",
  "mad professor",
  "mini beaker",
  "nevis rig",
  "pocket bell",
  "r3 mini",
  "rick sanchez",
  "roller coaster",
  "space oddity",
  "space opera",
  "straight tube",
  "the sheikh",
  "the trash",
  "tiny bell",
  "unikorn",
  "water splash",
];

export default async function InternalMatches({ searchParams }: InternalMatchesProps) {
  await requireAdmin();

  const params = (await searchParams) ?? {};
  const selectedCategory = typeof params.category === "string" ? params.category : "";
  const selectedStatus = typeof params.status === "string" ? params.status : "pending";
  const data = await getMatchReviewData(selectedCategory, selectedStatus);

  return (
    <main className="min-h-screen bg-[#f4f1e8] px-5 py-6 text-[#17150f] sm:px-8 lg:px-10">
      <section className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col gap-5 rounded-[2rem] bg-[#17150f] p-6 text-[#f8f4df] shadow-[10px_10px_0_#bddf57] sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Link className="text-sm font-black uppercase tracking-[0.2em] text-[#bddf57]" href="/">
                SoloWeed
              </Link>
              <LogoutButton />
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">Revisión de matches</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#f8f4df]/70">
              Panel interno para aprobar o rechazar coincidencias sugeridas antes de consolidarlas como comparaciones reales.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <Stat label="Pendientes" value={String(data.stats.pending)} />
            <Stat label="Aprobados" value={String(data.stats.approved)} />
            <Stat label="Rechazados" value={String(data.stats.rejected)} />
          </div>
        </header>

        <form className="mt-8 grid gap-3 rounded-[2rem] border border-black/10 bg-white p-4 sm:grid-cols-[1fr_220px_auto]">
          <select className="min-h-12 rounded-2xl border border-black/10 px-4 font-bold" defaultValue={selectedCategory} name="category">
            <option value="">Todas las categorias</option>
            {data.categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select className="min-h-12 rounded-2xl border border-black/10 px-4 font-bold" defaultValue={selectedStatus} name="status">
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobados</option>
            <option value="rejected">Rechazados</option>
          </select>
          <button className="min-h-12 rounded-2xl bg-[#bddf57] px-6 font-black">Filtrar</button>
        </form>

        <section className="mt-8 grid gap-4">
          {data.suggestions.length > 0 ? (
            data.suggestions.map((suggestion) => (
              <SuggestionCard key={`${suggestion.seed.id}-${suggestion.candidate.id}`} suggestion={suggestion} />
            ))
          ) : (
            <div className="rounded-[2rem] border border-dashed border-black/20 bg-white p-10 text-center">
              <h2 className="text-2xl font-black">No hay matches para revisar</h2>
              <p className="mt-3 text-sm text-black/55">Cambia filtros o vuelve a correr el reporte despues de actualizar datos.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

async function approveMatch(formData: FormData) {
  "use server";

  await requireAdmin();

  const seedOfferId = Number(formData.get("seedOfferId"));
  const candidateOfferId = Number(formData.get("candidateOfferId"));

  if (!Number.isInteger(seedOfferId) || !Number.isInteger(candidateOfferId)) {
    return;
  }

  const seedOffer = await prisma.offer.findUnique({ where: { id: seedOfferId } });

  if (!seedOffer?.productId) {
    return;
  }

  await prisma.$transaction([
    upsertMatchDecisionQuery(seedOfferId, candidateOfferId, "approved"),
    prisma.offer.update({ where: { id: candidateOfferId }, data: { productId: seedOffer.productId } }),
  ]);

  revalidatePath("/interno/matches");
  revalidatePath("/");
}

async function rejectMatch(formData: FormData) {
  "use server";

  await requireAdmin();

  const seedOfferId = Number(formData.get("seedOfferId"));
  const candidateOfferId = Number(formData.get("candidateOfferId"));

  if (!Number.isInteger(seedOfferId) || !Number.isInteger(candidateOfferId)) {
    return;
  }

  await upsertMatchDecision(seedOfferId, candidateOfferId, "rejected");

  revalidatePath("/interno/matches");
}

async function getMatchReviewData(selectedCategory: string, selectedStatus: string) {
  const where: Prisma.OfferWhereInput = selectedCategory ? { category: selectedCategory } : {};
  const [rawOffers, decisions, categories, pending, approved, rejected] = await Promise.all([
    prisma.offer.findMany({
      where,
      include: { product: true, store: true },
      orderBy: [{ category: "asc" }, { brand: "asc" }, { price: "asc" }],
    }),
    getMatchDecisions(),
    prisma.offer.findMany({ distinct: ["category"], orderBy: { category: "asc" }, select: { category: true } }),
    countMatchDecisions("pending"),
    countMatchDecisions("approved"),
    countMatchDecisions("rejected"),
  ]);
  const offers = await attachOfferBrandKeys(rawOffers);
  const decisionMap = new Map(decisions.map((decision) => [getDecisionKey(decision.seedOfferId, decision.candidateOfferId), decision.status]));
  const suggestions = buildMatchSuggestions(offers, decisionMap, selectedStatus);

  return {
    categories: categories.map((item) => item.category),
    stats: {
      approved,
      pending: suggestions.length + pending,
      rejected,
    },
    suggestions,
  };
}

function upsertMatchDecisionQuery(seedOfferId: number, candidateOfferId: number, status: string) {
  return prisma.$executeRaw`
    INSERT INTO "MatchDecision" ("seedOfferId", "candidateOfferId", "status", "createdAt", "updatedAt")
    VALUES (${seedOfferId}, ${candidateOfferId}, ${status}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT("seedOfferId", "candidateOfferId") DO UPDATE SET
      "status" = ${status},
      "updatedAt" = CURRENT_TIMESTAMP
  `;
}

async function upsertMatchDecision(seedOfferId: number, candidateOfferId: number, status: string) {
  await upsertMatchDecisionQuery(seedOfferId, candidateOfferId, status);
}

async function getMatchDecisions() {
  return prisma.$queryRaw<Array<{ candidateOfferId: number; seedOfferId: number; status: string }>>`
    SELECT "seedOfferId", "candidateOfferId", "status" FROM "MatchDecision"
  `;
}

async function countMatchDecisions(status: string) {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) AS count FROM "MatchDecision" WHERE "status" = ${status}
  `;

  return Number(rows[0]?.count ?? 0);
}

async function attachOfferBrandKeys(offers: Prisma.OfferGetPayload<{ include: { product: true; store: true } }>[]) {
  if (offers.length === 0) {
    return [];
  }

  const ids = offers.map((offer) => offer.id).join(",");
  const rows = await prisma.$queryRawUnsafe<Array<{ brandKey: string | null; id: number }>>(
    `SELECT "id", "brandKey" FROM "Offer" WHERE "id" IN (${ids})`,
  );
  const brandKeysByOfferId = new Map(rows.map((row) => [row.id, row.brandKey]));

  return offers.map((offer) => ({ ...offer, brandKey: brandKeysByOfferId.get(offer.id) ?? null }));
}

function buildMatchSuggestions(offers: ReviewOffer[], decisionMap: Map<string, string>, selectedStatus: string) {
  const suggestions: MatchSuggestion[] = [];

  for (let i = 0; i < offers.length; i += 1) {
    for (let j = i + 1; j < offers.length; j += 1) {
      const first = offers[i];
      const second = offers[j];

      if (!canReviewPair(first, second)) {
        continue;
      }

      const [seed, candidate] = pickSeedAndCandidate(first, second);
      const key = getDecisionKey(seed.id, candidate.id);
      const status = decisionMap.get(key) ?? "pending";

      if (status !== selectedStatus) {
        continue;
      }

      const scored = scoreSuggestion(seed, candidate);

      if (status === "pending" && scored.score < MATCH_REVIEW_THRESHOLD) {
        continue;
      }

      suggestions.push({ seed, candidate, ...scored });
    }
  }

  return suggestions.sort((first, second) => second.score - first.score).slice(0, SUGGESTION_LIMIT);
}

function canReviewPair(first: ReviewOffer, second: ReviewOffer) {
  return (
    first.id !== second.id &&
    first.category === second.category &&
    first.storeId !== second.storeId &&
    first.productId !== second.productId &&
    Boolean(first.productId || second.productId)
  );
}

function pickSeedAndCandidate(first: ReviewOffer, second: ReviewOffer) {
  if (first.productId && !second.productId) {
    return [first, second] as const;
  }

  if (!first.productId && second.productId) {
    return [second, first] as const;
  }

  return first.productId! <= second.productId! ? ([first, second] as const) : ([second, first] as const);
}

function scoreSuggestion(seed: ReviewOffer, candidate: ReviewOffer) {
  const seedProfile = buildReviewProfile(seed);
  const candidateProfile = buildReviewProfile(candidate);
  const reasons: string[] = [];

  if (seedProfile.brand && candidateProfile.brand && seedProfile.brand !== candidateProfile.brand) {
    return { reasons: ["Marca distinta"], score: 0 };
  }

  if (seedProfile.kind && candidateProfile.kind && seedProfile.kind !== candidateProfile.kind) {
    return { reasons: ["Tipo distinto"], score: 0 };
  }

  if (seedProfile.rawModel && candidateProfile.rawModel && seedProfile.rawModel !== candidateProfile.rawModel) {
    return { reasons: ["Modelo RAW distinto"], score: 0 };
  }

  if (seedProfile.rawModel && seedProfile.rawModel !== "classic" && !candidateProfile.rawModel) {
    return { reasons: ["Candidato sin modelo RAW especifico"], score: 0 };
  }

  if (
    seedProfile.category === candidateProfile.category &&
    seedProfile.phraseModels.size > 0 &&
    candidateProfile.phraseModels.size > 0 &&
    !hasIntersection(seedProfile.phraseModels, candidateProfile.phraseModels)
  ) {
    return { reasons: ["Modelo conocido distinto"], score: 0 };
  }

  if (hasHardModelConflict(seedProfile, candidateProfile)) {
    return { reasons: ["Modelo incompatible"], score: 0 };
  }

  const coreOverlap = countIntersection(seedProfile.coreTokens, candidateProfile.coreTokens);
  const phraseModelOverlap = countIntersection(seedProfile.phraseModels, candidateProfile.phraseModels);
  const modelOverlap = countIntersection(seedProfile.modelTokens, candidateProfile.modelTokens);
  const descriptorOverlap = countIntersection(seedProfile.descriptors, candidateProfile.descriptors);
  const sizeMatches = hasIntersection(seedProfile.sizes, candidateProfile.sizes);
  const brandMatches = Boolean(seedProfile.brand && seedProfile.brand === candidateProfile.brand);
  const materialMatches = hasIntersection(seedProfile.materials, candidateProfile.materials);
  const titleSimilarity = getSetSimilarity(seedProfile.matchTokens, candidateProfile.matchTokens);
  const priceRatio = Math.min(seed.price, candidate.price) / Math.max(seed.price, candidate.price);
  let score = 0;

  if (brandMatches) {
    score += 0.3;
    reasons.push("misma marca");
  }

  if (materialMatches) {
    score += 0.14;
    reasons.push("mismo material");
  }

  if (sizeMatches) {
    score += 0.2;
    reasons.push("mismo tamano");
  }

  if (coreOverlap > 0) {
    score += Math.min(0.24, coreOverlap * 0.08);
    reasons.push(`${coreOverlap} tokens clave`);
  }

  if (phraseModelOverlap > 0) {
    score += Math.min(0.36, phraseModelOverlap * 0.18);
    reasons.push(`${phraseModelOverlap} modelo conocido`);
  }

  if (modelOverlap > 0) {
    score += Math.min(0.2, modelOverlap * 0.1);
    reasons.push(`${modelOverlap} tokens modelo`);
  }

  if (descriptorOverlap > 0) {
    score += Math.min(0.08, descriptorOverlap * 0.04);
    reasons.push(`${descriptorOverlap} descriptores`);
  }

  if (titleSimilarity >= 0.45) {
    score += 0.18;
    reasons.push("nombre similar");
  } else if (titleSimilarity >= 0.28) {
    score += 0.09;
    reasons.push("nombre parcialmente similar");
  }

  if (priceRatio >= 0.65) {
    score += 0.06;
    reasons.push("precio cercano");
  }

  if (seedProfile.rawModel && seedProfile.rawModel === candidateProfile.rawModel) {
    score += 0.22;
    reasons.push(`modelo ${seedProfile.rawModel}`);
  }

  return { reasons, score };
}

function buildReviewProfile(offer: ReviewOffer) {
  const text = normalizeText(`${offer.brandKey ?? ""} ${offer.brand ?? ""} ${offer.title} ${offer.url}`);
  const tokens = new Set(text.split(/[\s/-]+/).filter(Boolean));
  const brand = normalizeText(offer.brandKey ?? offer.brand ?? getKnownBrand(tokens));
  const sizes = extractSizeTokens(text, tokens);
  const materials = new Set([...tokens].filter((token) => MATERIAL_TOKENS.has(token)).map(getMaterialKey));
  const descriptors = new Set([...tokens].filter((token) => DESCRIPTOR_TOKENS.has(token)).map(getDescriptorKey));
  const modelTokens = new Set([...tokens].filter((token) => MODEL_TOKENS.has(token)));
  const phraseModels = getPhraseModels(text);
  const generic = new Set([
    "accesorio",
    "accesorios",
    "bandeja",
    "bandejas",
    "bong",
    "bongs",
    "cenicero",
    "ceniceros",
    "chile",
    "cl",
    "de",
    "del",
    "el",
    "en",
    "gb",
    "green",
    "growbarato",
    "la",
    "las",
    "liar",
    "los",
    "metalica",
    "metalico",
    "para",
    "piranha",
    "producto",
    "raw",
    "shop",
    "the",
    "tienda",
    "www",
    "y",
  ]);
  const coreTokens = new Set(
    [...tokens].filter(
      (token) =>
        token.length > 2 &&
        !generic.has(token) &&
        !sizes.has(token) &&
        !materials.has(getMaterialKey(token)) &&
        !descriptors.has(getDescriptorKey(token)) &&
        !modelTokens.has(token) &&
        token !== brand,
    ),
  );
  const matchTokens = new Set([...coreTokens, ...modelTokens, ...phraseModels, ...descriptors, ...sizes]);

  return {
    brand,
    category: offer.category,
    coreTokens,
    descriptors,
    kind: getKind(tokens),
    matchTokens,
    materials,
    modelTokens,
    phraseModels,
    rawModel: brand === "raw" ? getRawModel(tokens) : null,
    sizes,
  };
}

function getDecisionKey(seedOfferId: number, candidateOfferId: number) {
  return `${seedOfferId}:${candidateOfferId}`;
}

function getKnownBrand(tokens: Set<string>) {
  for (const brand of ["raw", "ocb", "bonglab", "galaxy", "gizeh", "zippo", "calvo", "clipper", "pax", "ozeta", "futurola"]) {
    if (tokens.has(brand)) {
      return brand;
    }
  }

  return "";
}

function getKind(tokens: Set<string>) {
  if (hasIntersection(tokens, new Set(["tapa", "magnetica", "magnetico"]))) {
    return "tapa";
  }

  if (hasIntersection(tokens, new Set(["cenicero", "ceniceros", "ashtray"]))) {
    return "cenicero";
  }

  if (hasIntersection(tokens, new Set(["bandeja", "bandejas", "tray", "rolling"]))) {
    return "bandeja";
  }

  return null;
}

function getRawModel(tokens: Set<string>) {
  if (tokens.has("brazilian")) return "brazilian-girl";
  if (tokens.has("prepare") && tokens.has("flight")) return "prepare-flight";
  if (tokens.has("emerald")) return "emerald";
  if (tokens.has("girl")) return "girl";
  if (tokens.has("classic") || tokens.has("clasica") || tokens.has("clasico")) return "classic";
  return null;
}

function getPhraseModels(text: string) {
  const models = new Set<string>();

  for (const phrase of KNOWN_MODEL_PHRASES) {
    const normalizedPhrase = normalizeText(phrase);
    const phrasePattern = normalizedPhrase.replace(/[\s-]+/g, "[\\s-]+");

    if (new RegExp(`\\b${phrasePattern}\\b`).test(text)) {
      models.add(slugifyModel(phrase));
    }
  }

  return models;
}

function slugifyModel(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function extractSizeTokens(text: string, tokens: Set<string>) {
  const sizes = new Set([...tokens].filter((token) => /^\d+(?:\.\d+)?(?:cm|mm|ml|g|gr|oz)$/.test(token)));

  if (/\b(?:1-1\/4|1\s*1\/4|1-14|114)\b/.test(text)) {
    sizes.add("1-1/4");
  }

  if (/\bking\s*size\b|\bking-size\b/.test(text)) {
    sizes.add("king-size");
  }

  for (const token of tokens) {
    if (["mini", "mediana", "mediano", "grande", "small", "medium", "large"].includes(token)) {
      sizes.add(getDescriptorKey(token));
    }
  }

  return sizes;
}

function getMaterialKey(token: string) {
  return MATERIAL_KEYS.get(token) ?? token;
}

function getDescriptorKey(token: string) {
  return DESCRIPTOR_KEYS.get(token) ?? token;
}

function hasHardModelConflict(
  seedProfile: ReturnType<typeof buildReviewProfile>,
  candidateProfile: ReturnType<typeof buildReviewProfile>,
) {
  if (!STRONG_MODEL_CATEGORIES.has(seedProfile.category) || !STRONG_MODEL_CATEGORIES.has(candidateProfile.category)) {
    return false;
  }

  if (seedProfile.modelTokens.size === 0 || candidateProfile.modelTokens.size === 0) {
    return false;
  }

  const seedExclusive = getExclusiveModelKeys(seedProfile.modelTokens);
  const candidateExclusive = getExclusiveModelKeys(candidateProfile.modelTokens);

  return seedExclusive.size > 0 && candidateExclusive.size > 0 && !hasIntersection(seedExclusive, candidateExclusive);
}

function getExclusiveModelKeys(tokens: Set<string>) {
  const keys = new Set<string>();
  const groups = [
    ["45", "90"],
    ["brazilian", "girl", "classic", "emerald", "prepare"],
    ["bucket", "slurper", "honeycomb", "flat", "regular"],
    ["crafty", "mighty", "venty"],
  ];

  for (const group of groups) {
    for (const token of group) {
      if (tokens.has(token)) {
        keys.add(`${group[0]}:${token}`);
      }
    }
  }

  return keys;
}

function getSetSimilarity(first: Set<string>, second: Set<string>) {
  if (first.size === 0 || second.size === 0) {
    return 0;
  }

  const overlap = countIntersection(first, second);

  return overlap / (first.size + second.size - overlap);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&amp;/g, "&")
    .toLowerCase()
    .replace(/\b(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*(cm|mm)\b/g, " $1$3 $2$3 ")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(cm|mm|ml|g)\b/g, " $1$2 ")
    .replace(/\bking\s*size\b/g, " king-size ")
    .replace(/\b1\s*1\/4\b|\b1\s*-\s*14\b/g, " 1-1/4 ")
    .replace(/[^a-z0-9\s/.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasIntersection(first: Set<string>, second: Set<string>) {
  for (const value of first) {
    if (second.has(value)) {
      return true;
    }
  }

  return false;
}

function countIntersection(first: Set<string>, second: Set<string>) {
  let count = 0;

  for (const value of first) {
    if (second.has(value)) {
      count += 1;
    }
  }

  return count;
}

function SuggestionCard({ suggestion }: { suggestion: MatchSuggestion }) {
  return (
    <article className="grid gap-4 rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm lg:grid-cols-[1fr_1fr_220px]">
      <OfferBlock label="Producto base" offer={suggestion.seed} />
      <OfferBlock label="Candidato" offer={suggestion.candidate} />
      <div className="flex flex-col justify-between gap-4 rounded-[1.5rem] bg-[#f4f1e8] p-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-black/45">Score</p>
          <p className="mt-1 text-4xl font-black tracking-[-0.06em]">{Math.round(suggestion.score * 100)}%</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestion.reasons.map((reason) => (
              <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-bold text-black/60" key={reason}>
                {reason}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          <form action={approveMatch}>
            <input name="seedOfferId" type="hidden" value={suggestion.seed.id} />
            <input name="candidateOfferId" type="hidden" value={suggestion.candidate.id} />
            <button className="w-full rounded-2xl bg-[#bddf57] px-4 py-3 text-sm font-black">Aprobar</button>
          </form>
          <form action={rejectMatch}>
            <input name="seedOfferId" type="hidden" value={suggestion.seed.id} />
            <input name="candidateOfferId" type="hidden" value={suggestion.candidate.id} />
            <button className="w-full rounded-2xl bg-[#17150f] px-4 py-3 text-sm font-black text-[#f8f4df]">Rechazar</button>
          </form>
        </div>
      </div>
    </article>
  );
}

function OfferBlock({ label, offer }: { label: string; offer: ReviewOffer }) {
  return (
    <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
      <div className="min-h-32 overflow-hidden rounded-[1.5rem] bg-[#eee6d0]">
        {offer.imageUrl ? <img alt={offer.title} className="h-full w-full object-contain p-3" src={offer.imageUrl} /> : null}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-black/40">{label}</p>
        <h2 className="mt-2 text-lg font-black leading-tight">{offer.title}</h2>
        <p className="mt-2 text-sm text-black/55">{offer.store.name} · {offer.brand ?? "Sin marca"} · {formatPrice(offer.price)}</p>
        <p className="mt-1 text-xs font-bold text-black/40">brandKey: {offer.brandKey ?? "sin marca detectada"}</p>
        <p className="mt-2 text-xs text-black/40">Producto #{offer.productId ?? "sin producto"}</p>
        <a className="mt-3 inline-flex text-xs font-black uppercase tracking-[0.16em] text-[#7f5af0]" href={offer.url} rel="noreferrer" target="_blank">
          Ver tienda
        </a>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f8f4df]/10 px-4 py-3">
      <span className="block text-2xl font-black">{value}</span>
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#f8f4df]/55">{label}</span>
    </div>
  );
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", { currency: "CLP", maximumFractionDigits: 0, style: "currency" }).format(value);
}
