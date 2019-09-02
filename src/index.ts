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
  info: [RegExp, Meth],
  responsesMap: (z: Responses) => Responses
) =>
  Lens.fromProp<OpenAPIObject>()("paths")
    .composeIso(objectToArray())
    .composeTraversal(
      fromTraversable(array)<[string, PathItem]>().filter(i => info[0].test(i[0]))
    )
    .composeLens(valueLens())
    .composeOptional(Optional.fromNullableProp<PathItem>()(info[1]))
    .composeLens(Lens.fromProp<Operation>()("responses"))
    .modify(responsesMap)(o);

const argumentCoaxer = (
  o: OpenAPIObject,
  info: [string | RegExp, Meth] | string | RegExp,
  r: (keyof Responses)[],
  next: (
    o: OpenAPIObject,
    info: [RegExp, Meth],
    r: (keyof Responses)[]
  ) => OpenAPIObject
): OpenAPIObject =>
  typeof info === "string" || info instanceof RegExp
    ? metha.reduce(
        (a, b) =>
          next(
            a,
            [info instanceof RegExp ? info : new RegExp(`^${info}$`), b],
            r
          ),
        o
      )
    : next(
        o,
        [
          info[0] instanceof RegExp ? info[0] : new RegExp(`^${info[0]}$`),
          info[1]
        ],
        r
      );

const includeCodesInternal = (
  o: OpenAPIObject,
  info: [RegExp, Meth],
  r: (keyof Responses)[]
) =>
  codesInternal(o, info, z =>
    r.map(i => ({ [i]: z[i] })).reduce((a, b) => ({ ...a, ...b }), {})
  );

export const includeCodes = (
  info: [string | RegExp, Meth] | string | RegExp,
  r: (keyof Responses)[]
) => (o: OpenAPIObject): OpenAPIObject =>
  argumentCoaxer(o, info, r, includeCodesInternal);

const removeCode = (r: Responses, c: keyof Responses) => {
  const out = { ...r };
  delete out[c];
  return out;
};

const removeCodesInternal = (
  o: OpenAPIObject,
  info: [RegExp, Meth],
  r: (keyof Responses)[]
) => codesInternal(o, info, z => r.reduce(removeCode, z));

export const removeCodes = (
  info: [string | RegExp, Meth] | string | RegExp,
  r: (keyof Responses)[]
) => (o: OpenAPIObject): OpenAPIObject =>
  argumentCoaxer(o, info, r, removeCodesInternal);
