import { PrimitiveAtom, atom } from "jotai";
import { v4 as uuidv4 } from "uuid";

import { Station, TripServiceInfo } from "@/api/protocol/motis";
import { LoadLevel, MeasureWrapper } from "@/api/protocol/motis/paxforecast";
import { RiBasisFahrt, RiBasisFahrtData } from "@/api/protocol/motis/ribasis";

import { formatRiBasisDateTime } from "@/util/dateFormat";

export interface MeasureRecipientsData {
  trips: TripServiceInfo[];
  stations: Station[];
}

export type SharedMeasureData = {
  recipients: MeasureRecipientsData;
  time: Date;
};

export interface TripLoadInfoMeasureData {
  trip: TripServiceInfo | undefined;
  level: LoadLevel;
}

export interface TripRecommendationMeasureData {
  planned_destination: Station | undefined;
  recommended_trip: TripServiceInfo | undefined;
}

export interface RtUpdateMeasureData {
  trip: TripServiceInfo | undefined;
  ribasis: RiBasisFahrtData | undefined;
}

export type EmptyMeasureU = { type: "Empty"; shared: SharedMeasureData };

export type TripLoadInfoMeasureU = {
  type: "TripLoadInfoMeasure";
  shared: SharedMeasureData;
  data: TripLoadInfoMeasureData;
};

export type TripRecommendationMeasureU = {
  type: "TripRecommendationMeasure";
  shared: SharedMeasureData;
  data: TripRecommendationMeasureData;
};

export type RtUpdateMeasureU = {
  type: "RtUpdateMeasure";
  shared: SharedMeasureData;
  data: RtUpdateMeasureData;
};

export type MeasureUnion =
  | EmptyMeasureU
  | TripLoadInfoMeasureU
  | TripRecommendationMeasureU
  | RtUpdateMeasureU;

export function isEmptyMeasureU(mu: MeasureUnion): mu is EmptyMeasureU {
  return mu.type === "Empty";
}

export function isTripLoadInfoMeasureU(
  mu: MeasureUnion
): mu is TripLoadInfoMeasureU {
  return mu.type === "TripLoadInfoMeasure";
}

export function isTripRecommendationMeasureU(
  mu: MeasureUnion
): mu is TripRecommendationMeasureU {
  return mu.type === "TripRecommendationMeasure";
}

export function isRtUpdateMeasureU(mu: MeasureUnion): mu is RtUpdateMeasureU {
  return mu.type === "RtUpdateMeasure";
}

export function toMeasureWrapper(mu: MeasureUnion): MeasureWrapper | null {
  const shared = {
    recipients: {
      trips: mu.shared.recipients.trips.map((t) => t.trip),
      stations: mu.shared.recipients.stations.map((s) => s.id),
    },
    time: Math.round(mu.shared.time.getTime() / 1000),
  };

  switch (mu.type) {
    case "Empty":
      return null;
    case "TripLoadInfoMeasure": {
      const d = mu.data;
      if (!d.trip) {
        return null;
      }
      return {
        measure_type: "TripLoadInfoMeasure",
        measure: { ...shared, trip: d.trip.trip, level: d.level },
      };
    }
    case "TripRecommendationMeasure": {
      const d = mu.data;
      if (!d.planned_destination || !d.recommended_trip) {
        return null;
      }
      return {
        measure_type: "TripRecommendationMeasure",
        measure: {
          ...shared,
          planned_trips: [],
          planned_destinations: [d.planned_destination.id],
          planned_long_distance_destinations: [],
          recommended_trip: d.recommended_trip.trip,
        },
      };
    }
    case "RtUpdateMeasure": {
      const d = mu.data;
      if (!d.ribasis) {
        return null;
      }
      const ribf: RiBasisFahrt = {
        meta: {
          id: uuidv4(),
          owner: "",
          format: "RIPL",
          version: "v3",
          correlation: [],
          created: formatRiBasisDateTime(mu.shared.time),
          sequence: mu.shared.time.getTime(),
        },
        data: d.ribasis,
      };
      return {
        measure_type: "RtUpdateMeasure",
        measure: {
          ...shared,
          type: "RIBasis",
          content: JSON.stringify(ribf, null, 2),
        },
      };
    }
  }
}

export function newEmptyMeasure(time: Date): MeasureUnion {
  return {
    type: "Empty",
    shared: { recipients: { trips: [], stations: [] }, time },
  };
}

export const measuresAtom = atom<PrimitiveAtom<MeasureUnion>[]>([]);
export const currentEditorMeasureAtom =
  atom<PrimitiveAtom<MeasureUnion> | null>(null);
