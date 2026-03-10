type Bounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

type Viewport = {
  zoom: number;
  bottomLeft: string;
  topRight: string;
};

type ArtilleryContext = {
  vars: Record<string, unknown>;
};

type Done = (err?: Error) => void;

const DATASET_BOUNDS: Bounds = {
  minLat: 47.55,
  maxLat: 49.8,
  minLng: 7.4,
  maxLng: 10.6,
};

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

function formatCoord(lat: number, lng: number): string {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

function buildViewport(bounds: Bounds, opts: { zoom?: number } = {}): Viewport {
  const zoom = opts.zoom ?? randomInt(8, 18);

  const spanByZoom: Record<number, number> = {
    8: 0.6,
    9: 0.4,
    10: 0.25,
    11: 0.15,
    12: 0.08,
    13: 0.04,
    14: 0.02,
    15: 0.01,
    16: 0.006,
    17: 0.003,
    18: 0.0015,
  };

  const span = spanByZoom[zoom];

  const latStart = randomBetween(bounds.minLat, bounds.maxLat - span);
  const lngStart = randomBetween(bounds.minLng, bounds.maxLng - span);

  return {
    zoom,
    bottomLeft: formatCoord(latStart, lngStart),
    topRight: formatCoord(latStart + span, lngStart + span),
  };
}

export function buildViewportQuery(
  context: ArtilleryContext,
  _events: unknown,
  done: Done,
): void {
  const viewport = buildViewport(DATASET_BOUNDS);

  context.vars.bottomLeft = viewport.bottomLeft;
  context.vars.topRight = viewport.topRight;
  context.vars.zoom = viewport.zoom;

  done();
}

export function buildPaginationQuery(
  context: ArtilleryContext,
  _events: unknown,
  done: Done,
): void {
  const page = randomInt(1, 100);
  const perPage = randomInt(10, 50);

  context.vars.page = page;
  context.vars.perPage = perPage;

  done();
}
