import {
  OpenAPIObject,
  Operation,
  PathItem,
  Responses
} from "loas3/dist/generated/full";

import { array } from "fp-ts/lib/Array";
import { Lens, Iso, fromTraversable, Optional } from "monocle-ts";
const objectToArray = <T>() =>
  new Iso<Record<string, T>, [string, T][]>(
    s => Object.entries(s),
    a => a.reduce((q, r) => ({ ...q, [r[0]]: r[1] }), {})
  );

const valueLens = <T>() =>
  new Lens<[string, T], T>(s => s[1], a => s => [s[0], a]);

type Meth = "get" | "post" | "put" | "delete";
const metha: Meth[] = ["get", "post", "put", "delete"];

const codesInternal = (
  o: OpenAPIObject,
  info: [string, Meth],
  responsesMap: (z: Responses) => Responses
) =>
  Lens.fromProp<OpenAPIObject>()("paths")
    .composeIso(objectToArray())
    .composeTraversal(
      fromTraversable(array)<[string, PathItem]>().filter(i => i[0] === info[0])
    )
    .composeLens(valueLens())
    .composeOptional(Optional.fromNullableProp<PathItem>()(info[1]))
    .composeLens(Lens.fromProp<Operation>()("responses"))
    .modify(responsesMap)(o);

const includeCodesInternal = (
  o: OpenAPIObject,
  info: [string, Meth],
  r: (keyof Responses)[]
) =>
  codesInternal(o, info, z =>
    r.map(i => ({ [i]: z[i] })).reduce((a, b) => ({ ...a, ...b }), {})
  );

export const includeCodes = (
  info: [string, Meth] | string,
  r: (keyof Responses)[]
) => (o: OpenAPIObject): OpenAPIObject =>
  typeof info === "string"
    ? metha.reduce((a, b) => includeCodesInternal(a, [info, b], r), o)
    : includeCodesInternal(o, info, r);

const removeCode = (r: Responses, c: keyof Responses) => {
  const out = { ...r };
  delete out[c];
  return out;
};

const removeCodesInternal = (
  o: OpenAPIObject,
  info: [string, Meth],
  r: (keyof Responses)[]
) => codesInternal(o, info, z => r.reduce(removeCode, z));

export const removeCodes = (
  info: [string, Meth] | string,
  r: (keyof Responses)[]
) => (o: OpenAPIObject): OpenAPIObject =>
  typeof info === "string"
    ? metha.reduce((a, b) => removeCodesInternal(a, [info, b], r), o)
    : removeCodesInternal(o, info, r);
