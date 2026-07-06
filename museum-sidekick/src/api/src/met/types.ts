// Types describing the subset of the Met Collection API we use.
// Full field reference: https://metmuseum.github.io/

/** A single artwork object from `/objects/{id}`. */
export interface MetObject {
  objectID: number;
  isHighlight: boolean;
  isPublicDomain: boolean;
  primaryImage: string;
  primaryImageSmall: string;
  title: string;
  artistDisplayName: string;
  artistDisplayBio: string;
  objectDate: string;
  medium: string;
  dimensions: string;
  department: string;
  culture: string;
  period: string;
  classification: string;
  objectURL: string;
  tags: { term: string }[] | null;
}

/** A curatorial department from `/departments`. */
export interface Department {
  departmentId: number;
  displayName: string;
}

/** Parameters accepted by `search_collection`. */
export interface SearchParams {
  q: string;
  departmentId?: number;
  medium?: string;
  geoLocation?: string;
  dateBegin?: number;
  dateEnd?: number;
  isHighlight?: boolean;
  isOnView?: boolean;
  tags?: boolean;
}

/** Trimmed artwork shape returned to the agent and frontend. */
export interface ArtworkCard {
  objectID: number;
  title: string;
  artist: string;
  date: string;
  medium: string;
  department: string;
  culture: string;
  image: string;
  thumbnail: string;
  url: string;
}
