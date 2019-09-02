import {
  OpenAPIObject,
  Operation,
  PathItem,
  Responses,
  isOperation
} from "loas3/dist/generated/full";

import { some, none } from "fp-ts/lib/Option";
import { array } from "fp-ts/lib/Array";
import { Lens, Iso, fromTraversable, Prism } from "monocle-ts";
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
  [path, meths]: [RegExp, Meth[]],
  responsesMap: (z: Responses) => Responses
) =>
  Lens.fromProp<OpenAPIObject>()("paths")
    .composeIso(objectToArray())
    .composeTraversal(
      fromTraversable(array)<[string, PathItem]>().filter(i => path.test(i[0]))
    )
    .composeLens(valueLens())
    .composeIso(objectToArray<any>())
    .composeTraversal(
      fromTraversable(array)<[string, any]>().filter(
        i => meths.map(z => `${z}`).indexOf(i[0]) !== -1
      )
    )
    .composeLens(valueLens())
    .composePrism(
      new Prism<any, Operation>(s => (isOperation(s) ? some(s) : none), a => a)
    )
    .composeLens(Lens.fromProp<Operation>()("responses"))
    .modify(responsesMap)(o);

const argumentCoaxer = (
  info: [string | RegExp, Meth | Meth[]] | string | RegExp
): [RegExp, Meth[]] =>
  typeof info === "string" || info instanceof RegExp
    ? [info instanceof RegExp ? info : new RegExp(`^${info}$`), metha]
    : [
        info[0] instanceof RegExp ? info[0] : new RegExp(`^${info[0]}$`),
        info[1] instanceof Array ? info[1] : [info[1]]
      ];

const includeCodesInternal = (
  o: OpenAPIObject,
  info: [RegExp, Meth[]],
  r: (keyof Responses)[]
) =>
  codesInternal(o, info, z =>
    r.map(i => ({ [i]: z[i] })).reduce((a, b) => ({ ...a, ...b }), {})
  );

export const includeCodes = (
  info: [string | RegExp, Meth] | string | RegExp,
  r: (keyof Responses)[]
) => (o: OpenAPIObject): OpenAPIObject =>
  includeCodesInternal(o, argumentCoaxer(info), r);

const removeCode = (r: Responses, c: keyof Responses) => {
  const out = { ...r };
  delete out[c];
  return out;
};

const removeCodesInternal = (
  o: OpenAPIObject,
  info: [RegExp, Meth[]],
  r: (keyof Responses)[]
) => codesInternal(o, info, z => r.reduce(removeCode, z));

export const removeCodes = (
  info: [string | RegExp, Meth] | string | RegExp,
  r: (keyof Responses)[]
) => (o: OpenAPIObject): OpenAPIObject =>
  removeCodesInternal(o, argumentCoaxer(info), r);
