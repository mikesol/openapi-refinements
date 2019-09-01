import {
  OpenAPIObject,
  Operation,
  PathItem,
  Responses
} from "loas3/dist/generated/full";

type Meth = "get" | "post" | "put" | "delete";
const metha: Meth[] = ["get", "post", "put", "delete"];

// include codes
const __includeCodes = (
  n: Meth,
  o: Operation | undefined,
  r: (keyof Responses)[]
): Record<Meth, Operation> | {} =>
  o
    ? {
        [n]: {
          ...o,
          responses: r
            .map(i => ({ [i]: o.responses[i] }))
            .reduce((a, b) => ({ ...a, ...b }), {})
        }
      }
    : {};

const _includeCodes = (
  p: PathItem,
  method: Meth,
  r: (keyof Responses)[]
): PathItem => ({
  ...p,
  ...__includeCodes(method, p[method], r)
});
const includeCodesInternal = (
  o: OpenAPIObject,
  info: [string, Meth],
  r: (keyof Responses)[]
): OpenAPIObject => ({
  ...o,
  ...(o.paths
    ? {
        paths: {
          ...o.paths,
          ...(o.paths[info[0]]
            ? { [info[0]]: _includeCodes(o.paths[info[0]], info[1], r) }
            : {})
        }
      }
    : {})
});

export const includeCodes = (
  info: [string, Meth] | string,
  r: (keyof Responses)[]
) => (o: OpenAPIObject): OpenAPIObject =>
  typeof info === "string"
    ? metha.reduce((a, b) => includeCodesInternal(a, [info, b], r), o)
    : includeCodesInternal(o, info, r);
// removeCodes

const removeCode = (r: Responses, c: keyof Responses) => {
  const out = { ...r };
  delete out[c];
  return out;
};

const __removeCodes = (
  n: Meth,
  o: Operation | undefined,
  r: (keyof Responses)[]
): Record<Meth, Operation> | {} =>
  o
    ? {
        [n]: {
          ...o,
          responses: r.reduce(removeCode, o.responses)
        }
      }
    : {};

const _removeCodes = (
  p: PathItem,
  method: Meth,
  r: (keyof Responses)[]
): PathItem => ({
  ...p,
  ...__removeCodes(method, p[method], r)
});

const removeCodesInternal = (
  o: OpenAPIObject,
  info: [string, Meth],
  r: (keyof Responses)[]
): OpenAPIObject => ({
  ...o,
  ...(o.paths
    ? {
        paths: {
          ...o.paths,
          ...(o.paths[info[0]]
            ? { [info[0]]: _removeCodes(o.paths[info[0]], info[1], r) }
            : {})
        }
      }
    : {})
});

export const removeCodes = (
  info: [string, Meth] | string,
  r: (keyof Responses)[]
) => (o: OpenAPIObject): OpenAPIObject =>
  typeof info === "string"
    ? metha.reduce((a, b) => removeCodesInternal(a, [info, b], r), o)
    : removeCodesInternal(o, info, r);
